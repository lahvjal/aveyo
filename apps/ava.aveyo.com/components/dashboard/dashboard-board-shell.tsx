"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildAuthLoginUrl } from "@/lib/auth/config";
import { logoutAuthSession } from "@/lib/auth/session";
import { useAuthSession } from "@/lib/auth/use-auth-session";
import {
  claimHandoffApi,
  getRealtimeEventsApi,
  listQueueApi,
  type QueueRecord
} from "@/lib/dashboard-api";
import { createTicketFromQueueRecord } from "@/lib/dashboard-state";
import { publishDashboardSyncEvent, subscribeDashboardSyncEvents } from "@/lib/dashboard-sync";
import { type Ticket } from "@/lib/dashboard-types";
import { AppSideRail } from "@/components/app-side-rail";
import { AvaSecondaryNav } from "@/components/ava-secondary-nav";
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

export function DashboardBoardShell() {
  const router = useRouter();
  const authSession = useAuthSession();

  const [isOnline, setIsOnline] = useState(true);
  const [queueRecords, setQueueRecords] = useState<QueueRecord[]>([]);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [signOutPending, setSignOutPending] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);
  const [clockMs, setClockMs] = useState(() => Date.now());
  const realtimeCursorRef = useRef<string | undefined>(undefined);
  const realtimeBusyRef = useRef(false);

  const agentAvatarUrl = authSession.user?.avatarUrl ?? null;
  const agentId = authSession.user?.id ?? null;
  const isAdminLike = authSession.role === "super_admin";

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClockMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const pendingRecords = useMemo(
    () =>
      queueRecords
        .filter((item) => item.status === "pending")
        .sort((a, b) => a.position - b.position),
    [queueRecords]
  );
  const activeRecords = useMemo(
    () =>
      queueRecords
        .filter((item) => item.status === "active" || item.status === "claimed")
        .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)),
    [queueRecords]
  );
  const resolvedTodayRecords = useMemo(
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

  const pendingQueue = useMemo<Ticket[]>(
    () => pendingRecords.map((record) => createTicketFromQueueRecord(record, undefined, clockMs)),
    [clockMs, pendingRecords]
  );
  const activeQueue = useMemo<Ticket[]>(
    () => activeRecords.map((record) => createTicketFromQueueRecord(record, undefined, clockMs)),
    [activeRecords, clockMs]
  );
  const resolvedTodayQueue = useMemo<Ticket[]>(
    () => resolvedTodayRecords.map((record) => createTicketFromQueueRecord(record, undefined, clockMs)),
    [clockMs, resolvedTodayRecords]
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
      return "No pending requests right now. Active handoffs are still in progress.";
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
          setOperationError(error instanceof Error ? error.message : "Unable to load dashboard queue.");
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
    if (!authSession.authenticated || !isOnline) {
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
        if (result.cursorStale || result.events.length > 0) {
          await refreshQueueData();
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
  }, [authSession.authenticated, isOnline, refreshQueueData]);

  useEffect(() => {
    if (!authSession.authenticated) {
      return;
    }

    return subscribeDashboardSyncEvents(() => {
      void refreshQueueDataSafely();
    });
  }, [authSession.authenticated, refreshQueueDataSafely]);

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
        setOperationError(
          "The chat was claimed, but your browser blocked opening a new tab. Use Open Chat on the card."
        );
      }
    },
    []
  );

  const claimChat = async (ticketId: string) => {
    if (!authSession.authenticated || !authSession.user) {
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
      openWorkspaceTab(result.queue.requestId, result.thread.id);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Unable to claim this handoff.");
    }
  };

  const openChatFromCard = (ticketId: string) => {
    const queueRecord = queueRecords.find((item) => item.requestId === ticketId);
    if (!queueRecord) {
      setOperationError("Unable to open chat. The request is no longer available.");
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
            onClick={() => setIsOnline((state) => !state)}
            aria-pressed={isOnline}
          >
            <span aria-hidden>◉</span> {isOnline ? "Go Offline" : "Go Online"}
          </button>
        </div>

        <QueueBoardColumns
          pendingQueue={pendingQueue}
          activeQueue={activeQueue}
          resolvedTodayQueue={resolvedTodayQueue}
          onClaimChat={claimChat}
          onOpenChat={openChatFromCard}
        />
      </section>
    </div>
  );
}
