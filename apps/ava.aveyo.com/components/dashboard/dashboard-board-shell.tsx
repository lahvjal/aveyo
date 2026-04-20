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
  listSupportNotesApi,
  publishRepresentativeTypingApi,
  resolveHandoffApi,
  listQueueApi,
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

function formatStatusLabel(status: QueueRecord["status"] | undefined) {
  if (!status) {
    return "Unknown";
  }
  if (status === "active") {
    return "Active";
  }
  if (status === "claimed") {
    return "Claimed";
  }
  if (status === "pending") {
    return "Pending";
  }
  return "Resolved";
}

function generateClientMessageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function DashboardBoardShell() {
  const router = useRouter();
  const authSession = useAuthSession();
  const seededConversation = useMemo(() => createEmptyConversation(), []);

  const { isOnline, syncing: presenceSyncing, toggleOnline } = useSupportPresence(authSession);
  const { notifyNewPendingHandoffs } = useHandoffNotifications();
  const [queueRecords, setQueueRecords] = useState<QueueRecord[]>([]);
  const [selectedActiveRequestId, setSelectedActiveRequestId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationThread>(seededConversation);
  const [composeNote, setComposeNote] = useState("");
  const [sidebarNote, setSidebarNote] = useState("");
  const [historyNotes, setHistoryNotes] = useState<HistoryNote[]>([]);
  const [customerDetails, setCustomerDetails] = useState<CustomerPanelDetails | null>(null);
  const [customerDetailsLoading, setCustomerDetailsLoading] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [workspaceHint, setWorkspaceHint] = useState<string | null>(null);
  const [claimPendingTicketId, setClaimPendingTicketId] = useState<string | null>(null);
  const [sendPending, setSendPending] = useState(false);
  const [notePending, setNotePending] = useState(false);
  const [resolvePending, setResolvePending] = useState(false);
  const [signOutPending, setSignOutPending] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);
  const realtimeBusyRef = useRef(false);
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
  const canInteract =
    Boolean(workspaceConversationId) && (isAssignedToCurrentAgent || isAdminLike) && !requestResolved;
  const interactionLockReason = !selectedQueueRecord
    ? "Select an active chat to start messaging."
    : !isAssignedToCurrentAgent
      ? "This handoff is assigned to another representative."
      : requestResolved
        ? "This handoff has already been resolved."
        : undefined;
  const activeTicket = useMemo<Ticket | null>(() => {
    if (!selectedQueueRecord) {
      return null;
    }
    return createTicketFromQueueRecord(selectedQueueRecord, conversation);
  }, [conversation, selectedQueueRecord]);
  const agentInitials = getInitials(authSession.user?.name);
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
    setComposeNote("");
    setSidebarNote("");
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

    const hasDraft = Boolean(normalizeDraft(composeNote));
    publishRepresentativeTyping(workspaceConversationId, hasDraft);
  }, [
    authSession.authenticated,
    canInteract,
    composeNote,
    publishRepresentativeTyping,
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

    const messageText = normalizeDraft(composeNote);
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
      setComposeNote("");
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
    composeNote,
    publishRepresentativeTyping,
    sendPending,
    workspaceConversationId
  ]);

  const addSidebarNote = async () => {
    if (!authSession.authenticated || !workspaceConversationId || !canInteract || notePending) {
      return;
    }

    const noteBody = normalizeDraft(sidebarNote);
    if (!noteBody) {
      return;
    }

    try {
      setNotePending(true);
      const result = await createSupportNoteApi(workspaceConversationId, { body: noteBody });
      setHistoryNotes((current) => [mapSupportAgentNoteToHistoryNote(result.note), ...current]);
      setSidebarNote("");
      setOperationError(null);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Unable to save support note.");
    } finally {
      setNotePending(false);
    }
  };

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
    setComposeNote(avaSuggestion.suggestionText);
  }, [avaSuggestion.suggestionText]);

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
        />
        <div className="rep-main-scroll">
        {operationError ? (
          <p className="rep-shell-error" role="alert">
            {operationError}
          </p>
        ) : null}
        {!operationError && workspaceHint ? (
          <p className="rep-shell-hint" role="status">
            {workspaceHint}
          </p>
        ) : null}
        {!operationError && shellHintMessage ? (
          <p className="rep-shell-hint" role="status">
            {shellHintMessage}
          </p>
        ) : null}

        <div className="board-status-bar">
          <div className="status-block">
            <span className={`online-dot ${isOnline ? "is-online" : "is-offline"}`} aria-hidden />
            <div>
              <p>{isOnline ? "Online" : "Offline"}</p>
              <small>
                {activeQueue.length} active / {pendingQueue.length} pending
              </small>
            </div>
          </div>
          <button
            type="button"
            className={`offline-toggle ${isOnline ? "online" : "offline"}`}
            onClick={() => {
              void handleToggleOnline();
            }}
            aria-pressed={isOnline}
            disabled={presenceSyncing}
          >
            <span aria-hidden>{presenceSyncing ? "..." : "◉"}</span>{" "}
            {presenceSyncing ? "Updating..." : isOnline ? "Go Offline" : "Go Online"}
          </button>
        </div>

        <div className="dashboard-board-layout">
          <div className={`dashboard-queue-pane${isOnline ? "" : " is-offline"}`}>
            <QueueBoardColumns
              pendingQueue={pendingQueue}
              activeQueue={activeQueue}
              selectedActiveTicketId={selectedQueueRecord?.requestId ?? null}
              claimPendingTicketId={claimPendingTicketId}
              onClaimChat={claimChat}
              onSelectActiveChat={selectActiveChat}
              onSplitChat={splitChatFromCard}
            />
          </div>

          <div className={`dashboard-inline-workspace${isOnline ? "" : " is-offline"}`}>
            <div className="workspace-status-bar">
              <div className="workspace-status-copy">
                <strong>
                  {selectedQueueRecord ? `Request ${selectedQueueRecord.requestId}` : "No active chat selected"}
                </strong>
                <small>
                  {selectedQueueRecord
                    ? `Status: ${formatStatusLabel(selectedQueueRecord.status)}`
                    : "Select an active card to load chat and customer details."}
                </small>
              </div>
              <div className="workspace-status-actions">
                <button
                  type="button"
                  className="workspace-nav-button"
                  disabled={!selectedQueueRecord}
                  onClick={() => {
                    if (!selectedQueueRecord) {
                      return;
                    }
                    splitChatFromCard(selectedQueueRecord.requestId);
                  }}
                >
                  Split to tab
                </button>
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
                    "Resolve"
                  )}
                </button>
              </div>
            </div>

            {!selectedQueueRecord ? (
              <div className="workspace-empty-state">
                <strong>Active workspace appears here</strong>
                <p>Select an active request to review chat messages, notes, and customer details.</p>
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
                  composeNote={composeNote}
                  showAvaSuggestion={avaSuggestion.hasPendingCustomerQuestion}
                  avaSuggestionText={avaSuggestion.suggestionText}
                  avaSuggestionLoading={avaSuggestion.isLoading}
                  avaSuggestionError={avaSuggestion.error}
                  agentInitials={agentInitials}
                  agentAvatarUrl={agentAvatarUrl}
                  sendPending={sendPending}
                  onComposeNoteChange={setComposeNote}
                  onSendMessage={sendRepMessage}
                  onUseAvaSuggestion={handleUseAvaSuggestion}
                  onRefreshAvaSuggestion={avaSuggestion.refreshSuggestion}
                />

                <DetailColumn
                  activeTicket={activeTicket}
                  customerDetails={customerDetails}
                  customerDetailsLoading={customerDetailsLoading}
                  sidebarNote={sidebarNote}
                  historyNotes={historyNotes}
                  notesDisabled={!canInteract}
                  notesDisabledReason={interactionLockReason}
                  savePending={notePending}
                  onSidebarNoteChange={setSidebarNote}
                  onAddSidebarNote={() => {
                    void addSidebarNote();
                  }}
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
