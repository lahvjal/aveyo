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
  publishRepresentativeTypingApi,
  resolveHandoffApi,
  type QueueRecord
} from "@/lib/dashboard-api";
import { useAvaReplySuggestion } from "@/lib/dashboard-ava-suggestion";
import { publishDashboardSyncEvent, subscribeDashboardSyncEvents } from "@/lib/dashboard-sync";
import { type CustomerPanelDetails, type HistoryNote, type Ticket } from "@/lib/dashboard-types";
import { AppSideRail } from "@/components/app-side-rail";
import { AvaSecondaryNav } from "@/components/ava-secondary-nav";
import { ChatColumn } from "./chat-column";
import { DetailColumn } from "./detail-column";

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

  const [queueRecord, setQueueRecord] = useState<QueueRecord | null>(null);
  const [conversation, setConversation] = useState<ConversationThread>(seededConversation);
  const [composeNote, setComposeNote] = useState("");
  const [sidebarNote, setSidebarNote] = useState("");
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

  const workspaceConversationId = queueRecord?.conversationId ?? initialConversationId ?? null;
  const isConversationLoaded = conversation.id !== seededConversation.id;
  const isAdminLike = authSession.role === "super_admin";
  const isAssignedToCurrentAgent =
    !queueRecord?.claimedByAuthUserId || queueRecord.claimedByAuthUserId === authSession.user?.id;
  const requestResolved = queueRecord?.status === "resolved";
  const canInteract = Boolean(workspaceConversationId) && (isAssignedToCurrentAgent || isAdminLike) && !requestResolved;
  const interactionLockReason = !isAssignedToCurrentAgent
    ? "This handoff is assigned to another representative."
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
  const agentAvatarUrl = authSession.user?.avatarUrl ?? null;

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

  const refreshWorkspaceData = useCallback(async () => {
    const queueResult = await listQueueApi({ resolvedScope: "all" });
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
  }, [initialConversationId, requestId, seededConversation]);

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
    [refreshWorkspaceData, workspaceConversationId]
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
  };

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
        {!operationError && closeHint ? (
          <p className="rep-shell-hint" role="status">
            {closeHint}
          </p>
        ) : null}

        <div className="workspace-status-bar">
          <div className="workspace-status-copy">
            <strong>Request {requestId}</strong>
            <small>Status: {formatStatusLabel(queueRecord?.status)}</small>
          </div>
          <div className="workspace-status-actions">
            <button
              type="button"
              className="workspace-nav-button"
              onClick={() => router.push("/")}
            >
              Back to Dashboard
            </button>
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
              onSendMessage={() => {
                void sendRepMessage();
              }}
              onUseAvaSuggestion={() => {
                if (!avaSuggestion.suggestionText) {
                  return;
                }
                setComposeNote(avaSuggestion.suggestionText);
              }}
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
      </section>
    </div>
  );
}
