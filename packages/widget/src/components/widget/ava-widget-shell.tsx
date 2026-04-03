"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type ConversationThread, type TimelineMessage } from "@ava/chat-domain";
import { getLocalAppUrl } from "@ava/config/runtime/app-urls";
import {
  createWidgetApiClient,
  type ImpersonationCustomer,
  type WidgetApiClient
} from "../../api/widget-api";
import { useWidgetAuthSession } from "../../auth/use-widget-auth-session";
import type { HostSessionSnapshot } from "../../types";
import {
  appendMessage,
  createLoggedOutConversation,
  createOptimisticCustomerGreetingConversation,
  createStarterConversation,
  createSystemStatusMessage,
  createTestModeConversation,
  normalizeMessageDraft
} from "../../widget-state";
import { LauncherButton } from "./launcher-button";
import { WidgetComposer } from "./widget-composer";
import { WidgetTestMode } from "./widget-test-mode";
import { WidgetTimeline } from "./widget-timeline";

interface ActiveImpersonation {
  projectRef: string;
  label: string;
}

interface HostWidgetCommandMessage {
  source?: string;
  type?: string;
  open?: boolean;
}

interface AvaWidgetShellProps {
  embedMode?: boolean;
  defaultOpen?: boolean;
  showEmbedNote?: boolean;
  apiBaseUrl?: string;
  sessionSnapshot?: HostSessionSnapshot | null;
  apiClient?: WidgetApiClient;
}

function generateClientMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function resolveGreetingName(user: { name?: string | null; email?: string | null } | null) {
  const name = typeof user?.name === "string" ? user.name.trim() : "";
  const normalizedName = name.toLowerCase();
  if (name && normalizedName !== "account" && normalizedName !== "customer" && normalizedName !== "user") {
    return name;
  }

  const email = typeof user?.email === "string" ? user.email.trim() : "";
  if (!email) {
    return "";
  }

  const localPart = email.split("@")[0]?.trim();
  return localPart || "";
}

function toPersonalizedGreetingText(name: string) {
  return `Hi, ${name}! How can I help you today?`;
}

function isGenericInitialAvaGreeting(text: string) {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, " ");

  if (!normalized.startsWith("hi!")) {
    return false;
  }

  return (
    normalized.includes("how can i help you today") ||
    (normalized.includes("i'm ava from aveyo") &&
      normalized.includes("solar installation questions"))
  );
}

function personalizeInitialGreeting(
  thread: ConversationThread,
  greetingName: string
): ConversationThread {
  const name = greetingName.trim();
  if (!name || thread.messages.length === 0) {
    return thread;
  }

  const targetIndex = thread.messages.findIndex(
    (message) => message.kind === "ava" && isGenericInitialAvaGreeting(message.text)
  );
  if (targetIndex === -1) {
    return thread;
  }

  const targetMessage = thread.messages[targetIndex];
  if (!targetMessage) {
    return thread;
  }

  return {
    ...thread,
    messages: thread.messages.map((message, index) =>
      index === targetIndex
        ? {
            ...message,
            text: toPersonalizedGreetingText(name)
          }
        : message
    )
  };
}

const guestProjectSpecificKeywords = [
  "project status",
  "status update",
  "my project",
  "my installation",
  "my permit",
  "my timeline",
  "my account",
  "my quote",
  "my proposal",
  "my payment",
  "my invoice",
  "my bill",
  "project ref",
  "project reference",
  "fin number",
  "site address"
];

const guestCompanyInfoKeywords = [
  "aveyo",
  "company",
  "service",
  "services",
  "product",
  "products",
  "installation",
  "consultation",
  "permitting",
  "financing",
  "warranty",
  "monitoring"
];

const guestSolarInfoKeywords = [
  "solar",
  "panels",
  "panel",
  "battery",
  "net metering",
  "inverter",
  "sunlight",
  "efficiency",
  "kwh",
  "payback",
  "electric bill",
  "utility"
];

function hasAnyKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function isGuestProjectSpecificQuestion(normalizedText: string) {
  const personalProjectPattern =
    /\b(my|our|me|i|mine)\b.*\b(project|installation|permit|inspection|timeline|status|quote|proposal|design|application|account|payment|invoice|bill|site|address|fin)\b/;
  return (
    hasAnyKeyword(normalizedText, guestProjectSpecificKeywords) ||
    personalProjectPattern.test(normalizedText)
  );
}

function buildGuestAvaReply(prompt: string) {
  const normalizedPrompt = prompt.trim().toLowerCase();

  if (isGuestProjectSpecificQuestion(normalizedPrompt)) {
    return "I can help with general solar and Aveyo information while you're signed out. Please sign in so I can answer project-specific questions like status, timeline, permits, pricing, and account details.";
  }

  if (hasAnyKeyword(normalizedPrompt, guestCompanyInfoKeywords)) {
    return "Aveyo provides end-to-end residential solar services including consultation, system design, permitting support, installation coordination, and post-install guidance. I can share general information here, and if you sign in I can provide details specific to your project.";
  }

  if (hasAnyKeyword(normalizedPrompt, guestSolarInfoKeywords)) {
    return "In general, solar performance depends on roof orientation, shading, system size, and local utility rates. Typical topics include panel output, battery backup options, incentives, and payback timelines. Sign in if you'd like project-specific recommendations.";
  }

  return "I can answer general questions about Aveyo services, solar products, and how solar works. For project-specific details, please sign in and I can help with your exact project information.";
}

function createLocalTimelineMessage(
  conversationId: string,
  kind: "customer" | "ava",
  text: string
): TimelineMessage {
  return {
    id: `${kind}-${generateClientMessageId()}`,
    conversationId,
    kind,
    text,
    createdAt: new Date().toISOString(),
    deliveryState: "sent"
  };
}

function shouldPromptRepRequest(text: string) {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) {
    return false;
  }

  const mentionsRepActionPhrase =
    normalized.includes("talk to a rep") ||
    (normalized.includes("connect") &&
      (normalized.includes("representative") ||
        normalized.includes("support agent") ||
        normalized.includes("customer care")));
  if (!mentionsRepActionPhrase) {
    return false;
  }

  return (
    normalized.includes("would you like") ||
    normalized.includes("do you want") ||
    normalized.includes("want me to") ||
    normalized.includes("should i") ||
    normalized.includes("if you'd like") ||
    normalized.includes("if you would like") ||
    normalized.includes("let me know if")
  );
}

function isRepConfirmationYes(text: string) {
  const normalized = text.trim().toLowerCase().replace(/[.!?]/g, "").replace(/\s+/g, " ");
  if (!normalized) {
    return false;
  }

  const yesPhrases = [
    "yes",
    "yes please",
    "y",
    "yeah",
    "yep",
    "sure",
    "ok",
    "okay",
    "please do",
    "do it",
    "connect me",
    "connect me to a rep",
    "talk to a rep",
    "agent please",
    "that would be great"
  ];
  return yesPhrases.some((phrase) => normalized === phrase || normalized.startsWith(`${phrase} `));
}

const TIMELINE_RESET_INACTIVITY_MS = 30 * 60 * 1000;
const TIMELINE_RESET_STORAGE_PREFIX = "ava-widget-timeline-reset-v1:";

function toTimestampMs(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}

function getLastThreadActivityMs(thread: ConversationThread) {
  const latestMessage = thread.messages[thread.messages.length - 1];
  const latestMessageMs = toTimestampMs(latestMessage?.createdAt);
  if (latestMessageMs !== null) {
    return latestMessageMs;
  }
  return toTimestampMs(thread.updatedAt);
}

function readTimelineResetMs(conversationId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.localStorage.getItem(`${TIMELINE_RESET_STORAGE_PREFIX}${conversationId}`);
    if (!value) {
      return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeTimelineResetMs(conversationId: string, resetMs: number | null) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const key = `${TIMELINE_RESET_STORAGE_PREFIX}${conversationId}`;
    if (resetMs === null) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, String(resetMs));
  } catch {
    // Ignore storage write failures in private mode or restricted contexts.
  }
}

function shouldSkipAutoTimelineReset(thread: ConversationThread) {
  return (
    thread.handoff.state === "pending" ||
    thread.handoff.state === "claimed" ||
    thread.handoff.state === "active"
  );
}

function createTimelineResetGreeting(
  conversationId: string,
  greetingName: string,
  resetMs: number
): TimelineMessage {
  return {
    id: `timeline-reset-greeting-${conversationId}-${resetMs}`,
    conversationId,
    kind: "ava",
    text: greetingName ? toPersonalizedGreetingText(greetingName) : "Hi! How can I help you today?",
    createdAt: new Date(resetMs).toISOString(),
    deliveryState: "sent"
  };
}

export function AvaWidgetShell({
  embedMode = false,
  defaultOpen = true,
  showEmbedNote,
  apiBaseUrl,
  sessionSnapshot,
  apiClient
}: AvaWidgetShellProps) {
  const authSession = useWidgetAuthSession({ apiBaseUrl, sessionSnapshot });
  const api = useMemo(
    () => apiClient ?? createWidgetApiClient({ apiBaseUrl }),
    [apiBaseUrl, apiClient]
  );
  const greetingName = resolveGreetingName(authSession.user);
  const shouldShowEmbedNote = showEmbedNote ?? !embedMode;
  const starterConversation = useMemo(() => createStarterConversation(), []);
  const loggedOutConversation = useMemo(() => createLoggedOutConversation(), []);
  const testModeConversation = useMemo(
    () => createTestModeConversation(greetingName),
    [greetingName]
  );
  const [thread, setThread] = useState<ConversationThread>(starterConversation);
  const [conversationReady, setConversationReady] = useState(false);
  const [isTestModeEnabled, setIsTestModeEnabled] = useState(false);
  const [testModeSearchQuery, setTestModeSearchQuery] = useState("");
  const [impersonationCustomers, setImpersonationCustomers] = useState<ImpersonationCustomer[]>([]);
  const [selectedImpersonationProjectRef, setSelectedImpersonationProjectRef] = useState("");
  const [activeImpersonation, setActiveImpersonation] = useState<ActiveImpersonation | null>(null);
  const [testModeBusy, setTestModeBusy] = useState(false);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isPanelMounted, setIsPanelMounted] = useState(defaultOpen);
  const [isPanelVisible, setIsPanelVisible] = useState(defaultOpen);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [draft, setDraft] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ratingSubmissionRequestId, setRatingSubmissionRequestId] = useState<string | null>(null);
  const [timelineResetAtMs, setTimelineResetAtMs] = useState<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const realtimeCursorRef = useRef<string | undefined>(undefined);
  const realtimeBusyRef = useRef(false);
  const modeStatusNoticeRef = useRef<string | null>(null);
  const pendingRepOfferMessageIdRef = useRef<string | null>(null);

  const canUseTestMode = authSession.authenticated && authSession.userType === "employee";
  const hasActiveImpersonation = activeImpersonation !== null;
  const personalizedThread = useMemo(() => {
    if (!authSession.authenticated) {
      return thread;
    }
    return personalizeInitialGreeting(thread, greetingName);
  }, [authSession.authenticated, greetingName, thread]);
  const activeThread = authSession.authenticated ? personalizedThread : thread;
  const visibleThread = useMemo(() => {
    if (!authSession.authenticated || !conversationReady || !timelineResetAtMs) {
      return activeThread;
    }

    const filteredMessages = activeThread.messages.filter((message) => {
      const createdAtMs = toTimestampMs(message.createdAt);
      if (createdAtMs === null) {
        return true;
      }
      return createdAtMs >= timelineResetAtMs;
    });

    if (filteredMessages.length > 0) {
      return {
        ...activeThread,
        messages: filteredMessages
      };
    }

    const resetGreeting = createTimelineResetGreeting(activeThread.id, greetingName, timelineResetAtMs);
    return {
      ...activeThread,
      messages: [resetGreeting]
    };
  }, [
    activeThread,
    authSession.authenticated,
    conversationReady,
    greetingName,
    timelineResetAtMs
  ]);

  const toImpersonationLabel = (customer: ImpersonationCustomer) =>
    customer.email || customer.customerName || customer.customerId || customer.projectRef;

  const loadImpersonationCustomers = async (query?: string) => {
    if (!canUseTestMode || testModeBusy) {
      return;
    }

    setTestModeBusy(true);
    try {
      const result = await api.listImpersonationCustomers(query, 25);
      setImpersonationCustomers(result.customers);
      setSelectedImpersonationProjectRef((current) => {
        if (current && result.customers.some((customer) => customer.projectRef === current)) {
          return current;
        }
        return "";
      });
      setRequestError(null);
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Unable to load impersonation customers."
      );
    } finally {
      setTestModeBusy(false);
    }
  };

  const beginImpersonation = async (projectRef: string) => {
    if (!canUseTestMode || !isTestModeEnabled || !projectRef || testModeBusy) {
      return;
    }

    const selectedCustomer = impersonationCustomers.find(
      (customer) => customer.projectRef === projectRef
    );
    if (!selectedCustomer) {
      return;
    }

    setTestModeBusy(true);
    try {
      const result = await api.createImpersonationConversation({
        projectRef: selectedCustomer.projectRef,
        customerName: selectedCustomer.customerName ?? undefined,
        customerEmail: selectedCustomer.email ?? undefined
      });

      const label = toImpersonationLabel(selectedCustomer);
      const statusMessage = createSystemStatusMessage(
        result.conversation.id,
        `Impersonating ${label}`
      );
      setThread(appendMessage(result.conversation, statusMessage));
      setActiveImpersonation({
        projectRef: selectedCustomer.projectRef,
        label
      });
      setConversationReady(true);
      setShowRequestModal(false);
      setRequestReason("");
      setRequestError(null);
      setDraft("");
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Unable to start impersonation."
      );
    } finally {
      setTestModeBusy(false);
    }
  };

  const cancelImpersonation = () => {
    setActiveImpersonation(null);
    setConversationReady(false);
    setShowRequestModal(false);
    setRequestReason("");
    setThread((current) => {
      if (!isTestModeEnabled || current.id === testModeConversation.id) {
        return testModeConversation;
      }
      return appendMessage(
        current,
        createSystemStatusMessage(current.id, "Impersonation cancelled")
      );
    });
  };

  const setTestMode = (enabled: boolean) => {
    if (!canUseTestMode || testModeBusy) {
      return;
    }

    setIsTestModeEnabled(enabled);
    setShowRequestModal(false);
    setRequestReason("");
    setDraft("");
    setRequestError(null);

    if (!enabled) {
      modeStatusNoticeRef.current = "Test mode off. Any active impersonation has ended.";
      setActiveImpersonation(null);
      setSelectedImpersonationProjectRef("");
      setImpersonationCustomers([]);
      setConversationReady(false);
      setThread((current) =>
        appendMessage(
          current,
          createSystemStatusMessage(current.id, "Test mode off. Any active impersonation has ended.")
        )
      );
      return;
    }

    modeStatusNoticeRef.current = null;
    setConversationReady(false);
    setThread(
      appendMessage(
        testModeConversation,
        createSystemStatusMessage(
          testModeConversation.id,
          "Test mode on. Impersonation is only active while test mode is enabled."
        )
      )
    );
    void loadImpersonationCustomers(testModeSearchQuery);
  };

  const sendDraft = async () => {
    if (!conversationReady || isSubmitting || testModeBusy) {
      return;
    }

    const messageText = normalizeMessageDraft(draft);
    if (!messageText) {
      return;
    }

    if (authSession.authenticated && pendingRepOfferMessageIdRef.current) {
      if (isRepConfirmationYes(messageText)) {
        pendingRepOfferMessageIdRef.current = null;
        setDraft("");
        setRequestError(null);
        setShowRequestModal(true);
        return;
      }

      // Any other response means customer declined or continued the chat.
      pendingRepOfferMessageIdRef.current = null;
    }

    if (!authSession.authenticated) {
      const guestConversationId = thread.id;
      setThread((current) =>
        appendMessage(current, createLocalTimelineMessage(current.id, "customer", messageText))
      );
      setDraft("");
      setRequestError(null);

      const guestReply = buildGuestAvaReply(messageText);
      window.setTimeout(() => {
        setThread((current) => {
          if (current.id !== guestConversationId) {
            return current;
          }
          return appendMessage(current, createLocalTimelineMessage(current.id, "ava", guestReply));
        });
      }, 280);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.createCustomerMessage({
        conversationId: thread.id,
        text: messageText,
        clientMessageId: generateClientMessageId()
      });

      setThread((current) => appendMessage(current, result.message));
      setDraft("");
      setRequestError(null);
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Unable to send message right now."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitHandoffRequest = async () => {
    if (!authSession.authenticated || !conversationReady || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.requestHandoff({
        conversationId: thread.id,
        customerName: authSession.user?.name ?? "Customer",
        reason: requestReason.trim() || undefined
      });

      setThread(result.thread);
      setShowRequestModal(false);
      setRequestReason("");
      setRequestError(null);
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Unable to request handoff right now."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitHandoffRating = async (
    requestId: string,
    rating: "thumbs_up" | "thumbs_down"
  ) => {
    if (!authSession.authenticated || !conversationReady || isSubmitting || !thread.id) {
      return;
    }

    setRatingSubmissionRequestId(requestId);
    try {
      const result = await api.submitHandoffRating({
        conversationId: thread.id,
        rating
      });
      setThread(result.thread);
      setRequestError(null);
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Unable to submit rating right now."
      );
    } finally {
      setRatingSubmissionRequestId(null);
    }
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) {
      return;
    }

    window.parent.postMessage(
      {
        source: "ava-widget",
        type: "open-state",
        open: isOpen
      },
      "*"
    );
  }, [isOpen]);

  useEffect(() => {
    realtimeCursorRef.current = undefined;

    if (authSession.loading) {
      return;
    }

    if (!authSession.authenticated) {
      setConversationReady(true);
      setThread((current) =>
        current.id === loggedOutConversation.id ? current : loggedOutConversation
      );
      pendingRepOfferMessageIdRef.current = null;
      modeStatusNoticeRef.current = null;
      setIsTestModeEnabled(false);
      setImpersonationCustomers([]);
      setSelectedImpersonationProjectRef("");
      setActiveImpersonation(null);
      setTestModeSearchQuery("");
      setTestModeBusy(false);
      return;
    }

    if (canUseTestMode && !isTestModeEnabled) {
      setConversationReady(false);
      setActiveImpersonation(null);
      setSelectedImpersonationProjectRef("");
      setImpersonationCustomers([]);
    }

    if (canUseTestMode && isTestModeEnabled) {
      if (!hasActiveImpersonation) {
        setConversationReady(false);
        setThread(testModeConversation);
      }
      return;
    }

    setConversationReady(false);
    setThread(createOptimisticCustomerGreetingConversation(greetingName));

    let cancelled = false;
    const loadConversation = async () => {
      try {
        setRequestError(null);
        const listResult = await api.listConversations({
          excludeImpersonation: canUseTestMode && !isTestModeEnabled
        });
        const latestConversation =
          listResult.conversations.length > 0 ? listResult.conversations[0] : null;
        let conversation = latestConversation;
        if (!conversation) {
          try {
            const created = await api.createConversation({
              greetingText: greetingName
                ? toPersonalizedGreetingText(greetingName)
                : "Hi! How can I help you today?"
            });
            conversation = created.conversation;
          } catch {
            conversation = latestConversation;
          }
        }
        if (!conversation) {
          throw new Error("Unable to load your conversation.");
        }

        if (cancelled) {
          return;
        }

        const modeStatusNotice = modeStatusNoticeRef.current;
        modeStatusNoticeRef.current = null;
        setThread(
          modeStatusNotice
            ? appendMessage(
                conversation,
                createSystemStatusMessage(conversation.id, modeStatusNotice)
              )
            : conversation
        );
        setConversationReady(true);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setConversationReady(false);
        setRequestError(
          error instanceof Error ? error.message : "Unable to load your conversation."
        );
      }
    };

    void loadConversation();
    return () => {
      cancelled = true;
    };
  }, [
    authSession.loading,
    authSession.authenticated,
    authSession.user?.id,
    authSession.user?.name,
    authSession.user?.email,
    loggedOutConversation,
    canUseTestMode,
    isTestModeEnabled,
    hasActiveImpersonation,
    greetingName,
    starterConversation,
    testModeConversation,
    api
  ]);

  useEffect(() => {
    if (canUseTestMode) {
      return;
    }

    modeStatusNoticeRef.current = null;
    setIsTestModeEnabled(false);
    setActiveImpersonation(null);
    setImpersonationCustomers([]);
    setSelectedImpersonationProjectRef("");
    setTestModeSearchQuery("");
    setTestModeBusy(false);
  }, [canUseTestMode]);

  useEffect(() => {
    if (!authSession.authenticated || !conversationReady) {
      setTimelineResetAtMs(null);
      return;
    }

    if (canUseTestMode && isTestModeEnabled) {
      setTimelineResetAtMs(null);
      return;
    }

    const conversationId = thread.id;
    const existingResetMs = readTimelineResetMs(conversationId);
    if (shouldSkipAutoTimelineReset(thread)) {
      setTimelineResetAtMs(existingResetMs);
      return;
    }

    const lastActivityMs = getLastThreadActivityMs(thread);
    if (lastActivityMs === null) {
      setTimelineResetAtMs(existingResetMs);
      return;
    }

    const nowMs = Date.now();
    const inactiveForMs = nowMs - lastActivityMs;
    if (inactiveForMs >= TIMELINE_RESET_INACTIVITY_MS) {
      const shouldCreateNewReset = !existingResetMs || existingResetMs < lastActivityMs;
      const nextResetMs = shouldCreateNewReset ? nowMs : existingResetMs;
      if (shouldCreateNewReset) {
        writeTimelineResetMs(conversationId, nextResetMs);
      }
      setTimelineResetAtMs(nextResetMs);
      return;
    }

    setTimelineResetAtMs(existingResetMs);
  }, [
    authSession.authenticated,
    canUseTestMode,
    conversationReady,
    isTestModeEnabled,
    thread
  ]);

  useEffect(() => {
    if (!authSession.authenticated || !conversationReady) {
      return;
    }

    let cancelled = false;
    const conversationId = thread.id;

    const syncRealtime = async () => {
      if (realtimeBusyRef.current) {
        return;
      }

      realtimeBusyRef.current = true;
      try {
        const result = await api.getRealtimeEvents(realtimeCursorRef.current);
        if (cancelled) {
          return;
        }

        realtimeCursorRef.current = result.cursor;
        if (result.cursorStale) {
          const refreshed = await api.getConversation(conversationId);
          if (cancelled) {
            return;
          }
          setThread(refreshed.conversation);
          return;
        }
        const hasConversationUpdate = result.events.some(
          (event) => event.conversationId === conversationId
        );

        if (!hasConversationUpdate) {
          return;
        }

        const refreshed = await api.getConversation(conversationId);
        if (cancelled) {
          return;
        }
        setThread(refreshed.conversation);
      } catch (error) {
        if (!cancelled) {
          setRequestError(
            error instanceof Error
              ? error.message
              : "Realtime sync is temporarily unavailable."
          );
        }
      } finally {
        realtimeBusyRef.current = false;
      }
    };

    void syncRealtime();
    const intervalId = window.setInterval(() => {
      void syncRealtime();
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [authSession.authenticated, conversationReady, thread.id, api]);

  useEffect(() => {
    if (!authSession.authenticated || !conversationReady) {
      return;
    }

    const latestMessage = visibleThread.messages[visibleThread.messages.length - 1];
    if (!latestMessage) {
      return;
    }

    if (
      latestMessage.kind === "system" &&
      (visibleThread.handoff.state === "pending" ||
        visibleThread.handoff.state === "claimed" ||
        visibleThread.handoff.state === "active")
    ) {
      pendingRepOfferMessageIdRef.current = null;
      return;
    }

    if (latestMessage.kind !== "ava") {
      return;
    }

    if (shouldPromptRepRequest(latestMessage.text)) {
      pendingRepOfferMessageIdRef.current = latestMessage.id;
    }
  }, [authSession.authenticated, conversationReady, visibleThread]);

  const openPanel = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsPanelMounted(true);
    requestAnimationFrame(() => {
      setIsPanelVisible(true);
      setIsOpen(true);
    });
  };

  const closePanel = () => {
    setIsPanelVisible(false);
    setIsOpen(false);
    closeTimerRef.current = window.setTimeout(() => {
      setIsPanelMounted(false);
      closeTimerRef.current = null;
    }, 240);
  };

  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) {
      return;
    }

    const onHostMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") {
        return;
      }

      const payload = event.data as HostWidgetCommandMessage;
      if (payload.source !== "aveyo-host" || payload.type !== "set-open-state") {
        return;
      }

      if (payload.open === true) {
        if (closeTimerRef.current !== null) {
          window.clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }
        setIsPanelMounted(true);
        requestAnimationFrame(() => {
          setIsPanelVisible(true);
          setIsOpen(true);
        });
        return;
      }

      if (payload.open === false) {
        setIsPanelVisible(false);
        setIsOpen(false);
        closeTimerRef.current = window.setTimeout(() => {
          setIsPanelMounted(false);
          closeTimerRef.current = null;
        }, 240);
      }
    };

    window.addEventListener("message", onHostMessage);
    return () => {
      window.removeEventListener("message", onHostMessage);
    };
  }, []);

  const togglePanel = () => {
    if (embedMode) {
      return;
    }
    if (isOpen) {
      closePanel();
      return;
    }
    openPanel();
  };

  const composerActionDisabled =
    authSession.loading ||
    !conversationReady ||
    isSubmitting ||
    testModeBusy;

  const testModeOptions = impersonationCustomers.map((customer) => ({
    projectRef: customer.projectRef,
    label: customer.projectStatus
      ? `${toImpersonationLabel(customer)} - ${customer.projectRef} (${customer.projectStatus})`
      : `${toImpersonationLabel(customer)} - ${customer.projectRef}`
  }));

  const iframeEmbedSnippet = `<iframe
  src="https://ava.aveyo.com/embed"
  title="Ava support chat"
  loading="lazy"
  referrerpolicy="strict-origin-when-cross-origin"
  style="position:fixed;right:24px;bottom:24px;width:440px;height:760px;border:0;z-index:2147483000;"
></iframe>`;

  return (
    <div className="host-surface">
      <div className="floating-widget">
        {isPanelMounted ? (
          <section
            className={`widget-panel ${isPanelVisible ? "is-open" : "is-closed"}`}
            aria-hidden={!isPanelVisible}
          >
            {canUseTestMode && isTestModeEnabled ? (
              <WidgetTestMode
                searchQuery={testModeSearchQuery}
                onSearchQueryChange={setTestModeSearchQuery}
                onSearch={() => {
                  void loadImpersonationCustomers(testModeSearchQuery);
                }}
                options={testModeOptions}
                selectedProjectRef={selectedImpersonationProjectRef}
                onSelectProjectRef={(projectRef) => {
                  setSelectedImpersonationProjectRef(projectRef);
                  if (!projectRef) {
                    cancelImpersonation();
                    return;
                  }
                  void beginImpersonation(projectRef);
                }}
                activeImpersonationLabel={activeImpersonation?.label}
                onCancelImpersonation={cancelImpersonation}
                disabled={!authSession.authenticated}
                busy={testModeBusy || isSubmitting}
              />
            ) : null}

            <WidgetTimeline
              thread={visibleThread}
              showRequestModal={showRequestModal}
              requestReason={requestReason}
              ratingSubmissionRequestId={ratingSubmissionRequestId}
              onRequestReasonChange={setRequestReason}
              onCancelRequest={() => setShowRequestModal(false)}
              onSubmitRequest={() => {
                void submitHandoffRequest();
              }}
              onSubmitHandoffRating={(requestId, rating) => {
                void submitHandoffRating(requestId, rating);
              }}
            />

            <WidgetComposer
              disabled={false}
              actionDisabled={composerActionDisabled}
              showTalkToRep={isTestModeEnabled}
              showTestModeToggle={canUseTestMode}
              testModeEnabled={isTestModeEnabled}
              testModeToggleDisabled={
                authSession.loading ||
                !authSession.authenticated ||
                testModeBusy ||
                isSubmitting
              }
              draft={draft}
              onDraftChange={setDraft}
              onSendDraft={() => {
                void sendDraft();
              }}
              onTestModeChange={setTestMode}
              onOpenRequestModal={() => {
                if (!composerActionDisabled && isTestModeEnabled) {
                  setShowRequestModal(true);
                }
              }}
            />
          </section>
        ) : null}

        {!embedMode ? <LauncherButton isOpen={isOpen} onToggle={togglePanel} /> : null}
      </div>

      {shouldShowEmbedNote ? (
        <div className="embed-note">
          <p className="embed-note-title">Widget embed instructions</p>
          <ol className="embed-note-steps">
            <li>
              Canonical embed host URL: <code>https://ava.aveyo.com/embed</code>.
            </li>
            <li>
              Keep auth cookies scoped to `.aveyo.com` so logged-in sessions are shared with the
              embed.
            </li>
            <li>Paste this iframe snippet on the host page where you want the launcher to appear.</li>
          </ol>
          <p className="embed-note-footnote">Use this route for cross-app widget embedding.</p>
          <pre className="embed-note-code">
            <code>{iframeEmbedSnippet}</code>
          </pre>
          <p className="embed-note-footnote">
            Local testing URL: <code>{`${getLocalAppUrl("ava")}/embed`}</code>
          </p>
          {requestError ? (
            <p className="embed-note-error">{requestError}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
