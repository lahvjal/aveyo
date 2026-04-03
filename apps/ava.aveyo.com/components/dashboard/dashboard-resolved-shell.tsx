"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildAuthLoginUrl } from "@/lib/auth/config";
import { logoutAuthSession } from "@/lib/auth/session";
import { useAuthSession } from "@/lib/auth/use-auth-session";
import { getRealtimeEventsApi, listQueueApi, type QueueRecord } from "@/lib/dashboard-api";
import { createTicketFromQueueRecord } from "@/lib/dashboard-state";
import { subscribeDashboardSyncEvents } from "@/lib/dashboard-sync";
import { type Ticket } from "@/lib/dashboard-types";
import { AppSideRail } from "@/components/app-side-rail";
import { AvaSecondaryNav } from "@/components/ava-secondary-nav";
import { InitialChip } from "./initial-chip";

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

function isSameLocalDay(isoValue: string | null | undefined, now: Date = new Date()) {
  if (!isoValue) {
    return false;
  }

  const value = new Date(isoValue);
  if (Number.isNaN(value.getTime())) {
    return false;
  }

  return (
    value.getFullYear() === now.getFullYear() &&
    value.getMonth() === now.getMonth() &&
    value.getDate() === now.getDate()
  );
}

function toRatingLabel(rating: Ticket["customerRating"]) {
  if (rating === "thumbs_up") {
    return "Rating: 👍 Thumbs up";
  }
  if (rating === "thumbs_down") {
    return "Rating: 👎 Thumbs down";
  }
  return "Rating: Not yet rated";
}

export function DashboardResolvedShell() {
  const router = useRouter();
  const authSession = useAuthSession();

  const [queueRecords, setQueueRecords] = useState<QueueRecord[]>([]);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [signOutPending, setSignOutPending] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);
  const realtimeCursorRef = useRef<string | undefined>(undefined);
  const realtimeBusyRef = useRef(false);

  const agentAvatarUrl = authSession.user?.avatarUrl ?? null;
  const agentId = authSession.user?.id ?? null;

  const resolvedRecords = useMemo(
    () =>
      queueRecords
        .filter(
          (item) =>
            item.status === "resolved" &&
            item.resolvedByAuthUserId === agentId &&
            isSameLocalDay(item.resolvedAt)
        )
        .sort((a, b) => (b.resolvedAt ?? "").localeCompare(a.resolvedAt ?? "")),
    [agentId, queueRecords]
  );

  const resolvedTickets = useMemo<Ticket[]>(
    () => resolvedRecords.map((record) => createTicketFromQueueRecord(record, undefined, Date.now())),
    [resolvedRecords]
  );

  const shellHintMessage = useMemo(() => {
    if (operationError) {
      return null;
    }
    if (resolvedTickets.length === 0) {
      return "No chats resolved yet today.";
    }
    const recordLabel = resolvedTickets.length === 1 ? "chat" : "chats";
    return `${resolvedTickets.length} ${recordLabel} resolved today.`;
  }, [operationError, resolvedTickets.length]);

  const refreshQueueData = useCallback(async () => {
    const result = await listQueueApi({ resolvedScope: "agent" });
    setQueueRecords(result.queue);
    setOperationError(null);
  }, []);

  const refreshQueueDataSafely = useCallback(async () => {
    try {
      await refreshQueueData();
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Unable to refresh resolved queue.");
    }
  }, [refreshQueueData]);

  useEffect(() => {
    realtimeCursorRef.current = undefined;

    if (authSession.loading) {
      return;
    }

    if (!authSession.authenticated) {
      setQueueRecords([]);
      return;
    }

    let cancelled = false;
    const loadQueue = async () => {
      try {
        await refreshQueueData();
      } catch (error) {
        if (!cancelled) {
          setOperationError(error instanceof Error ? error.message : "Unable to load resolved queue.");
          setQueueRecords([]);
        }
      }
    };

    void loadQueue();
    return () => {
      cancelled = true;
    };
  }, [authSession.authenticated, authSession.loading, refreshQueueData]);

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
        const queueChanged =
          result.cursorStale ||
          result.events.some(
            (event) =>
              event.type === "handoff_requested" ||
              event.type === "handoff_claimed" ||
              event.type === "handoff_resolved"
          );
        if (queueChanged) {
          await refreshQueueData();
        }
      } catch (error) {
        if (!cancelled) {
          setOperationError(
            error instanceof Error ? error.message : "Realtime updates are temporarily unavailable."
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
  }, [authSession.authenticated, refreshQueueData]);

  useEffect(() => {
    if (!authSession.authenticated) {
      return;
    }

    return subscribeDashboardSyncEvents(() => {
      void refreshQueueDataSafely();
    });
  }, [authSession.authenticated, refreshQueueDataSafely]);

  const openTranscript = (ticketId: string) => {
    const queueRecord = resolvedRecords.find((item) => item.requestId === ticketId);
    if (!queueRecord) {
      setOperationError("Unable to open transcript. The record is no longer available.");
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const workspaceUrl = `${window.location.origin}/handoff/${encodeURIComponent(
      queueRecord.requestId
    )}?conversationId=${encodeURIComponent(queueRecord.conversationId)}`;
    const opened = window.open(workspaceUrl, "_blank");
    if (!opened) {
      setOperationError("Your browser blocked opening a new tab. Allow popups and try again.");
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
        <AvaSecondaryNav activeRoute="resolved" />
        {operationError ? (
          <p className="rep-shell-error" role="alert">
            {operationError}
          </p>
        ) : null}
        {!operationError && shellHintMessage ? (
          <p className="rep-shell-hint" role="status">
            {shellHintMessage}
          </p>
        ) : null}

        <div className="board-status-bar">
          <div className="status-block">
            <span className="online-dot is-online" aria-hidden />
            <div>
              <p>Resolved</p>
              <small>{resolvedTickets.length} resolved today</small>
            </div>
          </div>
          <button
            type="button"
            className="workspace-nav-button"
            onClick={() => router.push("/")}
          >
            Back to Dashboard
          </button>
        </div>

        <div className="resolved-page-content">
          <section className="board-lane resolved">
            <header className="board-lane-head">
              <strong>Resolved Today</strong>
              <span className="board-lane-count">{resolvedTickets.length}</span>
            </header>
            <div className="board-lane-body">
              {resolvedTickets.length === 0 ? (
                <p className="empty-state">No chats resolved today.</p>
              ) : (
                resolvedTickets.map((ticket) => {
                  const secondaryLine =
                    ticket.email.trim() && ticket.email.trim() !== ticket.fullName.trim()
                      ? ticket.email
                      : null;

                  return (
                    <article key={ticket.id} className="board-queue-card resolved">
                      <div className="board-queue-identity">
                        <InitialChip initials={ticket.initials} tone={ticket.chipTone} />
                        <div>
                          <strong>{ticket.fullName}</strong>
                          {secondaryLine ? <p>{secondaryLine}</p> : null}
                        </div>
                      </div>
                      <p className="board-queue-wait">{ticket.waitLabel}</p>
                      {ticket.lapsedLabel ? <p className="board-queue-lapsed">{ticket.lapsedLabel}</p> : null}
                      <p className="board-queue-rating">{toRatingLabel(ticket.customerRating)}</p>
                      <p className="board-queue-preview">{`"${ticket.preview}"`}</p>
                      <button
                        type="button"
                        className="board-queue-action open"
                        onClick={() => openTranscript(ticket.id)}
                      >
                        Open Transcript
                      </button>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
