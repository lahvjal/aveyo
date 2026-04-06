"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ConversationThread } from "@ava/chat-domain";
import { getLocalAppUrl } from "@ava/config/runtime/app-urls";
import { useAuthSession } from "@/lib/auth/use-auth-session";
import {
  createImpersonationConversationApi,
  createConversationApi,
  createCustomerMessageApi,
  getConversationApi,
  getRealtimeEventsApi,
  listImpersonationCustomersApi,
  listConversationsApi,
  type ImpersonationCustomer,
  type RealtimeEvent,
  requestHandoffApi
} from "@/lib/widget-api";
import {
  appendMessage,
  createOptimisticCustomerGreetingConversation,
  createSystemStatusMessage,
  createTestModeConversation,
  createLoggedOutConversation,
  createStarterConversation,
  normalizeMessageDraft
} from "@/lib/widget-state";
import { LauncherButton } from "./launcher-button";
import { WidgetComposer } from "./widget-composer";
import { WidgetTestMode } from "./widget-test-mode";
import { WidgetTimeline } from "./widget-timeline";

interface ActiveImpersonation {
  projectRef: string;
  label: string;
}

interface WidgetShellProps {
  embedMode?: boolean;
  defaultOpen?: boolean;
  showEmbedNote?: boolean;
}

interface HostWidgetCommandMessage {
  source?: string;
  type?: string;
  open?: boolean;
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

type TypingActor = "customer" | "representative" | "ava";

const AVA_TYPING_FALLBACK_MS = 15_000;
const AVA_TYPING_STOP_GRACE_MS = 3_200;
const REPRESENTATIVE_TYPING_FALLBACK_MS = 15_000;
const REPRESENTATIVE_TYPING_STOP_GRACE_MS = 3_200;

function allowsAvaReplyForThread(thread: ConversationThread) {
  return thread.handoff.state === "none" || thread.handoff.state === "resolved";
}

function parseTypingPayload(payload: unknown): { actor: TypingActor; isTyping: boolean } | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const actor = record.actor;
  const isTyping = record.isTyping;
  if (
    (actor === "customer" || actor === "representative" || actor === "ava") &&
    typeof isTyping === "boolean"
  ) {
    return {
      actor,
      isTyping
    };
  }
  return null;
}

function getLatestTypingState(
  events: RealtimeEvent[],
  conversationId: string,
  actor: TypingActor
) {
  let latestState: boolean | null = null;
  for (const event of events) {
    if (event.conversationId !== conversationId || event.type !== "typing") {
      continue;
    }
    const payload = parseTypingPayload(event.payload);
    if (!payload || payload.actor !== actor) {
      continue;
    }
    latestState = payload.isTyping;
  }
  return latestState;
}

export function WidgetShell({
  embedMode = false,
  defaultOpen = true,
  showEmbedNote
}: WidgetShellProps) {
  const authSession = useAuthSession();
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
  const [isAvaTyping, setIsAvaTyping] = useState(false);
  const [isRepresentativeTyping, setIsRepresentativeTyping] = useState(false);
  const floatingWidgetRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const avaTypingTimeoutRef = useRef<number | null>(null);
  const avaTypingStopTimeoutRef = useRef<number | null>(null);
  const representativeTypingTimeoutRef = useRef<number | null>(null);
  const representativeTypingStopTimeoutRef = useRef<number | null>(null);
  const realtimeCursorRef = useRef<string | undefined>(undefined);
  const realtimeBusyRef = useRef(false);

  const clearAvaTypingStopTimeout = useCallback(() => {
    if (avaTypingStopTimeoutRef.current === null) {
      return;
    }
    if (typeof window !== "undefined") {
      window.clearTimeout(avaTypingStopTimeoutRef.current);
    }
    avaTypingStopTimeoutRef.current = null;
  }, []);

  const clearAvaTypingTimeout = useCallback(() => {
    if (avaTypingTimeoutRef.current === null) {
      return;
    }
    if (typeof window !== "undefined") {
      window.clearTimeout(avaTypingTimeoutRef.current);
    }
    avaTypingTimeoutRef.current = null;
  }, []);

  const updateAvaTyping = useCallback(
    (isTyping: boolean) => {
      setIsAvaTyping(isTyping);
      clearAvaTypingStopTimeout();
      clearAvaTypingTimeout();
      if (!isTyping || typeof window === "undefined") {
        return;
      }
      avaTypingTimeoutRef.current = window.setTimeout(() => {
        avaTypingTimeoutRef.current = null;
        setIsAvaTyping(false);
      }, AVA_TYPING_FALLBACK_MS);
    },
    [clearAvaTypingStopTimeout, clearAvaTypingTimeout]
  );

  const scheduleAvaTypingStop = useCallback(() => {
    clearAvaTypingStopTimeout();
    if (typeof window === "undefined") {
      updateAvaTyping(false);
      return;
    }
    avaTypingStopTimeoutRef.current = window.setTimeout(() => {
      avaTypingStopTimeoutRef.current = null;
      updateAvaTyping(false);
    }, AVA_TYPING_STOP_GRACE_MS);
  }, [clearAvaTypingStopTimeout, updateAvaTyping]);

  const clearAvaTypingState = useCallback(() => {
    clearAvaTypingStopTimeout();
    updateAvaTyping(false);
  }, [clearAvaTypingStopTimeout, updateAvaTyping]);

  const clearRepresentativeTypingStopTimeout = useCallback(() => {
    if (representativeTypingStopTimeoutRef.current === null) {
      return;
    }
    if (typeof window !== "undefined") {
      window.clearTimeout(representativeTypingStopTimeoutRef.current);
    }
    representativeTypingStopTimeoutRef.current = null;
  }, []);

  const clearRepresentativeTypingTimeout = useCallback(() => {
    if (representativeTypingTimeoutRef.current === null) {
      return;
    }
    if (typeof window !== "undefined") {
      window.clearTimeout(representativeTypingTimeoutRef.current);
    }
    representativeTypingTimeoutRef.current = null;
  }, []);

  const updateRepresentativeTyping = useCallback(
    (isTyping: boolean) => {
      setIsRepresentativeTyping(isTyping);
      clearRepresentativeTypingStopTimeout();
      clearRepresentativeTypingTimeout();
      if (!isTyping || typeof window === "undefined") {
        return;
      }
      representativeTypingTimeoutRef.current = window.setTimeout(() => {
        representativeTypingTimeoutRef.current = null;
        setIsRepresentativeTyping(false);
      }, REPRESENTATIVE_TYPING_FALLBACK_MS);
    },
    [clearRepresentativeTypingStopTimeout, clearRepresentativeTypingTimeout]
  );

  const scheduleRepresentativeTypingStop = useCallback(() => {
    clearRepresentativeTypingStopTimeout();
    if (typeof window === "undefined") {
      updateRepresentativeTyping(false);
      return;
    }
    representativeTypingStopTimeoutRef.current = window.setTimeout(() => {
      representativeTypingStopTimeoutRef.current = null;
      updateRepresentativeTyping(false);
    }, REPRESENTATIVE_TYPING_STOP_GRACE_MS);
  }, [clearRepresentativeTypingStopTimeout, updateRepresentativeTyping]);

  const clearRepresentativeTypingState = useCallback(() => {
    clearRepresentativeTypingStopTimeout();
    updateRepresentativeTyping(false);
  }, [clearRepresentativeTypingStopTimeout, updateRepresentativeTyping]);

  const canUseTestMode = authSession.authenticated && authSession.userType === "employee";
  const hasActiveImpersonation = activeImpersonation !== null;
  const personalizedThread = useMemo(() => {
    if (!authSession.authenticated) {
      return thread;
    }
    return personalizeInitialGreeting(thread, greetingName);
  }, [authSession.authenticated, greetingName, thread]);
  const activeThread = authSession.authenticated ? personalizedThread : loggedOutConversation;

  const toImpersonationLabel = (customer: ImpersonationCustomer) =>
    customer.email || customer.customerName || customer.customerId || customer.projectRef;

  const loadImpersonationCustomers = async (query?: string) => {
    if (!canUseTestMode || testModeBusy) {
      return;
    }

    setTestModeBusy(true);
    try {
      const result = await listImpersonationCustomersApi(query, 25);
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
      const result = await createImpersonationConversationApi({
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
      setActiveImpersonation(null);
      setConversationReady(false);
      setThread(starterConversation);
      return;
    }

    setConversationReady(false);
    setThread(testModeConversation);
    void loadImpersonationCustomers(testModeSearchQuery);
  };

  const sendDraft = async () => {
    if (
      !authSession.authenticated ||
      !conversationReady ||
      isSubmitting ||
      testModeBusy
    ) {
      return;
    }

    const messageText = normalizeMessageDraft(draft);
    if (!messageText) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createCustomerMessageApi({
        conversationId: thread.id,
        text: messageText,
        clientMessageId: generateClientMessageId()
      });

      setThread((current) => appendMessage(current, result.message));
      if (allowsAvaReplyForThread(thread)) {
        updateAvaTyping(true);
      }
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
    if (
      !authSession.authenticated ||
      !conversationReady ||
      isSubmitting ||
      !isTestModeEnabled
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestHandoffApi({
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

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
      clearAvaTypingStopTimeout();
      clearAvaTypingTimeout();
      clearRepresentativeTypingStopTimeout();
      clearRepresentativeTypingTimeout();
    };
  }, [
    clearAvaTypingStopTimeout,
    clearAvaTypingTimeout,
    clearRepresentativeTypingStopTimeout,
    clearRepresentativeTypingTimeout
  ]);

  useEffect(() => {
    clearAvaTypingState();
    clearRepresentativeTypingState();
  }, [thread.id, clearAvaTypingState, clearRepresentativeTypingState]);

  useEffect(() => {
    if (!conversationReady) {
      clearAvaTypingState();
      clearRepresentativeTypingState();
    }
  }, [conversationReady, clearAvaTypingState, clearRepresentativeTypingState]);

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
      setConversationReady(false);
      setThread(loggedOutConversation);
      setIsTestModeEnabled(false);
      setImpersonationCustomers([]);
      setSelectedImpersonationProjectRef("");
      setActiveImpersonation(null);
      setTestModeSearchQuery("");
      setTestModeBusy(false);
      return;
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
        const listResult = await listConversationsApi({ ownOnly: true });
        const latestConversation =
          listResult.conversations.length > 0 ? listResult.conversations[0] : null;

        const conversation =
          latestConversation ??
          (
            await createConversationApi({
              greetingText: greetingName
                ? toPersonalizedGreetingText(greetingName)
                : "Hi! How can I help you today?"
            })
          ).conversation;

        if (cancelled) {
          return;
        }

        setThread(conversation);
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
    testModeConversation
  ]);

  useEffect(() => {
    if (canUseTestMode) {
      return;
    }

    setIsTestModeEnabled(false);
    setActiveImpersonation(null);
    setImpersonationCustomers([]);
    setSelectedImpersonationProjectRef("");
    setTestModeSearchQuery("");
    setTestModeBusy(false);
  }, [canUseTestMode]);

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
        const result = await getRealtimeEventsApi(realtimeCursorRef.current);
        if (cancelled) {
          return;
        }

        realtimeCursorRef.current = result.cursor;
        const latestAvaTypingState = getLatestTypingState(result.events, conversationId, "ava");
        const latestRepresentativeTypingState = getLatestTypingState(
          result.events,
          conversationId,
          "representative"
        );
        if (latestAvaTypingState !== null) {
          if (latestAvaTypingState) {
            updateAvaTyping(true);
          } else {
            scheduleAvaTypingStop();
          }
        }
        if (latestRepresentativeTypingState !== null) {
          if (latestRepresentativeTypingState) {
            updateRepresentativeTyping(true);
          } else {
            scheduleRepresentativeTypingStop();
          }
        }

        if (result.cursorStale) {
          const refreshed = await getConversationApi(conversationId);
          if (cancelled) {
            return;
          }
          setThread(refreshed.conversation);
          const latestMessage = refreshed.conversation.messages[refreshed.conversation.messages.length - 1];
          if (latestMessage?.kind === "ava") {
            clearAvaTypingState();
          }
          if (latestMessage?.kind === "representative") {
            clearRepresentativeTypingState();
          }
          return;
        }
        const hasConversationUpdate = result.events.some(
          (event) => event.conversationId === conversationId && event.type !== "typing"
        );

        if (!hasConversationUpdate) {
          return;
        }

        const refreshed = await getConversationApi(conversationId);
        if (cancelled) {
          return;
        }
        setThread(refreshed.conversation);
        const latestMessage = refreshed.conversation.messages[refreshed.conversation.messages.length - 1];
        if (latestMessage?.kind === "ava") {
          clearAvaTypingState();
        }
        if (latestMessage?.kind === "representative") {
          clearRepresentativeTypingState();
        }
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
  }, [
    authSession.authenticated,
    conversationReady,
    thread.id,
    clearAvaTypingState,
    clearRepresentativeTypingState,
    scheduleAvaTypingStop,
    scheduleRepresentativeTypingStop,
    updateAvaTyping,
    updateRepresentativeTyping
  ]);

  const openPanel = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsPanelMounted(true);
    requestAnimationFrame(() => {
      setIsPanelVisible(true);
      setIsOpen(true);
    });
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelVisible(false);
    setIsOpen(false);
    closeTimerRef.current = window.setTimeout(() => {
      setIsPanelMounted(false);
      closeTimerRef.current = null;
    }, 240);
  }, []);

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
        openPanel();
        return;
      }

      if (payload.open === false) {
        closePanel();
      }
    };

    window.addEventListener("message", onHostMessage);
    return () => {
      window.removeEventListener("message", onHostMessage);
    };
  }, [closePanel, openPanel]);

  useEffect(() => {
    if (embedMode || !isOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (floatingWidgetRef.current?.contains(target)) {
        return;
      }
      closePanel();
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [embedMode, isOpen, closePanel]);

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

  const composerDisabled =
    authSession.loading ||
    !authSession.authenticated ||
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
      <div ref={floatingWidgetRef} className="floating-widget">
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
              thread={activeThread}
              showAvaTyping={isAvaTyping}
              showRepresentativeTyping={isRepresentativeTyping}
              showRequestModal={showRequestModal}
              requestReason={requestReason}
              onRequestReasonChange={setRequestReason}
              onCancelRequest={() => setShowRequestModal(false)}
              onSubmitRequest={() => {
                void submitHandoffRequest();
              }}
            />

            <WidgetComposer
              disabled={composerDisabled}
              sending={isSubmitting}
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
                if (!composerDisabled && isTestModeEnabled) {
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
