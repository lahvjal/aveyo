"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrandLoader } from "@ava/ui";
import { canAccessAvaManagerViews } from "@/lib/auth/access";
import { buildAuthLoginUrl } from "@/lib/auth/config";
import { logoutAuthSession } from "@/lib/auth/session";
import { useAuthSession } from "@/lib/auth/use-auth-session";
import { useSupportPresence } from "@/lib/use-support-presence";
import { useRealtimeInvalidation } from "@/lib/use-realtime-invalidation";
import {
  createSupportNoteApi,
  getConversationCustomerDetailsApi,
  getConversationApi,
  listQueueApi,
  listSupportNotesApi,
  setSupportPresenceOfflineApi,
  type QueueRecord
} from "@/lib/dashboard-api";
import {
  createEmptyConversation,
  createTicketFromQueueRecord,
  mapConversationCustomerDetailsToPanelData,
  mapSupportAgentNoteToHistoryNote,
  normalizeDraft
} from "@/lib/dashboard-state";
import { subscribeDashboardSyncEvents } from "@/lib/dashboard-sync";
import { type CustomerPanelDetails, type HistoryNote, type Ticket } from "@/lib/dashboard-types";
import { AppSideRail } from "@/components/app-side-rail";
import { AvaSecondaryNav } from "@/components/ava-secondary-nav";
import { ChatColumn, ChatComposer } from "./chat-column";
import { InitialChip } from "./initial-chip";
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

function parseIsoToMs(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function toElapsedSeconds(startMs: number, endMs: number) {
  return Math.max(0, Math.floor((endMs - startMs) / 1000));
}

function formatCompactDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatActiveChatSummary(activeCount: number, pendingCount: number) {
  const totalCount = activeCount + pendingCount;
  return `${activeCount}/${totalCount} active chats`;
}

function getRepresentativeInitials(name: string | null | undefined, fallback: string) {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) {
    return fallback;
  }

  const parts = trimmed
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return fallback;
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function getResolvedCardDuration(ticket: Ticket) {
  const requestedAtMs = parseIsoToMs(ticket.requestedAt);
  const claimedAtMs = parseIsoToMs(ticket.claimedAt);
  const resolvedAtMs = parseIsoToMs(ticket.resolvedAt);

  if (claimedAtMs !== null) {
    return formatCompactDuration(toElapsedSeconds(claimedAtMs, resolvedAtMs ?? Date.now()));
  }

  if (requestedAtMs !== null) {
    return formatCompactDuration(toElapsedSeconds(requestedAtMs, resolvedAtMs ?? Date.now()));
  }

  return "0:00";
}

type ResolvedFilterOption = "today" | "all";
type ResolvedSortOption = "latest" | "oldest";

function SecondaryNavToggleIcon() {
  return (
    <svg viewBox="0 0 8 9" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="4" cy="4.5" r="3.35" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="4" cy="4.5" r="1.25" fill="currentColor" />
    </svg>
  );
}

function ResolvedCardStatusIcon() {
  return (
    <svg viewBox="0 0 11.121 8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7.05243 1.41184V2.84134L11.121 4.60614L5.12065 6.49313V5.64738H1.48244V8H0V0L7.05243 1.41184Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ResolvedCardRatingIcon({ rating }: { rating: Ticket["customerRating"] }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={rating === "thumbs_down" ? "is-negative" : undefined}
    >
      <path
        d="M6.85 1.25C6.46 1.25 6.11 1.48 5.95 1.84L3.94 6.19C3.88 6.31 3.85 6.45 3.85 6.59V7.5C3.85 8.05 4.3 8.5 4.85 8.5H7V13.25C7 13.66 7.34 14 7.75 14H8.36C8.72 14 9.04 13.74 9.12 13.39L10.44 8.5H12.1C12.47 8.5 12.81 8.29 12.98 7.97C13.15 7.64 13.13 7.26 12.93 6.96L10.38 2.96C10.2 2.68 9.89 2.5 9.56 2.5H7.85L7.74 1.89C7.66 1.52 7.33 1.25 6.95 1.25H6.85ZM2.35 6.75H1.9C1.4 6.75 1 7.15 1 7.65V12.1C1 12.6 1.4 13 1.9 13H2.35C2.85 13 3.25 12.6 3.25 12.1V7.65C3.25 7.15 2.85 6.75 2.35 6.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function DashboardResolvedShell() {
  const router = useRouter();
  const authSession = useAuthSession();
  const seededConversation = useMemo(() => createEmptyConversation(), []);
  const { isOnline, syncing: presenceSyncing, toggleOnline } = useSupportPresence(authSession);

  const [queueRecords, setQueueRecords] = useState<QueueRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [resolvedFilter, setResolvedFilter] = useState<ResolvedFilterOption>("today");
  const [resolvedSort, setResolvedSort] = useState<ResolvedSortOption>("latest");
  const [selectedResolvedRequestId, setSelectedResolvedRequestId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [historyNotes, setHistoryNotes] = useState<HistoryNote[]>([]);
  const [historyNotesLoading, setHistoryNotesLoading] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<CustomerPanelDetails | null>(null);
  const [customerDetailsLoading, setCustomerDetailsLoading] = useState(false);
  const [conversation, setConversation] = useState(seededConversation);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [notePending, setNotePending] = useState(false);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
  const [signOutPending, setSignOutPending] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);
  const realtimeBusyRef = useRef(false);

  const agentAvatarUrl = authSession.user?.avatarUrl ?? null;
  const agentId = authSession.user?.id ?? null;

  const agentResolvedRecords = useMemo(
    () =>
      queueRecords
        .filter(
          (item) => item.status === "resolved" && item.resolvedByAuthUserId === agentId
        ),
    [agentId, queueRecords]
  );

  const resolvedRecords = useMemo(() => {
    const filteredRecords =
      resolvedFilter === "today"
        ? agentResolvedRecords.filter((item) => isSameLocalDay(item.resolvedAt))
        : agentResolvedRecords;

    return [...filteredRecords].sort((a, b) => {
      const aResolvedAt = parseIsoToMs(a.resolvedAt) ?? 0;
      const bResolvedAt = parseIsoToMs(b.resolvedAt) ?? 0;
      if (resolvedSort === "oldest") {
        return aResolvedAt - bResolvedAt;
      }
      return bResolvedAt - aResolvedAt;
    });
  }, [agentResolvedRecords, resolvedFilter, resolvedSort]);

  const resolvedTickets = useMemo<Ticket[]>(
    () => resolvedRecords.map((record) => createTicketFromQueueRecord(record, undefined, Date.now())),
    [resolvedRecords]
  );
  const resolvedByRequestId = useMemo(
    () => new Map(resolvedRecords.map((record) => [record.requestId, record])),
    [resolvedRecords]
  );
  const selectedResolvedRecord = useMemo(
    () => (selectedResolvedRequestId ? resolvedByRequestId.get(selectedResolvedRequestId) ?? null : null),
    [resolvedByRequestId, selectedResolvedRequestId]
  );
  const selectedConversationId = selectedResolvedRecord?.conversationId ?? null;
  const isResolvedConversationLoaded = Boolean(
    selectedConversationId &&
      conversation.id === selectedConversationId &&
      conversation.id !== seededConversation.id
  );
  const selectedResolvedTicket = useMemo(() => {
    if (!selectedResolvedRecord) {
      return null;
    }
    return createTicketFromQueueRecord(
      selectedResolvedRecord,
      isResolvedConversationLoaded ? conversation : undefined
    );
  }, [conversation, isResolvedConversationLoaded, selectedResolvedRecord]);
  const selectedWorkspaceTimerLabel = selectedResolvedTicket
    ? getResolvedCardDuration(selectedResolvedTicket)
    : "0:00";

  const activeChatSummary = useMemo(
    () => formatActiveChatSummary(activeCount, pendingCount),
    [activeCount, pendingCount]
  );
  const agentInitials = getRepresentativeInitials(authSession.user?.name, "AG");

  const refreshQueueData = useCallback(async () => {
    const result = await listQueueApi({ resolvedScope: "agent" });
    setQueueRecords(result.queue);
    setPendingCount(result.pendingCount);
    setActiveCount(result.activeCount);
    setOperationError(null);
  }, []);

  const refreshQueueDataSafely = useCallback(async () => {
    try {
      await refreshQueueData();
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Unable to refresh resolved queue.");
    }
  }, [refreshQueueData]);

  const refreshSelectedConversation = useCallback(async () => {
    if (!selectedConversationId) {
      setConversation(seededConversation);
      return;
    }

    const conversationResult = await getConversationApi(selectedConversationId);
    setConversation(conversationResult.conversation);
    setOperationError(null);
  }, [seededConversation, selectedConversationId]);

  const refreshSelectedConversationSafely = useCallback(async () => {
    try {
      await refreshSelectedConversation();
    } catch (error) {
      setConversation(seededConversation);
      setOperationError(error instanceof Error ? error.message : "Unable to load the selected transcript.");
    }
  }, [refreshSelectedConversation, seededConversation]);

  useEffect(() => {
    if (authSession.loading) {
      return;
    }

    if (!authSession.authenticated) {
      setQueueRecords([]);
      setPendingCount(0);
      setActiveCount(0);
      setSelectedResolvedRequestId(null);
      setNoteDraft("");
      setHistoryNotes([]);
      setHistoryNotesLoading(false);
      setCustomerDetails(null);
      setCustomerDetailsLoading(false);
      setIsDetailsPanelOpen(false);
      setConversation(seededConversation);
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
          setPendingCount(0);
          setActiveCount(0);
          setSelectedResolvedRequestId(null);
          setConversation(seededConversation);
        }
      }
    };

    void loadQueue();
    return () => {
      cancelled = true;
    };
  }, [authSession.authenticated, authSession.loading, refreshQueueData, seededConversation]);

  useEffect(() => {
    if (resolvedRecords.length === 0) {
      setSelectedResolvedRequestId(null);
      return;
    }

    const resolvedRequestIds = new Set(resolvedRecords.map((record) => record.requestId));
    setSelectedResolvedRequestId((current) => (current && resolvedRequestIds.has(current) ? current : null));
  }, [resolvedRecords]);

  useEffect(() => {
    setIsDetailsPanelOpen(false);
  }, [selectedConversationId]);

  useEffect(() => {
    if (!authSession.authenticated || !selectedConversationId) {
      setNoteDraft("");
      setConversation(seededConversation);
      return;
    }

    let cancelled = false;
    setNoteDraft("");
    setConversation(seededConversation);

    const loadConversation = async () => {
      try {
        const conversationResult = await getConversationApi(selectedConversationId);
        if (cancelled) {
          return;
        }
        setConversation(conversationResult.conversation);
        setOperationError(null);
      } catch (error) {
        if (!cancelled) {
          setConversation(seededConversation);
          setOperationError(
            error instanceof Error ? error.message : "Unable to load the selected transcript."
          );
        }
      }
    };

    void loadConversation();
    return () => {
      cancelled = true;
    };
  }, [authSession.authenticated, seededConversation, selectedConversationId]);

  useEffect(() => {
    if (!authSession.authenticated || !selectedConversationId || !isResolvedConversationLoaded) {
      setHistoryNotes([]);
      setHistoryNotesLoading(false);
      return;
    }

    let cancelled = false;
    setHistoryNotesLoading(true);

    const loadNotes = async () => {
      try {
        const result = await listSupportNotesApi(selectedConversationId);
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
  }, [authSession.authenticated, isResolvedConversationLoaded, selectedConversationId]);

  useEffect(() => {
    if (!authSession.authenticated || !selectedConversationId || !isResolvedConversationLoaded) {
      setCustomerDetails(null);
      setCustomerDetailsLoading(false);
      return;
    }

    let cancelled = false;
    setCustomerDetailsLoading(true);

    const loadDetails = async () => {
      try {
        const result = await getConversationCustomerDetailsApi(selectedConversationId);
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
  }, [authSession.authenticated, isResolvedConversationLoaded, selectedConversationId]);

  const handleRealtimeInvalidation = useCallback(async () => {
    if (realtimeBusyRef.current) {
      return;
    }

    realtimeBusyRef.current = true;
    try {
      await refreshQueueData();
      if (selectedConversationId) {
        await refreshSelectedConversation();
      }
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : "Realtime updates are temporarily unavailable."
      );
    } finally {
      realtimeBusyRef.current = false;
    }
  }, [refreshQueueData, refreshSelectedConversation, selectedConversationId]);

  useRealtimeInvalidation({
    enabled: authSession.authenticated,
    debounceMs: 250,
    onInvalidate: () => {
      void handleRealtimeInvalidation();
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
      void refreshQueueDataSafely();
      if (event.conversationId === selectedConversationId) {
        void refreshSelectedConversationSafely();
      }
    });
  }, [
    authSession.authenticated,
    refreshQueueDataSafely,
    refreshSelectedConversationSafely,
    selectedConversationId
  ]);

  const handleToggleOnline = useCallback(async () => {
    try {
      await toggleOnline();
      setOperationError(null);
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : "Unable to update your support presence."
      );
    }
  }, [toggleOnline]);

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

  const addResolvedNote = useCallback(async () => {
    if (!authSession.authenticated || !selectedConversationId || notePending) {
      return;
    }

    const noteBody = normalizeDraft(noteDraft);
    if (!noteBody) {
      return;
    }

    try {
      setNotePending(true);
      const result = await createSupportNoteApi(selectedConversationId, { body: noteBody });
      setHistoryNotes((current) => [mapSupportAgentNoteToHistoryNote(result.note), ...current]);
      setNoteDraft("");
      setOperationError(null);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Unable to save support note.");
    } finally {
      setNotePending(false);
    }
  }, [authSession.authenticated, noteDraft, notePending, selectedConversationId]);

  const keepResolvedComposerInNoteMode = useCallback(() => {}, []);
  const canOpenDetailsPanel = Boolean(selectedResolvedRecord) && isResolvedConversationLoaded;

  const selectResolvedTranscript = useCallback(
    (ticketId: string) => {
      const queueRecord = resolvedRecords.find((item) => item.requestId === ticketId);
      if (!queueRecord) {
        setOperationError("Unable to load transcript. The record is no longer available.");
        return;
      }

      if (selectedResolvedRequestId === ticketId) {
        setSelectedResolvedRequestId(null);
        setOperationError(null);
        return;
      }

      setSelectedResolvedRequestId(ticketId);
      setOperationError(null);
    },
    [resolvedRecords, selectedResolvedRequestId]
  );

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
          activeRoute="resolved"
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
        <div className="rep-main-scroll">
          {operationError ? (
            <p className="rep-shell-error" role="alert">
              {operationError}
            </p>
          ) : null}

          <div className="resolved-page-content">
            <div className="dashboard-queue-pane resolved-queue-pane">
              <section className="board-lane resolved">
                <header className="resolved-lane-header">
                  <div className="board-lane-head resolved-lane-head resolved-lane-head-primary">
                    <div className="resolved-lane-title">
                      <strong>Resolved</strong>
                      <span className="board-lane-count is-badge">{resolvedTickets.length}</span>
                    </div>
                  </div>
                  <div className="board-lane-head resolved-lane-head resolved-lane-head-secondary">
                    <label className="resolved-lane-control">
                      <span className="resolved-lane-control-label">Filter:</span>
                      <span className="resolved-lane-select-wrap">
                        <select
                          className="resolved-lane-select"
                          aria-label="Filter resolved chats"
                          value={resolvedFilter}
                          onChange={(event) =>
                            setResolvedFilter(event.target.value as ResolvedFilterOption)
                          }
                        >
                          <option value="today">Today</option>
                          <option value="all">All time</option>
                        </select>
                        <span className="resolved-lane-control-caret" aria-hidden="true">
                          <svg viewBox="0 0 8 4" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                              d="M1 1L4 3L7 1"
                              stroke="currentColor"
                              strokeWidth="1.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      </span>
                    </label>
                    <label className="resolved-lane-control">
                      <span className="resolved-lane-control-label">Sort by:</span>
                      <span className="resolved-lane-select-wrap">
                        <select
                          className="resolved-lane-select"
                          aria-label="Sort resolved chats"
                          value={resolvedSort}
                          onChange={(event) =>
                            setResolvedSort(event.target.value as ResolvedSortOption)
                          }
                        >
                          <option value="latest">Latest</option>
                          <option value="oldest">Oldest</option>
                        </select>
                        <span className="resolved-lane-control-caret" aria-hidden="true">
                          <svg viewBox="0 0 8 4" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                              d="M1 1L4 3L7 1"
                              stroke="currentColor"
                              strokeWidth="1.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      </span>
                    </label>
                  </div>
                </header>
                <div className="board-lane-body">
                  {resolvedTickets.length === 0 ? (
                    <div className="board-lane-empty-state" aria-live="polite">
                      <span className="board-lane-empty-state-icon" aria-hidden="true">
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
                      <p>No chats</p>
                    </div>
                  ) : (
                    resolvedTickets.map((ticket) => {
                      const representativeAvatarUrl = ticket.representative?.avatarUrl?.trim() || undefined;
                      const representativeInitials = getRepresentativeInitials(
                        ticket.representative?.name,
                        "AG"
                      );
                      const ratingTone =
                        ticket.customerRating === "thumbs_down"
                          ? "negative"
                          : ticket.customerRating === "thumbs_up"
                            ? "positive"
                            : "neutral";

                      return (
                        <article
                          key={ticket.id}
                          className={`board-queue-card resolved is-clickable${
                            selectedResolvedRequestId === ticket.id ? " is-selected" : ""
                          }`}
                          role="button"
                          tabIndex={0}
                          aria-pressed={selectedResolvedRequestId === ticket.id}
                          aria-label={`Load transcript for ${ticket.fullName}`}
                          onClick={() => selectResolvedTranscript(ticket.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              selectResolvedTranscript(ticket.id);
                            }
                          }}
                        >
                          <div className="board-queue-card-main">
                            <div className="board-queue-identity">
                              <InitialChip initials={ticket.initials} tone={ticket.chipTone} size={46} />
                              <div className="board-queue-identity-copy">
                                <div className="board-queue-identity-title">
                                  <p className="resolved-card-name">{ticket.fullName}</p>
                                  <span className="resolved-card-status-icon" aria-hidden="true">
                                    <ResolvedCardStatusIcon />
                                  </span>
                                </div>
                                <p className="resolved-card-preview">{ticket.preview}</p>
                              </div>
                            </div>
                            <div className="resolved-card-meta">
                              <div className={`resolved-card-rating ${ratingTone}`}>
                                <span className="resolved-card-rating-icon" aria-hidden="true">
                                  <ResolvedCardRatingIcon rating={ticket.customerRating} />
                                </span>
                                <span>{getResolvedCardDuration(ticket)}</span>
                              </div>
                              <span className="resolved-card-assignee" aria-hidden="true">
                                <InitialChip
                                  initials={representativeInitials}
                                  avatarUrl={representativeAvatarUrl}
                                  tone="sand"
                                  size={30}
                                />
                              </span>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            </div>

            <div className="dashboard-inline-workspace resolved-inline-workspace">
              <div className="workspace-status-bar dashboard-workspace-status-bar resolved-workspace-status-bar">
                {selectedResolvedTicket ? (
                  <div className="dashboard-workspace-status-selected">
                    <InitialChip
                      initials={selectedResolvedTicket.initials}
                      tone={selectedResolvedTicket.chipTone}
                      size={46}
                    />
                    <strong className="dashboard-workspace-status-name">
                      {selectedResolvedTicket.fullName}
                    </strong>
                    <span className="dashboard-workspace-status-timer">
                      {selectedWorkspaceTimerLabel}
                    </span>
                  </div>
                ) : (
                  <div className="dashboard-workspace-status-selected is-placeholder">
                    <span className="dashboard-workspace-status-avatar is-empty" aria-hidden="true">
                      -
                    </span>
                    <strong className="dashboard-workspace-status-name is-placeholder">Customer</strong>
                    <span className="dashboard-workspace-status-timer is-placeholder">0:00</span>
                  </div>
                )}
                <div className="workspace-status-actions resolved-workspace-status-actions">
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
              </div>

              {!selectedResolvedRecord ? (
                <div className="dashboard-no-chat-workspace">
                  <div className="dashboard-no-chat-timeline">
                    <div
                      className={`dashboard-no-chat-indicator${
                        resolvedRecords.length > 0 ? " is-loading" : ""
                      }`}
                    >
                      {resolvedRecords.length > 0 ? (
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
                      composeMode="note"
                      composeValue=""
                      composePlaceholder="Select a resolved chat to view its transcript."
                      composeHelper="Select a resolved chat to view its transcript and add internal notes."
                      submitAriaLabel="Save note"
                      composerDisabled
                      composeModeLocked
                      onComposeModeChange={() => {}}
                      onComposeValueChange={() => {}}
                      onSubmitCompose={() => {}}
                    />
                  </div>
                </div>
              ) : !isResolvedConversationLoaded ? (
                <div className="dashboard-no-chat-workspace resolved-loading-workspace">
                  <div className="dashboard-no-chat-timeline">
                    <div className="dashboard-no-chat-indicator is-loading">
                      <BrandLoader size={34} tone="dark" label="Loading transcript" />
                      <p>Loading transcript</p>
                    </div>
                  </div>
                  <div className="dashboard-no-chat-compose uses-real-composer">
                    <ChatComposer
                      composeMode="note"
                      composeValue=""
                      composePlaceholder="Loading transcript..."
                      composeHelper="Internal notes unlock after the transcript loads."
                      submitAriaLabel="Save note"
                      composerDisabled
                      composeModeLocked
                      onComposeModeChange={() => {}}
                      onComposeValueChange={() => {}}
                      onSubmitCompose={() => {}}
                    />
                  </div>
                </div>
              ) : (
                <ChatColumn
                  conversation={conversation}
                  activeTicket={selectedResolvedTicket}
                  hasActiveChat={Boolean(selectedResolvedTicket)}
                  hasPendingChats={false}
                  isOnline={isOnline}
                  isEmptyState={false}
                  composeMode="note"
                  composeValue={noteDraft}
                  composeModeLocked
                  submitPending={notePending}
                  showAvaSuggestion={false}
                  showHeader={false}
                  agentInitials={agentInitials}
                  agentAvatarUrl={agentAvatarUrl}
                  onComposeModeChange={keepResolvedComposerInNoteMode}
                  onComposeValueChange={setNoteDraft}
                  onSubmitCompose={addResolvedNote}
                />
              )}

              {isDetailsPanelOpen ? (
                <WorkspaceDetailsOverlay
                  activeTicket={selectedResolvedTicket}
                  customerDetails={customerDetails}
                  customerDetailsLoading={customerDetailsLoading}
                  historyNotes={historyNotes}
                  historyNotesLoading={historyNotesLoading}
                  onClose={() => {
                    setIsDetailsPanelOpen(false);
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
