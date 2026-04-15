"use client";

import { type ConversationThread } from "@ava/chat-domain";
import { AvaOrb } from "@ava/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { canAccessAvaManagerViews } from "@/lib/auth/access";
import { buildAuthLoginUrl } from "@/lib/auth/config";
import { logoutAuthSession } from "@/lib/auth/session";
import { useAuthSession } from "@/lib/auth/use-auth-session";
import {
  getConversationApi,
  getManagerAgentsApi,
  getManagerHandoffsApi,
  getManagerOverviewApi,
  getRealtimeEventsApi,
  type ManagerAgentRecord,
  type ManagerHandoffRecord,
  type ManagerOverviewResult
} from "@/lib/dashboard-api";
import {
  getCustomerMessageSentimentLabel,
  getCustomerMessageSentimentLevel
} from "@/lib/customer-sentiment-ui";
import {
  buildManagerDateRangeSearchParams,
  fromDateTimeLocalValue,
  getDefaultManagerTimeZone,
  parseManagerDateRangeFromSearchParams,
  toDateTimeLocalValue,
  type ManagerDateRangeState
} from "@/lib/manager-date-range";
import { AppSideRail } from "@/components/app-side-rail";
import { AvaSecondaryNav } from "@/components/ava-secondary-nav";
import { InitialChip } from "@/components/dashboard/initial-chip";

const PREVIEW_REFRESH_MIN_INTERVAL_MS = 1500;

function formatRelativeAgo(iso: string | null, nowMs: number = Date.now()) {
  if (!iso) {
    return "—";
  }
  const timeMs = new Date(iso).getTime();
  if (Number.isNaN(timeMs)) {
    return "—";
  }
  const deltaSeconds = Math.max(0, Math.floor((nowMs - timeMs) / 1000));
  if (deltaSeconds < 60) {
    return `${deltaSeconds}s ago`;
  }
  const deltaMinutes = Math.floor(deltaSeconds / 60);
  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`;
  }
  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours}h ago`;
  }
  return `${Math.floor(deltaHours / 24)}d ago`;
}

function RelativeAgoLabel({ iso, live }: { iso: string | null; live: boolean }) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());
    if (!live) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [live, iso]);

  return <>{formatRelativeAgo(iso, nowMs)}</>;
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

type ManagerMoodFilter = "all" | "calm" | "frustrated" | "escalated";
type PipelineLaneId = "ai_handling" | "pending" | "with_agent" | "resolved";

function getPipelineLaneForHandoff(handoff: ManagerHandoffRecord): PipelineLaneId {
  const rawStatus =
    typeof handoff.status === "string" ? handoff.status.trim().toLowerCase() : "";
  const hasResolvedSignal = Boolean(handoff.resolvedAt);
  const hasAssignedAgentSignal = Boolean(
    handoff.assignedAgentId || handoff.assignedAgentName || handoff.claimedAt
  );

  if (hasResolvedSignal) {
    return "resolved";
  }

  if (rawStatus === "resolved") {
    // Some rows arrive with stale "resolved" status before resolvedAt is set.
    return hasAssignedAgentSignal ? "with_agent" : "pending";
  }

  if (rawStatus === "active" || rawStatus === "claimed" || hasAssignedAgentSignal) {
    return "with_agent";
  }

  if (rawStatus === "open") {
    return "ai_handling";
  }

  if (rawStatus === "pending" || rawStatus === "requested") {
    return "pending";
  }

  return "ai_handling";
}

function getMoodFromSensitivityBand(band: "low" | "medium" | "high"): Exclude<ManagerMoodFilter, "all"> {
  if (band === "high") {
    return "escalated";
  }
  if (band === "medium") {
    return "frustrated";
  }
  return "calm";
}

function formatMoodLabel(mood: Exclude<ManagerMoodFilter, "all">) {
  if (mood === "escalated") {
    return "Escalated";
  }
  if (mood === "frustrated") {
    return "Frustrated";
  }
  return "Calm";
}

type ManagerCardStatus = "open" | "pending" | "claimed" | "active" | "resolved" | "ended";

function getManagerCardStatus(handoff: ManagerHandoffRecord): ManagerCardStatus {
  if (handoff.isEnded) {
    return "ended";
  }
  return handoff.status;
}

function formatManagerCardStatus(status: ManagerCardStatus) {
  if (status === "ended") {
    return "Ended";
  }
  if (status === "resolved") {
    return "Resolved";
  }
  if (status === "active" || status === "claimed") {
    return "With agent";
  }
  if (status === "pending") {
    return "Pending handoff";
  }
  return "AI handling";
}

function formatAgentSatisfaction(rating: ManagerHandoffRecord["customerRating"]) {
  if (rating === "thumbs_up") {
    return "Agent satisfaction: Thumbs up";
  }
  if (rating === "thumbs_down") {
    return "Agent satisfaction: Thumbs down";
  }
  return "Agent satisfaction: Not rated";
}

function getHandoffSortTime(iso: string | null) {
  if (!iso) {
    return 0;
  }
  const value = new Date(iso).getTime();
  return Number.isNaN(value) ? 0 : value;
}

function getNameInitials(name: string | null | undefined, fallback = "CU") {
  const raw = typeof name === "string" ? name.trim() : "";
  if (!raw) {
    return fallback;
  }
  const parts = raw
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return fallback;
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export function DashboardManagerShell() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const authSession = useAuthSession();
  const [signOutPending, setSignOutPending] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<ManagerOverviewResult | null>(null);
  const [agents, setAgents] = useState<ManagerAgentRecord[]>([]);
  const [handoffs, setHandoffs] = useState<ManagerHandoffRecord[]>([]);
  const [moodFilter, setMoodFilter] = useState<ManagerMoodFilter>("all");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [previewConversation, setPreviewConversation] = useState<ConversationThread | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewTimelineRef = useRef<HTMLDivElement | null>(null);
  const previewRequestSerialRef = useRef(0);
  const previewInFlightConversationIdRef = useRef<string | null>(null);
  const previewLastLoadedRef = useRef<{ conversationId: string | null; atMs: number }>({
    conversationId: null,
    atMs: 0
  });
  const realtimeCursorRef = useRef<string | undefined>(undefined);
  const realtimeBusyRef = useRef(false);

  const activeRange = useMemo(() => {
    return parseManagerDateRangeFromSearchParams(new URLSearchParams(searchParams.toString()));
  }, [searchParams]);
  const [draftRange, setDraftRange] = useState<ManagerDateRangeState>(activeRange);

  useEffect(() => {
    setDraftRange(activeRange);
  }, [activeRange]);

  const rangeQuery = useMemo(() => {
    return activeRange.preset === "custom"
      ? {
          preset: "custom" as const,
          from: activeRange.from,
          to: activeRange.to,
          tz: activeRange.tz
        }
      : {
          preset: activeRange.preset,
          tz: activeRange.tz
        };
  }, [activeRange]);

  const refreshManagerData = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const [overviewResult, agentsResult, handoffsResult] = await Promise.all([
        getManagerOverviewApi(rangeQuery),
        getManagerAgentsApi(rangeQuery),
        getManagerHandoffsApi(rangeQuery)
      ]);
      setOverview(overviewResult);
      setAgents(agentsResult.agents);
      setHandoffs(handoffsResult.handoffs);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error && fetchError.message
          ? fetchError.message
          : "Unable to load manager insights."
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [rangeQuery]);

  useEffect(() => {
    void refreshManagerData();
  }, [refreshManagerData]);

  useEffect(() => {
    if (!authSession.authenticated) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }
      void refreshManagerData({ silent: true });
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [authSession.authenticated, refreshManagerData]);

  const handoffStatusCounts = useMemo(() => {
    const counts = {
      aiHandling: 0,
      pending: 0,
      withAgent: 0
    };
    for (const handoff of handoffs) {
      const lane = getPipelineLaneForHandoff(handoff);
      if (lane === "ai_handling") {
        counts.aiHandling += 1;
        continue;
      }
      if (lane === "pending") {
        counts.pending += 1;
        continue;
      }
      if (lane === "with_agent") {
        counts.withAgent += 1;
        continue;
      }
    }
    return counts;
  }, [handoffs]);
  const onlineAgentsCount = agents.filter((agent) => agent.status === "online").length;
  const totalAgentsCount = agents.length;
  const aiHandlingCount = handoffStatusCounts.aiHandling;
  const moodCounts = useMemo(() => {
    const counts = {
      calm: 0,
      frustrated: 0,
      escalated: 0
    };
    for (const handoff of handoffs) {
      const mood = getMoodFromSensitivityBand(handoff.customerSensitivityBand);
      counts[mood] += 1;
    }
    return counts;
  }, [handoffs]);
  const moodFilterTabs = useMemo(
    () => [
      { id: "all" as const, label: "All Moods", count: handoffs.length },
      { id: "calm" as const, label: "Calm", count: moodCounts.calm },
      { id: "frustrated" as const, label: "Frustrated", count: moodCounts.frustrated },
      { id: "escalated" as const, label: "Escalated", count: moodCounts.escalated }
    ],
    [handoffs.length, moodCounts.calm, moodCounts.escalated, moodCounts.frustrated]
  );
  const moodFilteredHandoffs = useMemo(() => {
    if (moodFilter === "all") {
      return handoffs;
    }
    return handoffs.filter(
      (handoff) => getMoodFromSensitivityBand(handoff.customerSensitivityBand) === moodFilter
    );
  }, [handoffs, moodFilter]);
  const totalChatsCount = moodFilteredHandoffs.length;
  const pipelineLanes = useMemo(() => {
    const byLane: Record<PipelineLaneId, ManagerHandoffRecord[]> = {
      ai_handling: [],
      pending: [],
      with_agent: [],
      resolved: []
    };

    for (const handoff of moodFilteredHandoffs) {
      const lane = getPipelineLaneForHandoff(handoff);
      byLane[lane].push(handoff);
    }

    for (const lane of Object.values(byLane)) {
      lane.sort((left, right) => getHandoffSortTime(right.lastMessageAt) - getHandoffSortTime(left.lastMessageAt));
    }

    return [
      { id: "ai_handling" as const, label: "AI Handling", count: byLane.ai_handling.length, items: byLane.ai_handling },
      { id: "pending" as const, label: "Pending Handoff", count: byLane.pending.length, items: byLane.pending },
      { id: "with_agent" as const, label: "With Agent", count: byLane.with_agent.length, items: byLane.with_agent },
      { id: "resolved" as const, label: "Resolved", count: byLane.resolved.length, items: byLane.resolved }
    ];
  }, [moodFilteredHandoffs]);
  const resolvedLaneItems = useMemo(
    () => pipelineLanes.find((lane) => lane.id === "resolved")?.items ?? [],
    [pipelineLanes]
  );
  const totalEndedOrResolvedChatsCount = resolvedLaneItems.length;
  const aiEndedOrResolvedWithoutHandoffCount = resolvedLaneItems.filter((handoff) =>
    handoff.requestId.startsWith("conversation-")
  ).length;
  const endedOrResolvedWithHandoffCount = Math.max(
    0,
    totalEndedOrResolvedChatsCount - aiEndedOrResolvedWithoutHandoffCount
  );
  const selectedHandoff = useMemo(
    () => handoffs.find((handoff) => handoff.requestId === selectedRequestId) ?? null,
    [handoffs, selectedRequestId]
  );
  const selectedConversationId = selectedHandoff?.conversationId ?? null;
  const selectedConversationIsLive = Boolean(
    selectedHandoff &&
      !selectedHandoff.isEnded &&
      getPipelineLaneForHandoff(selectedHandoff) !== "resolved"
  );
  const selectedCustomerInitials = useMemo(
    () => getNameInitials(selectedHandoff?.customerName, "CU"),
    [selectedHandoff]
  );
  const selectedConversationPreview = useMemo(() => {
    if (!selectedConversationId) {
      return null;
    }
    if (!previewConversation || previewConversation.id !== selectedConversationId) {
      return null;
    }
    return previewConversation;
  }, [previewConversation, selectedConversationId]);
  const previewMessages = useMemo(
    () => selectedConversationPreview?.messages.slice(-50) ?? [],
    [selectedConversationPreview]
  );
  const selectedConversationLastMessageAt =
    previewMessages.length > 0
      ? previewMessages[previewMessages.length - 1]?.createdAt ?? null
      : selectedHandoff?.lastMessageAt ?? null;
  const previewNeedsHydration = Boolean(selectedConversationId && !selectedConversationPreview);
  const showPreviewRefreshIndicator = previewLoading && Boolean(selectedConversationPreview);
  const openTranscriptPreview = useCallback(
    (requestId: string) => {
      if (selectedRequestId === requestId) {
        return;
      }
      setPreviewError(null);
      setPreviewLoading(true);
      setSelectedRequestId(requestId);
    },
    [selectedRequestId]
  );
  const loadConversationPreview = useCallback(async (
    conversationId: string,
    options?: {
      keepVisibleConversation?: boolean;
      force?: boolean;
      minIntervalMs?: number;
    }
  ) => {
    const minIntervalMs = options?.minIntervalMs ?? 0;
    const nowMs = Date.now();
    if (!options?.force) {
      if (previewInFlightConversationIdRef.current === conversationId) {
        return;
      }
      if (
        previewLastLoadedRef.current.conversationId === conversationId &&
        nowMs - previewLastLoadedRef.current.atMs < minIntervalMs
      ) {
        return;
      }
    }

    const requestSerial = previewRequestSerialRef.current + 1;
    previewRequestSerialRef.current = requestSerial;
    previewInFlightConversationIdRef.current = conversationId;
    setPreviewLoading(true);
    setPreviewError(null);
    if (!options?.keepVisibleConversation) {
      setPreviewConversation(null);
    }
    try {
      const result = await getConversationApi(conversationId);
      if (previewRequestSerialRef.current !== requestSerial) {
        return;
      }
      previewLastLoadedRef.current = {
        conversationId,
        atMs: Date.now()
      };
      setPreviewConversation(result.conversation);
    } catch (fetchError) {
      if (previewRequestSerialRef.current !== requestSerial) {
        return;
      }
      setPreviewError(
        fetchError instanceof Error && fetchError.message
          ? fetchError.message
          : "Unable to load conversation preview."
      );
    } finally {
      if (previewRequestSerialRef.current !== requestSerial) {
        return;
      }
      if (previewInFlightConversationIdRef.current === conversationId) {
        previewInFlightConversationIdRef.current = null;
      }
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    realtimeCursorRef.current = undefined;

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
        const hasPipelineVisibleEvent =
          result.cursorStale ||
          result.events.some((event) => {
            if (event.type === "typing") {
              return false;
            }
            if (event.type === "message_created") {
              // Required so brand-new AI-only chats appear without waiting for a handoff event.
              return true;
            }
            if (
              event.type === "handoff_requested" ||
              event.type === "handoff_claimed" ||
              event.type === "handoff_resolved"
            ) {
              return true;
            }
            return false;
          });

        if (hasPipelineVisibleEvent) {
          await refreshManagerData({ silent: true });
        }

        if (selectedConversationId && selectedConversationIsLive) {
          const selectedConversationChanged =
            result.cursorStale ||
            result.events.some(
              (event) =>
                event.conversationId === selectedConversationId &&
                event.type === "message_created"
            );
          if (selectedConversationChanged) {
            await loadConversationPreview(selectedConversationId, {
              keepVisibleConversation: true,
              minIntervalMs: PREVIEW_REFRESH_MIN_INTERVAL_MS
            });
          }
        }
      } catch (pollError) {
        if (!cancelled) {
          setError(
            pollError instanceof Error && pollError.message
              ? pollError.message
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
  }, [
    authSession.authenticated,
    loadConversationPreview,
    rangeQuery,
    refreshManagerData,
    selectedConversationId,
    selectedConversationIsLive
  ]);

  useEffect(() => {
    if (!selectedConversationId) {
      previewRequestSerialRef.current += 1;
      previewInFlightConversationIdRef.current = null;
      previewLastLoadedRef.current = {
        conversationId: null,
        atMs: 0
      };
      setPreviewConversation(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }
    void loadConversationPreview(selectedConversationId, {
      force: true
    });
  }, [loadConversationPreview, selectedConversationId]);

  useEffect(() => {
    if (selectedRequestId && !selectedHandoff) {
      setSelectedRequestId(null);
    }
  }, [selectedHandoff, selectedRequestId]);
  useEffect(() => {
    if (!selectedHandoff || previewLoading || previewMessages.length === 0) {
      return;
    }
    const timeline = previewTimelineRef.current;
    if (!timeline) {
      return;
    }
    const frameId = window.requestAnimationFrame(() => {
      timeline.scrollTop = timeline.scrollHeight;
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [selectedHandoff, previewLoading, previewMessages.length]);
  const positiveRatings = handoffs.filter((handoff) => handoff.customerRating === "thumbs_up").length;
  const negativeRatings = handoffs.filter((handoff) => handoff.customerRating === "thumbs_down").length;
  const totalRated = positiveRatings + negativeRatings;
  const positiveRatingRatio = totalRated > 0 ? positiveRatings / totalRated : 0;
  const totalMoodCount = moodCounts.calm + moodCounts.frustrated + moodCounts.escalated;
  const moodPercents = {
    calm: totalMoodCount > 0 ? Math.round((moodCounts.calm / totalMoodCount) * 100) : 0,
    frustrated: totalMoodCount > 0 ? Math.round((moodCounts.frustrated / totalMoodCount) * 100) : 0,
    escalated: totalMoodCount > 0 ? Math.round((moodCounts.escalated / totalMoodCount) * 100) : 0
  };
  const containmentPercent =
    totalEndedOrResolvedChatsCount > 0
      ? Math.round((aiEndedOrResolvedWithoutHandoffCount / totalEndedOrResolvedChatsCount) * 100)
      : 0;
  const containmentTone =
    containmentPercent >= 60 ? "#16a34a" : containmentPercent >= 40 ? "#d17a00" : "#e5484d";
  const containmentStateLabel =
    containmentPercent >= 60 ? "Healthy" : containmentPercent >= 40 ? "Moderate" : "Needs Attention";
  const containmentStateBand =
    containmentPercent >= 60 ? "low" : containmentPercent >= 40 ? "medium" : "high";
  const localTimeLabel = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const containmentProgressStyle = {
    "--manager-containment-progress": `${Math.max(0, Math.min(100, containmentPercent))}%`,
    "--manager-containment-color": containmentTone
  } as CSSProperties;
  const isInitialLoading = loading && overview === null;

  const applyRange = useCallback(
    (nextRange: ManagerDateRangeState) => {
      if (nextRange.preset === "custom" && (!nextRange.from || !nextRange.to)) {
        setError("Custom ranges require both start and end date/time.");
        return;
      }

      const params = buildManagerDateRangeSearchParams(nextRange);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router]
  );

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

  const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

  return (
    <div className={`rep-shell${isNavCollapsed ? " primary-collapsed" : ""}`}>
      <AppSideRail
        userName={authSession.user?.name}
        userAvatarUrl={authSession.user?.avatarUrl ?? null}
        userRole={toRoleLabel(authSession.role)}
        authRole={authSession.role}
        userType={authSession.userType}
        signOutPending={signOutPending}
        onCollapsedChange={setIsNavCollapsed}
        onSignOut={() => {
          void signOutAgent();
        }}
      />

      <section className={`rep-main-shell manager-shell-view${selectedHandoff ? " has-preview-panel" : ""}`}>
        <AvaSecondaryNav
          activeRoute="manager"
          canAccessManagerViews={canAccessAvaManagerViews(authSession.role)}
        />
        {error ? (
          <p className="rep-shell-error" role="alert">
            {error}
          </p>
        ) : null}

        <header className="manager-command-header">
          <div>
            <h1>Support Command</h1>
            <p>Manager Dashboard</p>
          </div>
          <div className="manager-command-live">
            <span>Live</span>
            <small>{localTimeLabel}</small>
          </div>
        </header>

        <div className="manager-filter-bar">
          <div className="manager-filter-group">
            <label htmlFor="manager-range-preset">Date range</label>
            <select
              id="manager-range-preset"
              value={draftRange.preset}
              onChange={(event) => {
                const nextPreset = event.target.value as ManagerDateRangeState["preset"];
                setDraftRange((current) => ({
                  ...current,
                  preset: nextPreset,
                  from: nextPreset === "custom" ? current.from : "",
                  to: nextPreset === "custom" ? current.to : ""
                }));
              }}
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="manager-filter-group">
            <label htmlFor="manager-range-timezone">Timezone</label>
            <input
              id="manager-range-timezone"
              type="text"
              value={draftRange.tz}
              onChange={(event) =>
                setDraftRange((current) => ({
                  ...current,
                  tz: event.target.value
                }))
              }
              placeholder={getDefaultManagerTimeZone()}
            />
          </div>
          {draftRange.preset === "custom" ? (
            <>
              <div className="manager-filter-group">
                <label htmlFor="manager-range-from">From</label>
                <input
                  id="manager-range-from"
                  type="datetime-local"
                  value={toDateTimeLocalValue(draftRange.from)}
                  onChange={(event) =>
                    setDraftRange((current) => ({
                      ...current,
                      from: fromDateTimeLocalValue(event.target.value)
                    }))
                  }
                />
              </div>
              <div className="manager-filter-group">
                <label htmlFor="manager-range-to">To</label>
                <input
                  id="manager-range-to"
                  type="datetime-local"
                  value={toDateTimeLocalValue(draftRange.to)}
                  onChange={(event) =>
                    setDraftRange((current) => ({
                      ...current,
                      to: fromDateTimeLocalValue(event.target.value)
                    }))
                  }
                />
              </div>
            </>
          ) : null}
          <div className="manager-filter-actions">
            <button
              type="button"
              className="manager-action-button secondary"
              onClick={() =>
                setDraftRange({
                  preset: "7d",
                  from: "",
                  to: "",
                  tz: getDefaultManagerTimeZone()
                })
              }
            >
              Reset
            </button>
            <button
              type="button"
              className="manager-action-button primary"
              onClick={() => applyRange(draftRange)}
            >
              Apply
            </button>
          </div>
        </div>

        <div className="manager-command-grid">
          <article className="manager-command-card containment">
            <div className="manager-containment-ring" style={containmentProgressStyle}>
              <div className="manager-containment-ring-inner">
                <strong>{isInitialLoading ? "—" : `${containmentPercent}%`}</strong>
                <span>containment</span>
              </div>
            </div>
            <div className="manager-command-copy">
              <h3>AI Containment Rate</h3>
              <p>Chats ended or resolved without handoff divided by total chats ended or resolved.</p>
              <small>
                {isInitialLoading ? (
                  <span className="manager-skeleton-line hint" />
                ) : (
                  `${aiEndedOrResolvedWithoutHandoffCount} ended/resolved without handoff / ${totalEndedOrResolvedChatsCount} total ended/resolved`
                )}
              </small>
              {!isInitialLoading ? (
                <span className={`manager-containment-state ${containmentStateBand}`}>
                  • {containmentStateLabel}
                </span>
              ) : null}
            </div>
          </article>

          <article className="manager-command-card">
            <p className="manager-command-label">Total Chats</p>
            <strong>
              {isInitialLoading ? <span className="manager-skeleton-line value" /> : totalChatsCount}
            </strong>
            <small>{isInitialLoading ? <span className="manager-skeleton-line hint" /> : "Active + completed"}</small>
          </article>
          <article className="manager-command-card">
            <p className="manager-command-label">AI Handling</p>
            <strong>
              {isInitialLoading ? <span className="manager-skeleton-line value" /> : aiHandlingCount}
            </strong>
            <small>{isInitialLoading ? <span className="manager-skeleton-line hint" /> : "In progress now"}</small>
          </article>
          <article className="manager-command-card">
            <p className="manager-command-label">AI Resolved</p>
            <strong>
              {isInitialLoading ? (
                <span className="manager-skeleton-line value" />
              ) : (
                aiEndedOrResolvedWithoutHandoffCount
              )}
            </strong>
            <small>{isInitialLoading ? <span className="manager-skeleton-line hint" /> : "No agent needed"}</small>
          </article>
          <article className="manager-command-card">
            <p className="manager-command-label">Pending Handoff</p>
            <strong>
              {isInitialLoading ? <span className="manager-skeleton-line value" /> : handoffStatusCounts.pending}
            </strong>
            <small>{isInitialLoading ? <span className="manager-skeleton-line hint" /> : "Waiting for agent"}</small>
          </article>
          <article className="manager-command-card">
            <p className="manager-command-label">Agents Online</p>
            <strong>
              {isInitialLoading ? (
                <span className="manager-skeleton-line value" />
              ) : (
                `${onlineAgentsCount}/${totalAgentsCount}`
              )}
            </strong>
            <small>
              {isInitialLoading ? (
                <span className="manager-skeleton-line hint" />
              ) : (
                `${handoffStatusCounts.withAgent} chats with agent`
              )}
            </small>
          </article>
          <article className="manager-command-card">
            <p className="manager-command-label">Agent Resolved</p>
            <strong>
              {isInitialLoading ? (
                <span className="manager-skeleton-line value" />
              ) : (
                endedOrResolvedWithHandoffCount
              )}
            </strong>
            <small>
              {isInitialLoading ? (
                <span className="manager-skeleton-line hint" />
              ) : (
                `👍 ${positiveRatings} · 👎 ${negativeRatings}`
              )}
            </small>
          </article>
        </div>

        <div className="manager-sentiment-row">
          <section className="manager-sentiment-card">
            <header>
              <strong>Customer Sentiment</strong>
              <small>
                {isInitialLoading ? <span className="manager-skeleton-line hint" /> : `${moodCounts.escalated} at-risk w/ AI`}
              </small>
            </header>
            <div className="manager-sentiment-track">
              <span className="calm" style={{ width: `${moodPercents.calm}%` }} />
              <span className="frustrated" style={{ width: `${moodPercents.frustrated}%` }} />
              <span className="escalated" style={{ width: `${moodPercents.escalated}%` }} />
            </div>
            <p className="manager-sentiment-legend">
              {isInitialLoading ? (
                <span className="manager-skeleton-line legend" />
              ) : (
                <>
                  <span className="calm">● {moodCounts.calm} Calm ({moodPercents.calm}%)</span>
                  <span className="frustrated">
                    ● {moodCounts.frustrated} Frustrated ({moodPercents.frustrated}%)
                  </span>
                  <span className="escalated">
                    ● {moodCounts.escalated} Escalated ({moodPercents.escalated}%)
                  </span>
                </>
              )}
            </p>
          </section>

          <section className="manager-satisfaction-card">
            <header>
              <strong>Agent Satisfaction</strong>
              <small>
                {isInitialLoading ? (
                  <span className="manager-skeleton-line hint" />
                ) : totalRated > 0 ? (
                  `${formatPercent(positiveRatingRatio)} positive`
                ) : (
                  "No ratings yet"
                )}
              </small>
            </header>
            <div className="manager-satisfaction-track">
              <div
                className="manager-satisfaction-fill"
                style={{ width: `${Math.round(positiveRatingRatio * 100)}%` }}
              />
            </div>
            <p>
              {isInitialLoading ? (
                <span className="manager-skeleton-line legend" />
              ) : (
                <>
                  👍 {positiveRatings} positive <span>👎 {negativeRatings} negative</span>
                </>
              )}
            </p>
          </section>
        </div>

        <section className="manager-pipeline-section">
          <div className="manager-pipeline-header">
            <h2>Chat Pipeline</h2>
            <div className="manager-chip-group mood">
              {moodFilterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`manager-chip mood-${tab.id}${moodFilter === tab.id ? " active" : ""}`}
                  onClick={() => setMoodFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`manager-pipeline-layout${selectedHandoff ? " has-preview" : ""}`}>
            <div className="manager-pipeline-grid">
              {pipelineLanes.map((lane) => {
                const laneCount = lane.count;

                return (
                  <section key={lane.id} className={`manager-pipeline-lane ${lane.id}`}>
                    <header className="manager-pipeline-lane-head">
                      <strong>{lane.label}</strong>
                      <span className="manager-pipeline-count">{laneCount}</span>
                    </header>

                    <div className="manager-pipeline-list">
                      {lane.items.length === 0 ? (
                      isInitialLoading ? (
                        <>
                          <article className="manager-chat-card skeleton" />
                          <article className="manager-chat-card skeleton" />
                          <article className="manager-chat-card skeleton" />
                        </>
                      ) : (
                        <p className="manager-pipeline-empty">
                          {lane.id === "ai_handling"
                            ? "No AI-only chat cards in handoff feed."
                            : "No chats in this lane."}
                        </p>
                      )
                      ) : (
                        lane.items.map((handoff) => {
                          const customerMood = getMoodFromSensitivityBand(handoff.customerSensitivityBand);
                          const handoffLane = getPipelineLaneForHandoff(handoff);
                          const cardStatus = getManagerCardStatus(handoff);
                          const healthLabel = handoff.needsAttention
                            ? "Needs attention"
                            : handoff.slowFirstReply
                              ? "Slow first reply"
                              : null;
                          const agentLabel =
                            handoffLane === "pending"
                              ? "Awaiting agent"
                              : handoff.assignedAgentName || "AI Chatbot";
                          const showAgentProfile =
                            Boolean(handoff.assignedAgentName) || Boolean(handoff.assignedAgentAvatarUrl);

                          return (
                            <article
                              key={handoff.requestId}
                              className={`manager-chat-card mood-${customerMood} clickable${
                                selectedRequestId === handoff.requestId ? " selected" : ""
                              }`}
                              role="button"
                              tabIndex={0}
                              onClick={() => openTranscriptPreview(handoff.requestId)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  openTranscriptPreview(handoff.requestId);
                                }
                              }}
                            >
                              <div className="manager-chat-head">
                                <div className="manager-chat-identity">
                                  <InitialChip
                                    initials={getNameInitials(handoff.customerName, "CU")}
                                    avatarUrl={handoff.customerAvatarUrl}
                                    tone="sand"
                                    size={28}
                                  />
                                  <div>
                                    <h4>{handoff.customerName}</h4>
                                    <p>Request {handoff.requestId.slice(0, 8)}</p>
                                  </div>
                                </div>
                                <span className={`manager-mood-pill ${customerMood}`}>
                                  {formatMoodLabel(customerMood)}
                                </span>
                              </div>

                              <div className="manager-chat-meta">
                                <span className="manager-chat-agent">
                                  {showAgentProfile ? (
                                    <InitialChip
                                      initials={getNameInitials(handoff.assignedAgentName, "AG")}
                                      avatarUrl={handoff.assignedAgentAvatarUrl}
                                      tone="sand"
                                      size={20}
                                    />
                                  ) : (
                                    <AvaOrb size={20} />
                                  )}
                                  <span>{agentLabel}</span>
                                </span>
                                <span>{formatRelativeAgo(handoff.lastMessageAt)}</span>
                              </div>

                              <div className="manager-chat-meta">
                                <span className="manager-chat-satisfaction">
                                  {formatAgentSatisfaction(handoff.customerRating)}
                                </span>
                                <span className={`manager-chat-status ${cardStatus}`}>
                                  {formatManagerCardStatus(cardStatus)}
                                </span>
                              </div>

                              {healthLabel ? <p className="manager-chat-health-note">{healthLabel}</p> : null}
                            </article>
                          );
                        })
                      )}
                    </div>
                  </section>
                );
              })}
            </div>

            {selectedHandoff ? (
              <aside className="manager-preview-panel" aria-live="polite">
                <header className="manager-preview-header">
                  <div>
                    <h3>{selectedHandoff.customerName}</h3>
                    <p>
                      {getPipelineLaneForHandoff(selectedHandoff) === "resolved"
                        ? "Resolved transcript"
                        : "Live chat preview (updates automatically)"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="manager-action-button secondary"
                    onClick={() => setSelectedRequestId(null)}
                  >
                    Close
                  </button>
                </header>

                <div className="manager-preview-meta">
                  <span>{selectedHandoff.conversationId}</span>
                  <span>
                    {showPreviewRefreshIndicator ? (
                      <span className="manager-preview-refreshing" role="status" aria-live="polite">
                        <span className="inline-button-spinner" aria-hidden="true" /> Refreshing...
                      </span>
                    ) : (
                      <RelativeAgoLabel
                        iso={selectedConversationLastMessageAt}
                        live={selectedConversationIsLive}
                      />
                    )}
                  </span>
                </div>

                {previewError && !selectedConversationPreview ? (
                  <p className="manager-preview-error">{previewError}</p>
                ) : previewNeedsHydration ? (
                  <div className="manager-preview-loading" role="status" aria-live="polite">
                    <p className="manager-preview-state loading">
                      <span className="inline-button-spinner" aria-hidden="true" />
                      Loading transcript...
                    </p>
                    <article className="manager-chat-card skeleton" />
                    <article className="manager-chat-card skeleton" />
                    <article className="manager-chat-card skeleton" />
                  </div>
                ) : previewMessages.length === 0 ? (
                  <p className="manager-preview-state">No messages available yet.</p>
                ) : (
                  <div className="chat-timeline manager-preview-timeline" ref={previewTimelineRef}>
                    {previewMessages.map((message) => {
                      if (message.kind === "system") {
                        return (
                          <div className="timeline-row system" key={message.id}>
                            <span>✓</span>
                            <strong>{message.text}</strong>
                          </div>
                        );
                      }

                      if (message.kind === "representative") {
                        return (
                          <div className="timeline-row right" key={message.id}>
                            <p className="msg-bubble rep">{message.text}</p>
                            <InitialChip
                              initials={getNameInitials(message.representative?.name, "AG")}
                              avatarUrl={message.representative?.avatarUrl ?? null}
                              tone="sand"
                              size={25}
                            />
                          </div>
                        );
                      }

                      const isCustomer = message.kind === "customer";
                      const customerSentimentLevel = getCustomerMessageSentimentLevel(message);
                      return (
                        <div className="timeline-row left" key={message.id}>
                          {isCustomer ? (
                            <InitialChip initials={selectedCustomerInitials} tone="sand" size={25} />
                          ) : (
                            <AvaOrb size={25} />
                          )}
                          <p className={`msg-bubble ${isCustomer ? "customer" : "ava"}`}>{message.text}</p>
                          {isCustomer && customerSentimentLevel ? (
                            <span
                              className={`customer-sentiment-dot ${customerSentimentLevel}`}
                              title={getCustomerMessageSentimentLabel(customerSentimentLevel)}
                              aria-label={getCustomerMessageSentimentLabel(customerSentimentLevel)}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </aside>
            ) : null}
          </div>
        </section>

      </section>
    </div>
  );
}
