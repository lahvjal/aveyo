"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ConversationThread } from "@ava/chat-domain";
import { BrandLoader } from "@ava/ui";
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
  markHandoffCustomerReadApi,
  publishRepresentativeTypingApi,
  resolveHandoffApi,
  setSupportPresenceOfflineApi,
  type QueueRecord
} from "@/lib/dashboard-api";
import { useAvaReplySuggestion } from "@/lib/dashboard-ava-suggestion";
import { publishDashboardSyncEvent, subscribeDashboardSyncEvents } from "@/lib/dashboard-sync";
import { type CustomerPanelDetails, type HistoryNote, type Ticket } from "@/lib/dashboard-types";
import {
  useHandoffNotifications,
  useOpenConversationRegistration
} from "@/lib/use-handoff-notifications";
import { AppSideRail } from "@/components/app-side-rail";
import { AvaSecondaryNav } from "@/components/ava-secondary-nav";
import { ChatColumn, ChatComposer } from "./chat-column";
import { HandoffTransferControls } from "./handoff-transfer-controls";
import { InitialChip } from "./initial-chip";
import { QueueBoardColumns, type ActiveQueueSortOption } from "./queue-board-columns";
import { WorkspaceDetailsOverlay } from "./resolved-details-overlay";

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

function getActiveQueueSortTimestamp(record: QueueRecord) {
  return (
    parseIsoToMs(record.lastMessageAt) ??
    parseIsoToMs(record.claimedAt) ??
    parseIsoToMs(record.requestedAt) ??
    0
  );
}

function compareActiveQueueRecords(
  left: QueueRecord,
  right: QueueRecord,
  sort: ActiveQueueSortOption
) {
  if (sort === "unread") {
    const unreadDiff =
      Number(Boolean(right.hasUnreadCustomerReply)) - Number(Boolean(left.hasUnreadCustomerReply));
    if (unreadDiff !== 0) {
      return unreadDiff;
    }
  }

  const leftTimestamp = getActiveQueueSortTimestamp(left);
  const rightTimestamp = getActiveQueueSortTimestamp(right);
  if (sort === "oldest") {
    if (leftTimestamp !== rightTimestamp) {
      return leftTimestamp - rightTimestamp;
    }
    return left.requestedAt.localeCompare(right.requestedAt);
  }

  if (leftTimestamp !== rightTimestamp) {
    return rightTimestamp - leftTimestamp;
  }
  return right.requestedAt.localeCompare(left.requestedAt);
}

function getTransferPriorityForAgent(record: QueueRecord, currentAgentId: string | null) {
  const transferRequest = record.transferRequest;
  if (!transferRequest || !currentAgentId) {
    return 2;
  }
  if (transferRequest.target.id === currentAgentId) {
    return 0;
  }
  if (transferRequest.requestedBy.id === currentAgentId) {
    return 1;
  }
  return 2;
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
  const {
    permissionState,
    notificationsSupported,
    requestBrowserNotificationPermission,
    sendTestNotification,
    notifyNewPendingHandoffs,
    notifyUnreadActiveReplies,
    notifyTransferRequests
  } = useHandoffNotifications();
  const [queueRecords, setQueueRecords] = useState<QueueRecord[]>([]);
  const [selectedActiveRequestId, setSelectedActiveRequestId] = useState<string | null>(null);
  const [activeSelectionClearedByUser, setActiveSelectionClearedByUser] = useState(false);
  const [activeQueueSort, setActiveQueueSort] = useState<ActiveQueueSortOption>("unread");
  const [conversation, setConversation] = useState<ConversationThread>(seededConversation);
  const [composeMode, setComposeMode] = useState<"reply" | "note">("reply");
  const [replyDraft, setReplyDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [historyNotes, setHistoryNotes] = useState<HistoryNote[]>([]);
  const [historyNotesLoading, setHistoryNotesLoading] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<CustomerPanelDetails | null>(null);
  const [customerDetailsLoading, setCustomerDetailsLoading] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
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
  const unreadMarkTimerRef = useRef<number | null>(null);
  const lastUnreadReadKeyRef = useRef<string | null>(null);

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
    notifyNewPendingHandoffs(
      pendingRecords.map((record) => ({
        requestId: record.requestId,
        customerName: record.customerName
      }))
    );
  }, [notifyNewPendingHandoffs, pendingRecords]);

  const activeRecords = useMemo(
    () =>
      queueRecords
        .filter((item) => item.status === "active" || item.status === "claimed")
        .sort((left, right) => {
          const leftTransferPriority = getTransferPriorityForAgent(left, agentId);
          const rightTransferPriority = getTransferPriorityForAgent(right, agentId);
          if (leftTransferPriority !== rightTransferPriority) {
            return leftTransferPriority - rightTransferPriority;
          }
          return compareActiveQueueRecords(left, right, activeQueueSort);
        }),
    [activeQueueSort, agentId, queueRecords]
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
  useEffect(() => {
    notifyUnreadActiveReplies({
      activeChats: activeRecords.map((record) => ({
        requestId: record.requestId,
        conversationId: record.conversationId,
        customerName: record.customerName,
        claimedByAuthUserId: record.claimedByAuthUserId,
        hasUnreadCustomerReply: record.hasUnreadCustomerReply,
        lastMessageAt: record.lastMessageAt
      })),
      currentAgentId: agentId,
      selectedConversationId: workspaceConversationId
    });
  }, [activeRecords, agentId, notifyUnreadActiveReplies, workspaceConversationId]);
  useEffect(() => {
    notifyTransferRequests({
      activeChats: activeRecords.map((record) => ({
        requestId: record.requestId,
        conversationId: record.conversationId,
        customerName: record.customerName,
        claimedByAuthUserId: record.claimedByAuthUserId,
        hasUnreadCustomerReply: record.hasUnreadCustomerReply,
        lastMessageAt: record.lastMessageAt,
        transferRequest: record.transferRequest
      })),
      currentAgentId: agentId,
      selectedConversationId: workspaceConversationId
    });
  }, [activeRecords, agentId, notifyTransferRequests, workspaceConversationId]);
  useOpenConversationRegistration(workspaceConversationId);
  const showNotificationPermissionPrompt =
    permissionState === "default" || permissionState === "denied";
  const showNotificationStatusCard = permissionState === "granted" || permissionState === "unsupported";
  const isConversationLoaded = Boolean(
    workspaceConversationId &&
      conversation.id === workspaceConversationId &&
      conversation.id !== seededConversation.id
  );
  const isAssignedToCurrentAgent =
    !selectedQueueRecord?.claimedByAuthUserId || selectedQueueRecord.claimedByAuthUserId === agentId;
  const requestResolved = selectedQueueRecord?.status === "resolved";
  const isTransferTarget = selectedQueueRecord?.transferRequest?.target.id === agentId;
  const canComposeNotes = Boolean(workspaceConversationId) && !requestResolved;
  const canInteract =
    Boolean(workspaceConversationId) && (isAssignedToCurrentAgent || isAdminLike) && !requestResolved;
  const forceNoteOnlyComposer = canComposeNotes && !canInteract;
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
  const canOpenDetailsPanel = Boolean(selectedQueueRecord) && isConversationLoaded;
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

  useEffect(() => {
    if (forceNoteOnlyComposer && composeMode !== "note") {
      setComposeMode("note");
    }
  }, [composeMode, forceNoteOnlyComposer]);

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
  const noChatComposeHelper = useMemo(() => {
    if (!isOnline) {
      return "You're offline. Go online to start new conversations.";
    }
    if (composeMode === "note") {
      if (activeQueue.length > 0) {
        return "Select an active chat to add internal notes.";
      }
      if (pendingQueue.length > 0) {
        return "Claim a chat to add internal notes.";
      }
      return "Internal notes unlock when a conversation becomes active.";
    }
    if (activeQueue.length > 0) {
      return "Select an active chat to unlock messaging.";
    }
    if (pendingQueue.length > 0) {
      return "Claim a chat from the queue to unlock messaging.";
    }
    return "Messaging unlocks when a conversation becomes active.";
  }, [activeQueue.length, composeMode, isOnline, pendingQueue.length]);
  const noChatComposePlaceholder = useMemo(() => {
    if (!isOnline) {
      return composeMode === "note"
        ? "Go online and select a chat to add internal notes."
        : "Go online and select a chat to send messages.";
    }
    if (composeMode === "note") {
      return activeQueue.length > 0
        ? "Select an active chat to add internal notes."
        : "Claim a chat to add internal notes.";
    }
    return activeQueue.length > 0
      ? "Select an active chat to send messages."
      : "Claim a chat to send messages.";
  }, [activeQueue.length, composeMode, isOnline, pendingQueue.length]);
  const showNoChatLoadingState = activeQueue.length > 0 && !activeSelectionClearedByUser;

  const enqueueHintToast = useCallback((message: string) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return;
    }
    nextHintToastIdRef.current += 1;
    const toastId = nextHintToastIdRef.current;
    setHintToastQueue((current) => [...current, { id: toastId, message: trimmedMessage }]);
  }, []);

  const handleSendTestNotification = useCallback(() => {
    const result = sendTestNotification();
    if (result.ok) {
      enqueueHintToast(
        "Test notification sent. If no desktop alert appears, check your browser site settings and macOS notification settings."
      );
      return;
    }

    if (result.reason === "permission") {
      enqueueHintToast("Browser notifications are not enabled for Ava yet.");
      return;
    }

    if (result.reason === "unsupported") {
      enqueueHintToast("This browser session does not support desktop notifications.");
      return;
    }

    enqueueHintToast("The browser could not create a desktop notification.");
  }, [enqueueHintToast, sendTestNotification]);

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
      setActiveSelectionClearedByUser(false);
      return;
    }

    const activeRequestIds = new Set(activeRecords.map((record) => record.requestId));
    setSelectedActiveRequestId((current) => {
      if (current && activeRequestIds.has(current)) {
        return current;
      }

      if (activeSelectionClearedByUser) {
        return null;
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
  }, [activeRecords, activeSelectionClearedByUser, agentId, isAdminLike]);

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
    const assignedToCurrentAgent =
      Boolean(selectedQueueRecord?.claimedByAuthUserId) &&
      selectedQueueRecord?.claimedByAuthUserId === authSession.user?.id;
    if (
      !authSession.authenticated ||
      !selectedQueueRecord ||
      !isConversationLoaded ||
      !selectedQueueRecord.hasUnreadCustomerReply ||
      !assignedToCurrentAgent
    ) {
      return;
    }

    const markReadKey = `${selectedQueueRecord.requestId}:${selectedQueueRecord.lastMessageAt ?? "none"}`;
    if (lastUnreadReadKeyRef.current === markReadKey) {
      return;
    }

    let cancelled = false;
    const clearUnreadTimer = () => {
      if (unreadMarkTimerRef.current !== null) {
        window.clearTimeout(unreadMarkTimerRef.current);
        unreadMarkTimerRef.current = null;
      }
    };
    const canMarkReadNow = () =>
      typeof document !== "undefined" &&
      document.visibilityState === "visible" &&
      document.hasFocus();

    const runMarkRead = async () => {
      if (!canMarkReadNow()) {
        return;
      }
      try {
        await markHandoffCustomerReadApi({ requestId: selectedQueueRecord.requestId });
        if (cancelled) {
          return;
        }
        lastUnreadReadKeyRef.current = markReadKey;
        await refreshQueueDataSafely();
      } catch {
        // Best-effort read marker; preserve unread if request fails.
      }
    };

    const scheduleMarkRead = () => {
      clearUnreadTimer();
      if (!canMarkReadNow()) {
        return;
      }
      unreadMarkTimerRef.current = window.setTimeout(() => {
        unreadMarkTimerRef.current = null;
        void runMarkRead();
      }, 650);
    };

    const handleVisibilityOrFocus = () => {
      if (!cancelled) {
        scheduleMarkRead();
      }
    };

    scheduleMarkRead();
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      cancelled = true;
      clearUnreadTimer();
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [
    authSession.authenticated,
    authSession.user?.id,
    isConversationLoaded,
    refreshQueueDataSafely,
    selectedQueueRecord
  ]);

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
    setHistoryNotesLoading(false);
    setCustomerDetails(null);
    setCustomerDetailsLoading(false);
    setIsDetailsPanelOpen(false);

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
      setHistoryNotesLoading(false);
      return;
    }

    let cancelled = false;
    setHistoryNotesLoading(true);
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
      } finally {
        if (!cancelled) {
          setHistoryNotesLoading(false);
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

  useEffect(() => {
    if (!isDetailsPanelOpen || typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDetailsPanelOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDetailsPanelOpen]);

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
        setActiveSelectionClearedByUser(false);
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

      if (selectedActiveRequestId === queueRecord.requestId) {
        setSelectedActiveRequestId(null);
        setActiveSelectionClearedByUser(true);
        setOperationError(null);
        setWorkspaceHint(null);
        return;
      }

      setActiveSelectionClearedByUser(false);
      setSelectedActiveRequestId(queueRecord.requestId);
      setOperationError(null);
      setWorkspaceHint(null);
    },
    [activeByRequestId, selectedActiveRequestId]
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
    if (!authSession.authenticated || !workspaceConversationId || !canComposeNotes || notePending) {
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
  }, [authSession.authenticated, canComposeNotes, noteDraft, notePending, workspaceConversationId]);

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
    if (forceNoteOnlyComposer) {
      void addComposerNote();
      return;
    }
    if (composeMode === "reply") {
      void sendRepMessage();
      return;
    }
    void addComposerNote();
  }, [addComposerNote, composeMode, forceNoteOnlyComposer, sendRepMessage]);

  const signOutAgent = async () => {
    if (signOutPending) {
      return;
    }

    setSignOutPending(true);
    try {
      if (typeof window !== "undefined") {
        await setSupportPresenceOfflineApi().catch(() => null);
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
        {showNotificationPermissionPrompt ? (
          <div className="rep-shell-permission-card" role="status">
            <div className="rep-shell-permission-copy">
              <strong>Turn on browser notifications</strong>
              <p>
                {permissionState === "default"
                  ? "Allow notifications so Ava can alert you about new handoffs, transfer requests, and unread customer replies."
                  : "Notifications are currently blocked. Enable them in your browser site settings so Ava can alert you about active chats."}
              </p>
            </div>
            {permissionState === "default" ? (
              <button
                type="button"
                className="workspace-nav-button rep-shell-permission-action"
                onClick={() => {
                  void requestBrowserNotificationPermission();
                }}
              >
                Allow notifications
              </button>
            ) : null}
          </div>
        ) : null}
        {showNotificationStatusCard ? (
          <div className="rep-shell-permission-card is-status" role="status">
            <div className="rep-shell-permission-copy">
              <strong>
                {permissionState === "granted"
                  ? "Browser notifications are on"
                  : "Browser notifications are unavailable"}
              </strong>
              <p>
                {permissionState === "granted"
                  ? "Use the test button to confirm your browser and desktop are showing Ava alerts."
                  : notificationsSupported
                    ? "Notifications are not available in this browser session."
                    : "This browser session does not support the Notification API."}
              </p>
            </div>
            {permissionState === "granted" ? (
              <button
                type="button"
                className="workspace-nav-button rep-shell-permission-action"
                onClick={() => {
                  handleSendTestNotification();
                }}
              >
                Send test notification
              </button>
            ) : null}
          </div>
        ) : null}
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
              activeSort={activeQueueSort}
              currentAgentId={agentId}
              selectedActiveTicketId={selectedQueueRecord?.requestId ?? null}
              claimPendingTicketId={claimPendingTicketId}
              onClaimChat={claimChat}
              onActiveSortChange={setActiveQueueSort}
              onSelectActiveChat={selectActiveChat}
              onSplitChat={splitChatFromCard}
            />
          </div>

          <div className={`dashboard-inline-workspace${isOnline ? "" : " is-offline"}`}>
            <div className="workspace-status-bar dashboard-workspace-status-bar">
              {selectedQueueRecord ? (
                <>
                  <div className="dashboard-workspace-status-selected">
                    <InitialChip
                      initials={activeTicket?.initials ?? "CU"}
                      tone={activeTicket?.chipTone ?? "sand"}
                      size={46}
                    />
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
                    <button
                      type="button"
                      className={`dashboard-workspace-more workspace-details-toggle${
                        canOpenDetailsPanel ? "" : " is-disabled"
                      }`}
                      aria-label={isDetailsPanelOpen ? "Hide details panel" : "Show details panel"}
                      aria-controls="workspace-details-panel"
                      aria-expanded={isDetailsPanelOpen}
                      disabled={!canOpenDetailsPanel}
                      onClick={() => {
                        setIsDetailsPanelOpen((current) => !current);
                      }}
                    >
                      <span />
                      <span />
                      <span />
                    </button>
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
                  <div className="workspace-status-actions is-disabled">
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
                    <button
                      type="button"
                      className="dashboard-workspace-more workspace-details-toggle is-disabled"
                      aria-label="Show details panel"
                      aria-controls="workspace-details-panel"
                      aria-expanded="false"
                      disabled
                      tabIndex={-1}
                    >
                      <span />
                      <span />
                      <span />
                    </button>
                  </div>
                </>
              )}
            </div>

            {!selectedQueueRecord ? (
              <div className="dashboard-no-chat-workspace">
                <div className="dashboard-no-chat-timeline">
                  <div
                    className={`dashboard-no-chat-indicator${
                        showNoChatLoadingState ? " is-loading" : ""
                    }`}
                  >
                      {showNoChatLoadingState ? (
                      <>
                        <BrandLoader size={34} tone="dark" label="Loading chat" />
                        <p>Loading chat</p>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
                <div className="dashboard-no-chat-compose uses-real-composer">
                  <ChatComposer
                    composeMode={composeMode}
                    composeValue=""
                    composePlaceholder={noChatComposePlaceholder}
                    composeHelper={noChatComposeHelper}
                    submitAriaLabel={composeMode === "note" ? "Save note" : "Send message"}
                    composerDisabled
                    onComposeModeChange={setComposeMode}
                    onComposeValueChange={handleComposeValueChange}
                    onSubmitCompose={handleSubmitCompose}
                  />
                </div>
              </div>
            ) : (
              <>
                <ChatColumn
                  conversation={conversation}
                  activeTicket={activeTicket}
                  hasActiveChat={Boolean(activeTicket)}
                  hasPendingChats={pendingQueue.length > 0}
                  isOnline={isOnline}
                  isEmptyState={!isConversationLoaded}
                  composerLocked={!canComposeNotes}
                  composerLockedReason={interactionLockReason}
                  composeMode={composeMode}
                  composeValue={composeValue}
                  composeModeLocked={forceNoteOnlyComposer}
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

                {isDetailsPanelOpen ? (
                  <WorkspaceDetailsOverlay
                    activeTicket={activeTicket}
                    customerDetails={customerDetails}
                    customerDetailsLoading={customerDetailsLoading}
                    historyNotes={historyNotes}
                    historyNotesLoading={historyNotesLoading}
                    onClose={() => {
                      setIsDetailsPanelOpen(false);
                    }}
                  />
                ) : null}
              </>
            )}
          </div>
        </div>
        </div>
      </section>
    </div>
  );
}
