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
import { buildAuthLoginUrl } from "@/lib/auth/config";
import { logoutAuthSession } from "@/lib/auth/session";
import { useAuthSession } from "@/lib/auth/use-auth-session";
import {
  createRepresentativeMessageApi,
  createSupportNoteApi,
  getConversationApi,
  getConversationCustomerDetailsApi,
  getRealtimeEventsApi,
  listQueueApi,
  listSupportNotesApi,
  resolveHandoffApi,
  type QueueRecord
} from "@/lib/dashboard-api";
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
  const [resolvePending, setResolvePending] = useState(false);
  const [signOutPending, setSignOutPending] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);
  const realtimeCursorRef = useRef<string | undefined>(undefined);
  const realtimeBusyRef = useRef(false);
  const closingTabRef = useRef(false);

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
  const activeTicket = useMemo<Ticket | null>(() => {
    if (!queueRecord) {
      return null;
    }
    return createTicketFromQueueRecord(queueRecord, conversation);
  }, [conversation, queueRecord]);
  const agentAvatarUrl = authSession.user?.avatarUrl ?? null;

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
    realtimeCursorRef.current = undefined;

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

  useEffect(() => {
    if (!authSession.authenticated) {
      return;
    }

    let cancelled = false;
    const pollRealtime = async () => {
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
        const relevantEvent = result.events.some(
          (event) =>
            event.conversationId === workspaceConversationId ||
            event.type === "handoff_claimed" ||
            event.type === "handoff_resolved"
        );
        if (result.cursorStale || relevantEvent) {
          await refreshWorkspaceData();
        }
      } catch (error) {
        if (!cancelled) {
          setOperationError(
            error instanceof Error
              ? error.message
              : "Realtime updates are temporarily unavailable."
          );
        }
      } finally {
        realtimeBusyRef.current = false;
      }
    };

    void pollRealtime();
    const intervalId = window.setInterval(() => {
      void pollRealtime();
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [authSession.authenticated, refreshWorkspaceData, workspaceConversationId]);

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

  const sendRepMessage = async () => {
    if (!authSession.authenticated || !authSession.user || !workspaceConversationId || !canInteract) {
      return;
    }

    const messageText = normalizeDraft(composeNote);
    if (!messageText) {
      return;
    }

    try {
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
    }
  };

  const addSidebarNote = async () => {
    if (!authSession.authenticated || !workspaceConversationId || !canInteract) {
      return;
    }

    const noteBody = normalizeDraft(sidebarNote);
    if (!noteBody) {
      return;
    }

    try {
      const result = await createSupportNoteApi(workspaceConversationId, { body: noteBody });
      setHistoryNotes((current) => [mapSupportAgentNoteToHistoryNote(result.note), ...current]);
      setSidebarNote("");
      setOperationError(null);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Unable to save support note.");
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
        signOutPending={signOutPending}
        onCollapsedChange={setIsNavCollapsed}
        onSignOut={() => {
          void signOutAgent();
        }}
      />

      <section className="rep-main-shell">
        <AvaSecondaryNav activeRoute="dashboard" />
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
              {resolvePending ? "Resolving..." : "Resolve & Close"}
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
              agentInitials={agentInitials}
              agentAvatarUrl={agentAvatarUrl}
              onComposeNoteChange={setComposeNote}
              onSendMessage={() => {
                void sendRepMessage();
              }}
            />

            <DetailColumn
              activeTicket={activeTicket}
              customerDetails={customerDetails}
              customerDetailsLoading={customerDetailsLoading}
              sidebarNote={sidebarNote}
              historyNotes={historyNotes}
              notesDisabled={!canInteract}
              notesDisabledReason={interactionLockReason}
              onSidebarNoteChange={setSidebarNote}
              onAddSidebarNote={() => {
                void addSidebarNote();
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
