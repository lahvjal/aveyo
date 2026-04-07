"use client";

import { type ConversationThread } from "@ava/chat-domain";
import { AvaOrb } from "@ava/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildAuthLoginUrl } from "@/lib/auth/config";
import { logoutAuthSession } from "@/lib/auth/session";
import { useAuthSession } from "@/lib/auth/use-auth-session";
import {
  getConversationApi,
  getManagerAgentsApi,
  getManagerHandoffsApi,
  getManagerOverviewApi,
  type ManagerAgentRecord,
  type ManagerHandoffRecord,
  type ManagerOverviewResult
} from "@/lib/dashboard-api";
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

  const refreshManagerData = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [rangeQuery]);

  useEffect(() => {
    void refreshManagerData();
  }, [refreshManagerData]);

  const handoffStatusCounts = useMemo(() => {
    const counts = {
      pending: 0,
      withAgent: 0,
      agentResolved: 0
    };
    for (const handoff of handoffs) {
      if (handoff.status === "pending") {
        counts.pending += 1;
        continue;
      }
      if (handoff.status === "active" || handoff.status === "claimed") {
        counts.withAgent += 1;
        continue;
      }
      if (handoff.status === "resolved") {
        counts.agentResolved += 1;
      }
    }
    return counts;
  }, [handoffs]);
  const totalChatsCount =
    (overview?.metrics.customerChatsWithAva ?? 0) + (overview?.metrics.employeeChatsWithAva ?? 0);
  const aiResolvedCount = Math.max(
    0,
    Math.round((overview?.metrics.containmentRate ?? 0) * totalChatsCount)
  );
  const aiHandlingCount = Math.max(
    0,
    totalChatsCount -
      aiResolvedCount -
      handoffStatusCounts.pending -
      handoffStatusCounts.withAgent -
      handoffStatusCounts.agentResolved
  );
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
  const pipelineLanes = useMemo(() => {
    const byLane: Record<PipelineLaneId, ManagerHandoffRecord[]> = {
      ai_handling: [],
      pending: [],
      with_agent: [],
      resolved: []
    };

    for (const handoff of moodFilteredHandoffs) {
      if (handoff.status === "resolved") {
        byLane.resolved.push(handoff);
        continue;
      }
      if (handoff.status === "pending") {
        byLane.pending.push(handoff);
        continue;
      }
      if (handoff.assignedAgentId || handoff.assignedAgentName) {
        byLane.with_agent.push(handoff);
        continue;
      }
      byLane.ai_handling.push(handoff);
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
  const selectedHandoff = useMemo(
    () => handoffs.find((handoff) => handoff.requestId === selectedRequestId) ?? null,
    [handoffs, selectedRequestId]
  );
  const selectedCustomerInitials = useMemo(
    () => getNameInitials(selectedHandoff?.customerName, "CU"),
    [selectedHandoff]
  );
  const previewMessages = useMemo(() => previewConversation?.messages.slice(-50) ?? [], [previewConversation]);
  const loadConversationPreview = useCallback(async (conversationId: string) => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const result = await getConversationApi(conversationId);
      setPreviewConversation(result.conversation);
    } catch (fetchError) {
      setPreviewError(
        fetchError instanceof Error && fetchError.message
          ? fetchError.message
          : "Unable to load conversation preview."
      );
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedHandoff) {
      setPreviewConversation(null);
      setPreviewError(null);
      return;
    }
    void loadConversationPreview(selectedHandoff.conversationId);
  }, [loadConversationPreview, selectedHandoff]);

  useEffect(() => {
    if (!selectedHandoff || selectedHandoff.status === "resolved") {
      return;
    }
    const intervalId = window.setInterval(() => {
      void loadConversationPreview(selectedHandoff.conversationId);
    }, 12000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadConversationPreview, selectedHandoff]);

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
  const containmentPercent = Math.round((overview?.metrics.containmentRate ?? 0) * 100);
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
  const formatAgo = (iso: string | null) => {
    if (!iso) {
      return "—";
    }
    const timeMs = new Date(iso).getTime();
    if (Number.isNaN(timeMs)) {
      return "—";
    }
    const deltaSeconds = Math.max(0, Math.floor((Date.now() - timeMs) / 1000));
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
  };

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
        <AvaSecondaryNav activeRoute="manager" />
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
              <p>Chats fully resolved by AI without agent handoff.</p>
              <small>
                {isInitialLoading ? (
                  <span className="manager-skeleton-line hint" />
                ) : (
                  `${aiResolvedCount} AI resolved / ${handoffStatusCounts.agentResolved} Agent resolved`
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
              {isInitialLoading ? <span className="manager-skeleton-line value" /> : aiResolvedCount}
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
            <p className="manager-command-label">With Agent</p>
            <strong>
              {isInitialLoading ? <span className="manager-skeleton-line value" /> : handoffStatusCounts.withAgent}
            </strong>
            <small>
              {isInitialLoading ? (
                <span className="manager-skeleton-line hint" />
              ) : (
                `${agents.filter((agent) => agent.status === "online").length} agents online`
              )}
            </small>
          </article>
          <article className="manager-command-card">
            <p className="manager-command-label">Agent Resolved</p>
            <strong>
              {isInitialLoading ? <span className="manager-skeleton-line value" /> : handoffStatusCounts.agentResolved}
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
                const laneCount =
                  lane.id === "ai_handling" && moodFilter === "all"
                    ? Math.max(lane.count, aiHandlingCount)
                    : lane.count;

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
                          const healthLabel = handoff.needsAttention
                            ? "Needs attention"
                            : handoff.slowFirstReply
                              ? "Slow first reply"
                              : null;

                          return (
                            <article
                              key={handoff.requestId}
                              className={`manager-chat-card mood-${customerMood} clickable${
                                selectedRequestId === handoff.requestId ? " selected" : ""
                              }`}
                              role="button"
                              tabIndex={0}
                              onClick={() => setSelectedRequestId(handoff.requestId)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  setSelectedRequestId(handoff.requestId);
                                }
                              }}
                            >
                              <div className="manager-chat-head">
                                <div>
                                  <h4>{handoff.customerName}</h4>
                                  <p>Request {handoff.requestId.slice(0, 8)}</p>
                                </div>
                                <span className={`manager-mood-pill ${customerMood}`}>
                                  {formatMoodLabel(customerMood)}
                                </span>
                              </div>

                              <div className="manager-chat-meta">
                                <span>
                                  {handoff.status === "pending"
                                    ? "Awaiting agent"
                                    : handoff.assignedAgentName || "AI Chatbot"}
                                </span>
                                <span>{formatAgo(handoff.lastMessageAt)}</span>
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
                      {selectedHandoff.status === "resolved"
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
                  <span>{formatAgo(selectedHandoff.lastMessageAt)}</span>
                </div>

                {previewLoading && !previewConversation ? (
                  <p className="manager-preview-state">Loading conversation...</p>
                ) : previewError ? (
                  <p className="manager-preview-error">{previewError}</p>
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
                      return (
                        <div className="timeline-row left" key={message.id}>
                          {isCustomer ? (
                            <InitialChip initials={selectedCustomerInitials} tone="sand" size={25} />
                          ) : (
                            <AvaOrb size={25} />
                          )}
                          <p className={`msg-bubble ${isCustomer ? "customer" : "ava"}`}>{message.text}</p>
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
