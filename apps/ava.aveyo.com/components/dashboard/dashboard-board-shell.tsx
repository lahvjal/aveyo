"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ConversationThread } from "@ava/chat-domain";
import {
  appendTimelineMessage,
  createEmptyConversation,
  createTicketFromQueueRecord,
  mapConversationCustomerDetailsToPanelData,
  mapSupportAgentNoteToHistoryNote,
  normalizeDraft
} from "@/lib/dashboard-state";
import { canAccessAvaManagerViews } from "@/lib/auth/access";
import { buildAuthLoginUrl } from "@/lib/auth/config";
import { logoutAuthSession } from "@/lib/auth/session";
import { useAuthSession } from "@/lib/auth/use-auth-session";
import { useRealtimeInvalidation } from "@/lib/use-realtime-invalidation";
import { useSupportPresence } from "@/lib/use-support-presence";
import {
  claimHandoffApi,
  createRepresentativeMessageApi,
  createSupportNoteApi,
  getConversationApi,
  getConversationCustomerDetailsApi,
  listQueueApi,
  listSupportNotesApi,
  publishRepresentativeTypingApi,
  resolveHandoffApi,
  type QueueRecord
} from "@/lib/dashboard-api";
import { useAvaReplySuggestion } from "@/lib/dashboard-ava-suggestion";
import { publishDashboardSyncEvent, subscribeDashboardSyncEvents } from "@/lib/dashboard-sync";
import { type CustomerPanelDetails, type HistoryNote, type Ticket } from "@/lib/dashboard-types";
import { useHandoffNotifications } from "@/lib/use-handoff-notifications";
import { AppSideRail } from "@/components/app-side-rail";
import { AvaSecondaryNav } from "@/components/ava-secondary-nav";
import { ChatColumn } from "./chat-column";
import { DetailColumn } from "./detail-column";
import { HandoffTransferControls } from "./handoff-transfer-controls";
import { QueueBoardColumns } from "./queue-board-columns";

function toRoleLabel(role: string | null | undefined) {
  if (role === "super_admin") {
    return "Platform Admin";
  }
  if (role === "support_agent") {
    return "Support Agent";
  }
  if (role === "customer") {
    return "Customer";
  }
  return "Support Agent";
}

function getInitials(name: string | null | undefined) {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) {
    return "AG";
  }

  const parts = trimmed
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) {
    return "AG";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function parseIsoToMs(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function formatWorkspaceTimer(startAt: string | null | undefined, nowMs: number) {
  const startMs = parseIsoToMs(startAt);
  if (startMs === null) {
    return "--:--";
  }

  const totalSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatActiveChatSummary(activeCount: number, pendingCount: number) {
  const totalCount = activeCount + pendingCount;
  return `${activeCount}/${totalCount} active chats`;
}

function SecondaryNavToggleIcon() {
  return (
    <svg viewBox="0 0 8 9" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="4" cy="4.5" r="3.35" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="4" cy="4.5" r="1.25" fill="currentColor" />
    </svg>
  );
}

function generateClientMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const HINT_TOAST_DURATION_MS = 3200;

export function DashboardBoardShell() {
  const router = useRouter();
  const authSession = useAuthSession();
  const seededConversation = useMemo(() => createEmptyConversation(), []);

  const { isOnline, syncing: presenceSyncing, toggleOnline } = useSupportPresence(authSession);
  const { notifyNewPendingHandoffs } = useHandoffNotifications();
  const [queueRecords, setQueueRecords] = useState<QueueRecord[]>([]);
  const [selectedActiveRequestId, setSelectedActiveRequestId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationThread>(seededConversation);
  const [composeMode, setComposeMode] = useState<"reply" | "note">("reply");
  const [replyDraft, setReplyDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [historyNotes, setHistoryNotes] = useState<HistoryNote[]>([]);
  const [customerDetails, setCustomerDetails] = useState<CustomerPanelDetails | null>(null);
  const [customerDetailsLoading, setCustomerDetailsLoading] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [workspaceHint, setWorkspaceHint] = useState<string | null>(null);
  const [activeHintToast, setActiveHintToast] = useState<{ id: number; message: string } | null>(null);
  const [hintToastQueue, setHintToastQueue] = useState<Array<{ id: number; message: string }>>([]);
  const [claimPendingTicketId, setClaimPendingTicketId] = useState<string | null>(null);
  const [sendPending, setSendPending] = useState(false);
  const [notePending, setNotePending] = useState(false);
  const [resolvePending, setResolvePending] = useState(false);
  const [signOutPending, setSignOutPending] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);
  const [workspaceNowMs, setWorkspaceNowMs] = useState(() => Date.now());
  const realtimeBusyRef = useRef(false);
  const nextHintToastIdRef = useRef(0);
  const lastShellHintToastRef = useRef<string | null>(null);
  const representativeTypingSentRef = useRef(false);
  const representativeTypingConversationRef = useRef<string | null>(null);
  const representativeTypingLastSentAtMsRef = useRef(0);

  const agentAvatarUrl = authSession.user?.avatarUrl ?? null;
  const agentId = authSession.user?.id ?? null;
  const isAdminLike = authSession.role === "super_admin";

  const pendingRecords = useMemo(
    () =>
      queueRecords
        .filter((item) => item.status === "pending")
        .sort((a, b) => a.position - b.position),
    [queueRecords]
  );

  useEffect(() => {
    notifyNewPendingHandoffs(pendingRecords.map((record) => record.requestId));
  }, [notifyNewPendingHandoffs, pendingRecords]);

  const activeRecords = useMemo(
    () =>
      queueRecords
        .filter((item) => item.status === "active" || item.status === "claimed")
        .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)),
    [queueRecords]
  );
  const pendingQueue = useMemo<Ticket[]>(
    () => pendingRecords.map((record) => createTicketFromQueueRecord(record)),
    [pendingRecords]
  );
  const activeQueue = useMemo<Ticket[]>(
    () => activeRecords.map((record) => createTicketFromQueueRecord(record)),
    [activeRecords]
  );
  const activeChatSummary = formatActiveChatSummary(activeQueue.length, pendingQueue.length);
  const activeByRequestId = useMemo(
    () => new Map(activeRecords.map((record) => [record.requestId, record])),
    [activeRecords]
  );
  const selectedQueueRecord = useMemo(
    () =>
      (selectedActiveRequestId ? activeByRequestId.get(selectedActiveRequestId) : undefined) ?? null,
    [activeByRequestId, selectedActiveRequestId]
  );
  const workspaceConversationId = selectedQueueRecord?.conversationId ?? null;
  const isConversationLoaded = Boolean(
    workspaceConversationId &&
      conversation.id === workspaceConversationId &&
      conversation.id !== seededConversation.id
  );
  const isAssignedToCurrentAgent =
    !selectedQueueRecord?.claimedByAuthUserId || selectedQueueRecord.claimedByAuthUserId === agentId;
  const requestResolved = selectedQueueRecord?.status === "resolved";
  const isTransferTarget = selectedQueueRecord?.transferRequest?.target.id === agentId;
  const canInteract =
    Boolean(workspaceConversationId) && (isAssignedToCurrentAgent || isAdminLike) && !requestResolved;
  const interactionLockReason = !selectedQueueRecord
    ? "Select an active chat to start messaging."
    : !isAssignedToCurrentAgent
      ? isTransferTarget
        ? "This handoff stays with the current representative until you accept the transfer."
        : "This handoff is assigned to another representative."
      : requestResolved
        ? "This handoff has already been resolved."
        : undefined;
  const activeTicket = useMemo<Ticket | null>(() => {
    if (!selectedQueueRecord) {
      return null;
    }
    return createTicketFromQueueRecord(selectedQueueRecord, conversation);
  }, [conversation, selectedQueueRecord]);
  const pendingTransfer = selectedQueueRecord?.transferRequest ?? activeTicket?.transferRequest;
  const canRequestTransfer =
    Boolean(selectedQueueRecord) &&
    selectedQueueRecord?.claimedByAuthUserId === agentId &&
    selectedQueueRecord?.status !== "resolved" &&
    !pendingTransfer;
  const workspaceTimerSource = selectedQueueRecord?.claimedAt ?? selectedQueueRecord?.requestedAt ?? null;
  const workspaceTimerLabel = useMemo(
    () => formatWorkspaceTimer(workspaceTimerSource, workspaceNowMs),
    [workspaceNowMs, workspaceTimerSource]
  );
  const agentInitials = getInitials(authSession.user?.name);
  const composeValue = composeMode === "reply" ? replyDraft : noteDraft;
  const composerSubmitPending = composeMode === "reply" ? sendPending : notePending;
  const avaSuggestion = useAvaReplySuggestion({
    conversation,
    conversationId: workspaceConversationId,
    enabled:
      authSession.authenticated &&
      Boolean(workspaceConversationId) &&
      isConversationLoaded &&
      canInteract
  });

  const publishRepresentativeTyping = useCallback(
    (conversationId: string, isTyping: boolean, force = false) => {
      if (!authSession.authenticated || !authSession.user) {
        return;
      }

      const sameConversation = representativeTypingConversationRef.current === conversationId;
      const nowMs = Date.now();
      const underHeartbeatWindow =
        sameConversation && nowMs - representativeTypingLastSentAtMsRef.current < 2500;
      if (!force && isTyping && representativeTypingSentRef.current && underHeartbeatWindow) {
        return;
      }
      if (
        !force &&
        !isTyping &&
        (!representativeTypingSentRef.current || !sameConversation)
      ) {
        return;
      }

      representativeTypingConversationRef.current = conversationId;
      representativeTypingSentRef.current = isTyping;
      representativeTypingLastSentAtMsRef.current = nowMs;

      void publishRepresentativeTypingApi({ conversationId, isTyping }).catch(() => null);
    },
    [authSession.authenticated, authSession.user]
  );

  const shellHintMessage = useMemo(() => {
    if (operationError) {
      return null;
    }
    if (!isOnline) {
      return "You're offline. Go online to receive and claim requests.";
    }
    if (pendingQueue.length > 0) {
      const requestLabel = pendingQueue.length === 1 ? "request" : "requests";
      return `${pendingQueue.length} pending ${requestLabel} waiting to be claimed.`;
    }
    if (activeQueue.length > 0) {
      return "Select an active chat to load it in the workspace, or split it to its own tab.";
    }
    return "Queue is clear. New requests will appear in Pending Queue.";
  }, [activeQueue.length, isOnline, operationError, pendingQueue.length]);

  const enqueueHintToast = useCallback((message: string) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return;
    }
    nextHintToastIdRef.current += 1;
    const toastId = nextHintToastIdRef.current;
    setHintToastQueue((current) => [...current, { id: toastId, message: trimmedMessage }]);
  }, []);

  const refreshQueueData = useCallback(async () => {
    const result = await listQueueApi({ resolvedScope: "agent" });
    setQueueRecords(result.queue);
    setOperationError(null);
  }, []);

  const refreshQueueDataSafely = useCallback(async () => {
    try {
      await refreshQueueData();
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Unable to refresh queue.");
    }
  }, [refreshQueueData]);
  const handleToggleOnline = useCallback(async () => {
    try {
      await toggleOnline();
      setOperationError(null);
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : "Unable to update online status."
      );
    }
  }, [toggleOnline]);

  const refreshSelectedConversation = useCallback(async () => {
    if (!workspaceConversationId) {
      setConversation(seededConversation);
      return;
    }

    const conversationResult = await getConversationApi(workspaceConversationId);
    setConversation(conversationResult.conversation);
    setOperationError(null);
  }, [seededConversation, workspaceConversationId]);

  const refreshSelectedConversationSafely = useCallback(async () => {
    try {
      await refreshSelectedConversation();
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Unable to refresh active chat.");
    }
  }, [refreshSelectedConversation]);

  useEffect(() => {
    if (authSession.loading) {
      return;
    }

    if (!authSession.authenticated) {
      setQueueRecords([]);
      setSelectedActiveRequestId(null);
      setConversation(seededConversation);
      return;
    }

    let cancelled = false;
    const loadQueue = async () => {
      try {
        await refreshQueueData();
      } catch (error) {
        if (!cancelled) {
          setOperationError(error instanceof Error ? error.message : "Unable to load dashboard queue.");
          setQueueRecords([]);
          setSelectedActiveRequestId(null);
        }
      }
    };

    void loadQueue();
    return () => {
      cancelled = true;
    };
  }, [authSession.authenticated, authSession.loading, refreshQueueData, seededConversation]);

  useEffect(() => {
    return () => {
      const conversationId = representativeTypingConversationRef.current;
      if (!conversationId || !representativeTypingSentRef.current) {
        return;
      }
      void publishRepresentativeTypingApi({ conversationId, isTyping: false }).catch(() => null);
    };
  }, []);

  useEffect(() => {
    if (activeRecords.length === 0) {
      setSelectedActiveRequestId(null);
      return;
    }

    const activeRequestIds = new Set(activeRecords.map((record) => record.requestId));
    setSelectedActiveRequestId((current) => {
      if (current && activeRequestIds.has(current)) {
        return current;
      }

      const preferredRecord =
        activeRecords.find(
          (record) =>
            !record.claimedByAuthUserId ||
            record.claimedByAuthUserId === agentId ||
            isAdminLike
        ) ?? activeRecords[0];
      return preferredRecord?.requestId ?? null;
    });
  }, [activeRecords, agentId, isAdminLike]);

  useEffect(() => {
    if (!workspaceTimerSource) {
      return;
    }

    setWorkspaceNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setWorkspaceNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [workspaceTimerSource]);

  useEffect(() => {
    if (!workspaceHint || operationError) {
      return;
    }
    enqueueHintToast(workspaceHint);
    setWorkspaceHint(null);
  }, [enqueueHintToast, operationError, workspaceHint]);

  useEffect(() => {
    if (operationError || !shellHintMessage) {
      return;
    }
    if (shellHintMessage === lastShellHintToastRef.current) {
      return;
    }
    lastShellHintToastRef.current = shellHintMessage;
    enqueueHintToast(shellHintMessage);
  }, [enqueueHintToast, operationError, shellHintMessage]);

  useEffect(() => {
    if (operationError) {
      setActiveHintToast(null);
      setHintToastQueue([]);
    }
  }, [operationError]);

  useEffect(() => {
    if (activeHintToast || hintToastQueue.length === 0) {
      return;
    }
    const [nextToast, ...remainingToasts] = hintToastQueue;
    setActiveHintToast(nextToast);
    setHintToastQueue(remainingToasts);
  }, [activeHintToast, hintToastQueue]);

  useEffect(() => {
    if (!activeHintToast) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setActiveHintToast((current) => (current?.id === activeHintToast.id ? null : current));
    }, HINT_TOAST_DURATION_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeHintToast]);

  useEffect(() => {
    setComposeMode("reply");
    setReplyDraft("");
    setNoteDraft("");
    setHistoryNotes([]);
    setCustomerDetails(null);
    setCustomerDetailsLoading(false);

    if (!authSession.authenticated || !workspaceConversationId) {
      setConversation(seededConversation);
      return;
    }

    let cancelled = false;
    setConversation(seededConversation);

    const loadConversation = async () => {
      try {
        const conversationResult = await getConversationApi(workspaceConversationId);
        if (cancelled) {
          return;
        }
        setConversation(conversationResult.conversation);
        setOperationError(null);
      } catch (error) {
        if (!cancelled) {
          setConversation(seededConversation);
          setOperationError(error instanceof Error ? error.message : "Unable to load selected chat.");
        }
      }
    };

    void loadConversation();
    return () => {
      cancelled = true;
    };
  }, [authSession.authenticated, seededConversation, workspaceConversationId]);

  useEffect(() => {
    const previousConversationId = representativeTypingConversationRef.current;
    if (previousConversationId && previousConversationId !== workspaceConversationId) {
      publishRepresentativeTyping(previousConversationId, false, true);
      representativeTypingSentRef.current = false;
    }

    representativeTypingConversationRef.current = workspaceConversationId;

    if (!authSession.authenticated || !workspaceConversationId || !canInteract) {
      if (previousConversationId && representativeTypingSentRef.current) {
        publishRepresentativeTyping(previousConversationId, false, true);
      }
      representativeTypingSentRef.current = false;
      return;
    }

    const hasDraft = composeMode === "reply" && Boolean(normalizeDraft(replyDraft));
    publishRepresentativeTyping(workspaceConversationId, hasDraft);
  }, [
    authSession.authenticated,
    canInteract,
    composeMode,
    publishRepresentativeTyping,
    replyDraft,
    workspaceConversationId
  ]);

  useEffect(() => {
    if (!authSession.authenticated || !workspaceConversationId || !isConversationLoaded) {
      setHistoryNotes([]);
      return;
    }

    let cancelled = false;
    const loadNotes = async () => {
      try {
        const result = await listSupportNotesApi(workspaceConversationId);
        if (cancelled) {
          return;
        }
        setHistoryNotes(result.notes.map(mapSupportAgentNoteToHistoryNote));
      } catch {
        if (!cancelled) {
          setHistoryNotes([]);
        }
      }
    };

    void loadNotes();
    return () => {
      cancelled = true;
    };
  }, [authSession.authenticated, isConversationLoaded, workspaceConversationId]);

  useEffect(() => {
    if (!authSession.authenticated || !workspaceConversationId || !isConversationLoaded) {
      setCustomerDetails(null);
      setCustomerDetailsLoading(false);
      return;
    }

    let cancelled = false;
    setCustomerDetailsLoading(true);
    const loadDetails = async () => {
      try {
        const result = await getConversationCustomerDetailsApi(workspaceConversationId);
        if (cancelled) {
          return;
        }
        setCustomerDetails(mapConversationCustomerDetailsToPanelData(result.details));
      } catch {
        if (!cancelled) {
          setCustomerDetails(null);
        }
      } finally {
        if (!cancelled) {
          setCustomerDetailsLoading(false);
        }
      }
    };

    void loadDetails();
    return () => {
      cancelled = true;
    };
  }, [authSession.authenticated, isConversationLoaded, workspaceConversationId]);

  const handleRealtimeInvalidation = useCallback(
    async (conversationId?: string | null) => {
      if (realtimeBusyRef.current) {
        return;
      }

      realtimeBusyRef.current = true;
      try {
        await refreshQueueData();
        if (workspaceConversationId && (!conversationId || conversationId === workspaceConversationId)) {
          await refreshSelectedConversation();
        }
      } catch (error) {
        setOperationError(
          error instanceof Error ? error.message : "Realtime updates are temporarily unavailable."
        );
      } finally {
        realtimeBusyRef.current = false;
      }
    },
    [refreshQueueData, refreshSelectedConversation, workspaceConversationId]
  );

  useRealtimeInvalidation({
    enabled: authSession.authenticated && isOnline,
    debounceMs: 250,
    onInvalidate: (payload) => {
      void handleRealtimeInvalidation(payload.conversationId);
    },
    onHeartbeat: () => {
      void handleRealtimeInvalidation();
    },
    onError: () => {
      setOperationError("Realtime updates are temporarily unavailable.");
    }
  });

  useEffect(() => {
    if (!authSession.authenticated) {
      return;
    }

    return subscribeDashboardSyncEvents((event) => {
      if (event.type === "handoff-resolved" && event.requestId === selectedActiveRequestId) {
        setWorkspaceHint("This handoff was resolved in another tab.");
      }
      void refreshQueueDataSafely();
      if (event.conversationId === workspaceConversationId) {
        void refreshSelectedConversationSafely();
      }
    });
  }, [
    authSession.authenticated,
    refreshQueueDataSafely,
    refreshSelectedConversationSafely,
    selectedActiveRequestId,
    workspaceConversationId
  ]);

  const openWorkspaceTab = useCallback(
    (requestId: string, conversationId: string) => {
      if (typeof window === "undefined") {
        return;
      }

      const workspaceUrl = `${window.location.origin}/handoff/${encodeURIComponent(
        requestId
      )}?conversationId=${encodeURIComponent(conversationId)}`;
      const opened = window.open(workspaceUrl, "_blank");
      if (!opened) {
        setOperationError("Your browser blocked opening a new tab. Allow popups and try again.");
      }
    },
    []
  );

  const claimChat = useCallback(
    async (ticketId: string) => {
      if (!authSession.authenticated || !authSession.user) {
        return;
      }
      if (claimPendingTicketId) {
        return;
      }
      if (!isOnline) {
        setOperationError("Go online before claiming new requests.");
        return;
      }

      const queueRecord = queueRecords.find((item) => item.requestId === ticketId);
      if (!queueRecord) {
        setOperationError("This queue request is no longer available.");
        return;
      }

      try {
        setClaimPendingTicketId(ticketId);
        const result = await claimHandoffApi({
          requestId: queueRecord.requestId,
          representative: {
            id: authSession.user.id,
            name: authSession.user.name,
            avatarUrl: authSession.user.avatarUrl ?? undefined
          }
        });
        publishDashboardSyncEvent({
          type: "handoff-claimed",
          requestId: result.queue.requestId,
          conversationId: result.thread.id,
          timestamp: new Date().toISOString()
        });
        await refreshQueueData();
        setSelectedActiveRequestId(result.queue.requestId);
        setWorkspaceHint("Handoff claimed. It is now loaded in the active workspace.");
      } catch (error) {
        setOperationError(error instanceof Error ? error.message : "Unable to claim this handoff.");
      } finally {
        setClaimPendingTicketId(null);
      }
    },
    [
      authSession.authenticated,
      authSession.user,
      claimPendingTicketId,
      isOnline,
      queueRecords,
      refreshQueueData
    ]
  );

  const selectActiveChat = useCallback(
    (ticketId: string) => {
      const queueRecord = activeByRequestId.get(ticketId);
      if (!queueRecord) {
        setOperationError("Unable to load chat. The request is no longer active.");
        return;
      }

      setSelectedActiveRequestId(queueRecord.requestId);
      setOperationError(null);
      setWorkspaceHint(null);
    },
    [activeByRequestId]
  );

  const splitChatFromCard = useCallback(
    (ticketId: string) => {
      const queueRecord = queueRecords.find((item) => item.requestId === ticketId);
      if (!queueRecord) {
        setOperationError("Unable to split chat. The request is no longer available.");
        return;
      }

      if (
        !isAdminLike &&
        queueRecord.claimedByAuthUserId &&
        queueRecord.claimedByAuthUserId !== agentId
      ) {
        setOperationError("This handoff is assigned to another representative.");
        return;
      }

      openWorkspaceTab(queueRecord.requestId, queueRecord.conversationId);
    },
    [agentId, isAdminLike, openWorkspaceTab, queueRecords]
  );

  const sendRepMessage = useCallback(async () => {
    if (
      !authSession.authenticated ||
      !authSession.user ||
      !workspaceConversationId ||
      !canInteract ||
      sendPending
    ) {
      return;
    }

    const messageText = normalizeDraft(replyDraft);
    if (!messageText) {
      return;
    }

    publishRepresentativeTyping(workspaceConversationId, false, true);

    try {
      setSendPending(true);
      const result = await createRepresentativeMessageApi({
        conversationId: workspaceConversationId,
        text: messageText,
        representativeId: authSession.user.id,
        clientMessageId: generateClientMessageId()
      });
      setConversation((current) => appendTimelineMessage(current, result.message));
      setReplyDraft("");
      setOperationError(null);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Unable to send message.");
    } finally {
      setSendPending(false);
    }
  }, [
    authSession.authenticated,
    authSession.user,
    canInteract,
    publishRepresentativeTyping,
    replyDraft,
    sendPending,
    workspaceConversationId
  ]);

  const addComposerNote = useCallback(async () => {
    if (!authSession.authenticated || !workspaceConversationId || !canInteract || notePending) {
      return;
    }

    const noteBody = normalizeDraft(noteDraft);
    if (!noteBody) {
      return;
    }

    try {
      setNotePending(true);
      const result = await createSupportNoteApi(workspaceConversationId, { body: noteBody });
      setHistoryNotes((current) => [mapSupportAgentNoteToHistoryNote(result.note), ...current]);
      setNoteDraft("");
      setOperationError(null);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Unable to save support note.");
    } finally {
      setNotePending(false);
    }
  }, [authSession.authenticated, canInteract, noteDraft, notePending, workspaceConversationId]);

  const resolveSelectedChat = async () => {
    if (!authSession.authenticated || !workspaceConversationId || !canInteract || resolvePending) {
      return;
    }

    setResolvePending(true);
    try {
      const result = await resolveHandoffApi({ conversationId: workspaceConversationId });
      setConversation(result.thread);
      publishDashboardSyncEvent({
        type: "handoff-resolved",
        requestId: selectedQueueRecord?.requestId ?? "",
        conversationId: workspaceConversationId,
        timestamp: new Date().toISOString()
      });
      await refreshQueueData();
      setWorkspaceHint("Handoff resolved and moved to the Resolved page.");
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Unable to resolve this handoff.");
    } finally {
      setResolvePending(false);
    }
  };

  const handleUseAvaSuggestion = useCallback(() => {
    if (!avaSuggestion.suggestionText) {
      return;
    }
    setComposeMode("reply");
    setReplyDraft(avaSuggestion.suggestionText);
  }, [avaSuggestion.suggestionText]);

  const handleComposeValueChange = useCallback(
    (value: string) => {
      if (composeMode === "reply") {
        setReplyDraft(value);
        return;
      }
      setNoteDraft(value);
    },
    [composeMode]
  );

  const handleSubmitCompose = useCallback(() => {
    if (composeMode === "reply") {
      void sendRepMessage();
      return;
    }
    void addComposerNote();
  }, [addComposerNote, composeMode, sendRepMessage]);

  const signOutAgent = async () => {
    if (signOutPending) {
      return;
    }

    setSignOutPending(true);
    try {
      if (typeof window !== "undefined") {
        await logoutAuthSession();
        const returnTo = `${window.location.origin}/`;
        window.location.replace(buildAuthLoginUrl(returnTo, { logout: true }));
        return;
      }
      router.replace("/");
    } finally {
      setSignOutPending(false);
    }
  };

  return (
    <div className={`rep-shell${isNavCollapsed ? " primary-collapsed" : ""}`}>
      <AppSideRail
        userName={authSession.user?.name}
        userAvatarUrl={agentAvatarUrl}
        userRole={toRoleLabel(authSession.role)}
        authRole={authSession.role}
        userType={authSession.userType}
        canAccessCustomerPortal={Boolean(
          authSession.access?.isAdmin || authSession.access?.isSuperAdmin
        )}
        signOutPending={signOutPending}
        onCollapsedChange={setIsNavCollapsed}
        onSignOut={() => {
          void signOutAgent();
        }}
      />

      <section className="rep-main-shell">
        <AvaSecondaryNav
          activeRoute="dashboard"
          canAccessManagerViews={canAccessAvaManagerViews(authSession.role, authSession.access)}
          trailingContent={
            <div className="rep-secondary-nav-presence">
              <div className="rep-secondary-nav-status">
                <span className={`online-dot ${isOnline ? "is-online" : "is-offline"}`} aria-hidden />
                <div className="rep-secondary-nav-status-copy">
                  <strong>{isOnline ? "Online" : "Offline"}</strong>
                  <span>{activeChatSummary}</span>
                </div>
              </div>
              <button
                type="button"
                className={`rep-secondary-nav-toggle ${isOnline ? "online" : "offline"}`}
                onClick={() => {
                  void handleToggleOnline();
                }}
                aria-pressed={isOnline}
                disabled={presenceSyncing}
              >
                <span className="rep-secondary-nav-toggle-icon" aria-hidden="true">
                  <SecondaryNavToggleIcon />
                </span>
                {presenceSyncing ? "Updating..." : isOnline ? "Go Offline" : "Go Online"}
              </button>
            </div>
          }
        />
        {activeHintToast ? (
          <div className="rep-shell-toast-layer" aria-live="polite" aria-atomic="true">
            <p className="rep-shell-toast" role="status">
              {activeHintToast.message}
            </p>
          </div>
        ) : null}
        <div className="rep-main-scroll">
        {operationError ? (
          <p className="rep-shell-error" role="alert">
            {operationError}
          </p>
        ) : null}

        <div className="dashboard-board-layout">
          <div className={`dashboard-queue-pane${isOnline ? "" : " is-offline"}`}>
            <QueueBoardColumns
              pendingQueue={pendingQueue}
              activeQueue={activeQueue}
              currentAgentId={agentId}
              selectedActiveTicketId={selectedQueueRecord?.requestId ?? null}
              claimPendingTicketId={claimPendingTicketId}
              onClaimChat={claimChat}
              onSelectActiveChat={selectActiveChat}
              onSplitChat={splitChatFromCard}
            />
          </div>

          <div className={`dashboard-inline-workspace${isOnline ? "" : " is-offline"}`}>
            <div className="workspace-status-bar dashboard-workspace-status-bar">
              {selectedQueueRecord ? (
                <>
                  <div className="dashboard-workspace-status-selected">
                    <span
                      className={`dashboard-workspace-status-avatar ${
                        activeTicket?.chipTone === "blue" ? "is-blue" : "is-pink"
                      }`}
                      aria-hidden="true"
                    >
                      {activeTicket?.initials ?? "CU"}
                    </span>
                    <strong className="dashboard-workspace-status-name">
                      {activeTicket?.fullName ?? "No active chat selected"}
                    </strong>
                    <span className="dashboard-workspace-status-timer">{workspaceTimerLabel}</span>
                  </div>
                  <div className="workspace-status-actions">
                    <HandoffTransferControls
                      requestId={selectedQueueRecord.requestId}
                      currentAgentId={agentId}
                      pendingTransfer={pendingTransfer}
                      canRequestTransfer={canRequestTransfer}
                      onAfterMutation={async (message) => {
                        await Promise.all([refreshQueueData(), refreshSelectedConversation()]);
                        setWorkspaceHint(message);
                      }}
                    />
                    <button
                      type="button"
                      className="workspace-resolve-button"
                      onClick={() => {
                        void resolveSelectedChat();
                      }}
                      disabled={!canInteract || resolvePending}
                    >
                      {resolvePending ? (
                        <>
                          <span className="inline-button-spinner" aria-hidden="true" />
                          Resolving...
                        </>
                      ) : (
                        "RESOLVE & CLOSE"
                      )}
                    </button>
                    <span className="dashboard-workspace-more" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="dashboard-workspace-status-selected is-placeholder">
                    <span className="dashboard-workspace-status-avatar is-empty" aria-hidden="true">
                      -
                    </span>
                    <strong className="dashboard-workspace-status-name is-placeholder">Customer</strong>
                    <span className="dashboard-workspace-status-timer is-placeholder">0:00</span>
                  </div>
                  <div className="workspace-status-actions is-disabled" aria-hidden="true">
                    <button type="button" className="workspace-handoff-button is-disabled" disabled tabIndex={-1}>
                      <span>Handoff</span>
                      <span className="workspace-handoff-button-icon">
                        <svg viewBox="0 0 15 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M1.25 6.5H12.35M12.35 6.5L8.95 3.1M12.35 6.5L8.95 9.9"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="workspace-resolve-button is-disabled"
                      disabled
                      tabIndex={-1}
                    >
                      RESOLVE & CLOSE
                    </button>
                    <span className="dashboard-workspace-more is-disabled">
                      <span />
                      <span />
                      <span />
                    </span>
                  </div>
                </>
              )}
            </div>

            {!selectedQueueRecord ? (
              <div className="dashboard-no-chat-workspace">
                <div className="dashboard-no-chat-timeline">
                  <div className="dashboard-no-chat-indicator">
                    <span className="dashboard-no-chat-indicator-icon" aria-hidden="true">
                      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M6 10L10 6M11.333 8C11.333 9.841 9.841 11.333 8 11.333C6.159 11.333 4.667 9.841 4.667 8C4.667 6.159 6.159 4.667 8 4.667"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <p>No chat selected</p>
                  </div>
                </div>
                <div className="dashboard-no-chat-compose">
                  <div className="dashboard-no-chat-compose-card">
                    <div className="dashboard-no-chat-compose-copy">
                      <div className="dashboard-no-chat-compose-tabs" aria-hidden="true">
                        <span className="is-active">Reply</span>
                        <span>Note</span>
                      </div>
                      <p>Write your message here...</p>
                    </div>
                    <div className="dashboard-no-chat-compose-footer">
                      <span className="dashboard-no-chat-compose-attachment" aria-hidden="true">
                        <svg viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M2.5 15.25V6.5C2.5 5.948 2.948 5.5 3.5 5.5H11.25L15.5 9.75V15.25C15.5 15.802 15.052 16.25 14.5 16.25H3.5C2.948 16.25 2.5 15.802 2.5 15.25Z"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M11.25 5.5V9C11.25 9.414 11.586 9.75 12 9.75H15.5"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M6 13.25L7.5 11.75L9.25 13.5L11.75 11"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M16.75 3.75V7.25M15 5.5H18.5"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                      <span className="dashboard-no-chat-compose-send" aria-hidden="true">
                        <svg viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="15" cy="15" r="15" fill="currentColor" />
                          <path
                            d="M15 20V10M15 10L10.75 14.25M15 10L19.25 14.25"
                            stroke="#ffffff"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rep-workspace-columns dashboard-inline-columns">
                <ChatColumn
                  conversation={conversation}
                  activeTicket={activeTicket}
                  hasActiveChat={Boolean(activeTicket)}
                  hasPendingChats={pendingQueue.length > 0}
                  isOnline={isOnline}
                  isEmptyState={!isConversationLoaded}
                  composerLocked={!canInteract}
                  composerLockedReason={interactionLockReason}
                  composeMode={composeMode}
                  composeValue={composeValue}
                  showAvaSuggestion={avaSuggestion.hasPendingCustomerQuestion}
                  avaSuggestionText={avaSuggestion.suggestionText}
                  avaSuggestionLoading={avaSuggestion.isLoading}
                  avaSuggestionError={avaSuggestion.error}
                  showHeader={false}
                  agentInitials={agentInitials}
                  agentAvatarUrl={agentAvatarUrl}
                  submitPending={composerSubmitPending}
                  onComposeModeChange={setComposeMode}
                  onComposeValueChange={handleComposeValueChange}
                  onSubmitCompose={handleSubmitCompose}
                  onUseAvaSuggestion={handleUseAvaSuggestion}
                  onRefreshAvaSuggestion={avaSuggestion.refreshSuggestion}
                />

                <DetailColumn
                  activeTicket={activeTicket}
                  customerDetails={customerDetails}
                  customerDetailsLoading={customerDetailsLoading}
                  historyNotes={historyNotes}
                />
              </div>
            )}
          </div>
        </div>
        </div>
      </section>
    </div>
  );
}
