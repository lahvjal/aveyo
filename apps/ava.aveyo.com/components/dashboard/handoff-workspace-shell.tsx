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
import {
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
import { ChatColumn } from "./chat-column";
import { DetailColumn } from "./detail-column";
import { HandoffTransferControls } from "./handoff-transfer-controls";
import { InitialChip } from "./initial-chip";

interface HandoffWorkspaceShellProps {
  requestId: string;
  initialConversationId?: string | null;
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

export function HandoffWorkspaceShell({
  requestId,
  initialConversationId
}: HandoffWorkspaceShellProps) {
  const router = useRouter();
  const authSession = useAuthSession();
  const seededConversation = useMemo(() => createEmptyConversation(), []);
  const {
    permissionState,
    notificationsSupported,
    requestBrowserNotificationPermission,
    sendTestNotification,
    notifyTransferRequests
  } = useHandoffNotifications();

  const [queueRecord, setQueueRecord] = useState<QueueRecord | null>(null);
  const [conversation, setConversation] = useState<ConversationThread>(seededConversation);
  const [composeMode, setComposeMode] = useState<"reply" | "note">("reply");
  const [replyDraft, setReplyDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [historyNotes, setHistoryNotes] = useState<HistoryNote[]>([]);
  const [customerDetails, setCustomerDetails] = useState<CustomerPanelDetails | null>(null);
  const [customerDetailsLoading, setCustomerDetailsLoading] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [closeHint, setCloseHint] = useState<string | null>(null);
  const [sendPending, setSendPending] = useState(false);
  const [notePending, setNotePending] = useState(false);
  const [resolvePending, setResolvePending] = useState(false);
  const [signOutPending, setSignOutPending] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);
  const realtimeBusyRef = useRef(false);
  const closingTabRef = useRef(false);
  const representativeTypingSentRef = useRef(false);
  const representativeTypingConversationRef = useRef<string | null>(null);
  const representativeTypingLastSentAtMsRef = useRef(0);
  const unreadMarkTimerRef = useRef<number | null>(null);
  const lastUnreadReadKeyRef = useRef<string | null>(null);

  const workspaceConversationId = queueRecord?.conversationId ?? initialConversationId ?? null;
  useOpenConversationRegistration(workspaceConversationId);
  const showNotificationPermissionPrompt =
    permissionState === "default" || permissionState === "denied";
  const showNotificationStatusCard = permissionState === "granted" || permissionState === "unsupported";
  const isConversationLoaded = conversation.id !== seededConversation.id;
  const isAdminLike = authSession.role === "super_admin";
  const isAssignedToCurrentAgent =
    !queueRecord?.claimedByAuthUserId || queueRecord.claimedByAuthUserId === authSession.user?.id;
  const requestResolved = queueRecord?.status === "resolved";
  const isTransferTarget = queueRecord?.transferRequest?.target.id === authSession.user?.id;
  const canComposeNotes = Boolean(workspaceConversationId) && !requestResolved;
  const canInteract = Boolean(workspaceConversationId) && (isAssignedToCurrentAgent || isAdminLike) && !requestResolved;
  const forceNoteOnlyComposer = canComposeNotes && !canInteract;
  const interactionLockReason = !isAssignedToCurrentAgent
    ? isTransferTarget
      ? "This handoff stays with the current representative until you accept the transfer."
      : "This handoff is assigned to another representative."
    : requestResolved
      ? "This handoff has already been resolved."
      : undefined;
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
  const activeTicket = useMemo<Ticket | null>(() => {
    if (!queueRecord) {
      return null;
    }
    return createTicketFromQueueRecord(queueRecord, conversation);
  }, [conversation, queueRecord]);
  const pendingTransfer = queueRecord?.transferRequest ?? activeTicket?.transferRequest;
  const canRequestTransfer =
    Boolean(queueRecord) &&
    queueRecord?.claimedByAuthUserId === authSession.user?.id &&
    queueRecord?.status !== "resolved" &&
    !pendingTransfer;
  const agentAvatarUrl = authSession.user?.avatarUrl ?? null;
  const composeValue = composeMode === "reply" ? replyDraft : noteDraft;
  const composerSubmitPending = composeMode === "reply" ? sendPending : notePending;

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

  const handleSendTestNotification = useCallback(() => {
    const result = sendTestNotification();
    if (result.ok) {
      setCloseHint(
        "Test notification sent. If no desktop alert appears, check your browser site settings and macOS notification settings."
      );
      return;
    }

    if (result.reason === "permission") {
      setCloseHint("Browser notifications are not enabled for Ava yet.");
      return;
    }

    if (result.reason === "unsupported") {
      setCloseHint("This browser session does not support desktop notifications.");
      return;
    }

    setCloseHint("The browser could not create a desktop notification.");
  }, [sendTestNotification]);

  const notifyTransferRequestsFromQueue = useCallback(
    (queue: QueueRecord[]) => {
      notifyTransferRequests({
        activeChats: queue
          .filter((item) => item.status === "active" || item.status === "claimed")
          .map((item) => ({
            requestId: item.requestId,
            conversationId: item.conversationId,
            customerName: item.customerName,
            claimedByAuthUserId: item.claimedByAuthUserId,
            hasUnreadCustomerReply: item.hasUnreadCustomerReply,
            lastMessageAt: item.lastMessageAt,
            transferRequest: item.transferRequest
          })),
        currentAgentId: authSession.user?.id ?? null,
        selectedConversationId: workspaceConversationId
      });
    },
    [authSession.user?.id, notifyTransferRequests, workspaceConversationId]
  );

  const refreshWorkspaceData = useCallback(async () => {
    const queueResult = await listQueueApi({ resolvedScope: "all" });
    notifyTransferRequestsFromQueue(queueResult.queue);
    const matchedRecord = queueResult.queue.find((item) => item.requestId === requestId) ?? null;
    setQueueRecord(matchedRecord);

    const targetConversationId = matchedRecord?.conversationId ?? initialConversationId ?? null;
    if (!targetConversationId) {
      setConversation(seededConversation);
      setOperationError("This handoff could not be found.");
      return;
    }

    const conversationResult = await getConversationApi(targetConversationId);
    setConversation(conversationResult.conversation);
    setOperationError(null);
  }, [initialConversationId, notifyTransferRequestsFromQueue, requestId, seededConversation]);

  const refreshTransferNotifications = useCallback(async () => {
    const queueResult = await listQueueApi({ resolvedScope: "all" });
    notifyTransferRequestsFromQueue(queueResult.queue);
  }, [notifyTransferRequestsFromQueue]);

  const refreshWorkspaceDataSafely = useCallback(async () => {
    try {
      await refreshWorkspaceData();
    } catch (error) {
      if (closingTabRef.current) {
        return;
      }
      setOperationError(
        error instanceof Error ? error.message : "Unable to refresh handoff workspace."
      );
    }
  }, [refreshWorkspaceData]);

  useEffect(() => {
    if (authSession.loading) {
      return;
    }

    if (!authSession.authenticated) {
      setQueueRecord(null);
      setConversation(seededConversation);
      return;
    }

    let cancelled = false;
    const loadWorkspace = async () => {
      try {
        await refreshWorkspaceData();
      } catch (error) {
        if (!cancelled) {
          setOperationError(error instanceof Error ? error.message : "Unable to load handoff workspace.");
        }
      }
    };

    void loadWorkspace();
    return () => {
      cancelled = true;
    };
  }, [authSession.authenticated, authSession.loading, refreshWorkspaceData, seededConversation]);

  useEffect(() => {
    if (!authSession.authenticated) {
      return;
    }

    return subscribeDashboardSyncEvents((event) => {
      if (event.requestId !== requestId) {
        return;
      }
      if (closingTabRef.current) {
        return;
      }
      if (event.type === "handoff-resolved") {
        setCloseHint("This handoff was resolved in another tab.");
      }
      void refreshWorkspaceDataSafely();
    });
  }, [authSession.authenticated, refreshWorkspaceDataSafely, requestId]);

  const handleRealtimeInvalidation = useCallback(
    async (conversationId?: string | null) => {
      if (realtimeBusyRef.current) {
        return;
      }

      if (conversationId && workspaceConversationId && conversationId !== workspaceConversationId) {
        await refreshTransferNotifications();
        return;
      }

      realtimeBusyRef.current = true;
      try {
        await refreshWorkspaceData();
      } catch (error) {
        setOperationError(
          error instanceof Error ? error.message : "Realtime updates are temporarily unavailable."
        );
      } finally {
        realtimeBusyRef.current = false;
      }
    },
    [refreshTransferNotifications, refreshWorkspaceData, workspaceConversationId]
  );

  useRealtimeInvalidation({
    enabled: authSession.authenticated,
    debounceMs: 200,
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
    const assignedToCurrentAgent =
      Boolean(queueRecord?.claimedByAuthUserId) &&
      queueRecord?.claimedByAuthUserId === authSession.user?.id;
    if (
      !authSession.authenticated ||
      !queueRecord ||
      !isConversationLoaded ||
      !queueRecord.hasUnreadCustomerReply ||
      !assignedToCurrentAgent
    ) {
      return;
    }

    const markReadKey = `${queueRecord.requestId}:${queueRecord.lastMessageAt ?? "none"}`;
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
        await markHandoffCustomerReadApi({ requestId: queueRecord.requestId });
        if (cancelled) {
          return;
        }
        lastUnreadReadKeyRef.current = markReadKey;
        await refreshWorkspaceDataSafely();
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
    queueRecord,
    refreshWorkspaceDataSafely
  ]);

  useEffect(() => {
    setComposeMode("reply");
    setReplyDraft("");
    setNoteDraft("");
  }, [workspaceConversationId]);

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

  const sendRepMessage = async () => {
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
  };

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

  const resolveChat = async () => {
    if (!authSession.authenticated || !workspaceConversationId || !canInteract || resolvePending) {
      return;
    }

    setResolvePending(true);
    try {
      const result = await resolveHandoffApi({ conversationId: workspaceConversationId });
      setConversation(result.thread);
      closingTabRef.current = true;
      publishDashboardSyncEvent({
        type: "handoff-resolved",
        requestId,
        conversationId: workspaceConversationId,
        timestamp: new Date().toISOString()
      });
      await refreshWorkspaceDataSafely();
      setCloseHint("Handoff resolved. Closing tab...");

      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          window.close();
          if (!window.closed) {
            closingTabRef.current = false;
            setCloseHint("Handoff resolved. This tab could not be closed automatically.");
          }
        }, 220);
      }
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Unable to resolve this handoff.");
    } finally {
      setResolvePending(false);
    }
  };

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

  const handleUseAvaSuggestion = useCallback(() => {
    if (!avaSuggestion.suggestionText) {
      return;
    }
    setComposeMode("reply");
    setReplyDraft(avaSuggestion.suggestionText);
  }, [avaSuggestion.suggestionText]);

  const handleSubmitCompose = () => {
    if (forceNoteOnlyComposer) {
      void addComposerNote();
      return;
    }
    if (composeMode === "reply") {
      void sendRepMessage();
      return;
    }
    void addComposerNote();
  };

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
        />
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
        {!operationError && closeHint ? (
          <p className="rep-shell-hint" role="status">
            {closeHint}
          </p>
        ) : null}

        <div className="workspace-status-bar">
          <div className="workspace-status-copy">
            {queueRecord ? (
              <div className="workspace-status-identity">
                <InitialChip initials={activeTicket?.initials ?? "CU"} tone={activeTicket?.chipTone ?? "sand"} size={46} />
                <div>
                  <strong>{activeTicket?.fullName ?? "No active chat selected"}</strong>
                  <small>
                    {pendingTransfer
                      ? `Request ${requestId} · ${formatStatusLabel(
                          queueRecord?.status
                        )} · Transfer requested ${
                          pendingTransfer.target.id === authSession.user?.id
                            ? "to you"
                            : `to ${pendingTransfer.target.name}`
                        }`
                      : `Request ${requestId} · ${formatStatusLabel(queueRecord?.status)}`}
                  </small>
                </div>
              </div>
            ) : (
              <>
                <strong>Request {requestId}</strong>
                <small>Status unavailable</small>
              </>
            )}
          </div>
          <div className="workspace-status-actions">
            <button
              type="button"
              className="workspace-nav-button"
              onClick={() => router.push("/")}
            >
              Back to Dashboard
            </button>
            {queueRecord ? (
              <HandoffTransferControls
                requestId={queueRecord.requestId}
                currentAgentId={authSession.user?.id ?? null}
                pendingTransfer={pendingTransfer}
                canRequestTransfer={canRequestTransfer}
                onAfterMutation={async (message) => {
                  await refreshWorkspaceDataSafely();
                  setCloseHint(message);
                }}
              />
            ) : null}
            <button
              type="button"
              className="workspace-resolve-button"
              onClick={resolveChat}
              disabled={!canInteract || resolvePending}
            >
              {resolvePending ? (
                <>
                  <span className="inline-button-spinner" aria-hidden="true" />
                  Resolving...
                </>
              ) : (
                "Resolve & Close"
              )}
            </button>
          </div>
        </div>

        {!workspaceConversationId ? (
          <div className="workspace-empty-state">
            <strong>Handoff not found</strong>
            <p>This request is no longer available.</p>
          </div>
        ) : (
          <div className="rep-workspace-columns">
            <ChatColumn
              conversation={conversation}
              activeTicket={activeTicket}
              hasActiveChat={Boolean(activeTicket)}
              hasPendingChats={false}
              isOnline
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

            <DetailColumn
              activeTicket={activeTicket}
              customerDetails={customerDetails}
              customerDetailsLoading={customerDetailsLoading}
              historyNotes={historyNotes}
            />
          </div>
        )}
        </div>
      </section>
    </div>
  );
}
