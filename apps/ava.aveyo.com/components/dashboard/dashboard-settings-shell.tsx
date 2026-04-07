"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildAuthLoginUrl } from "@/lib/auth/config";
import { logoutAuthSession } from "@/lib/auth/session";
import { useAuthSession } from "@/lib/auth/use-auth-session";
import {
  getManagerAgentsApi,
  getManagerConfigApi,
  updateManagerConfigApi,
  type ManagerAgentRecord,
  type ManagerConfig
} from "@/lib/dashboard-api";
import { getDefaultManagerTimeZone } from "@/lib/manager-date-range";
import { AppSideRail } from "@/components/app-side-rail";
import { AvaSecondaryNav } from "@/components/ava-secondary-nav";

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

export function DashboardSettingsShell() {
  const authSession = useAuthSession();
  const [signOutPending, setSignOutPending] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<ManagerAgentRecord[]>([]);
  const [configDraft, setConfigDraft] = useState<ManagerConfig | null>(null);
  const [configUpdatedAt, setConfigUpdatedAt] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  const agentsRangeQuery = useMemo(
    () => ({
      preset: "7d" as const,
      tz: getDefaultManagerTimeZone()
    }),
    []
  );

  const loadSettingsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [agentsResult, configResult] = await Promise.all([
        getManagerAgentsApi(agentsRangeQuery),
        getManagerConfigApi()
      ]);
      setAgents(agentsResult.agents);
      setConfigDraft(configResult.config);
      setConfigUpdatedAt(configResult.updatedAt);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error && fetchError.message
          ? fetchError.message
          : "Unable to load settings."
      );
    } finally {
      setLoading(false);
    }
  }, [agentsRangeQuery]);

  useEffect(() => {
    void loadSettingsData();
  }, [loadSettingsData]);

  const saveConfig = async () => {
    if (!configDraft) {
      return;
    }

    setSavingConfig(true);
    setError(null);
    try {
      const result = await updateManagerConfigApi({
        timezone: configDraft.timezone,
        workingHours: {
          enabled: configDraft.workingHours.enabled,
          weekdays: configDraft.workingHours.weekdays,
          startHour24: configDraft.workingHours.startHour24,
          endHour24: configDraft.workingHours.endHour24
        },
        thresholds: {
          slowFirstReplyMinutes: configDraft.thresholds.slowFirstReplyMinutes,
          stalledConversationMinutes: configDraft.thresholds.stalledConversationMinutes
        }
      });
      setConfigDraft(result.config);
      setConfigUpdatedAt(result.updatedAt);
      await loadSettingsData();
    } catch (saveError) {
      setError(
        saveError instanceof Error && saveError.message
          ? saveError.message
          : "Unable to update manager config."
      );
    } finally {
      setSavingConfig(false);
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
    } finally {
      setSignOutPending(false);
    }
  };

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
  const isInitialLoading = loading && !configDraft && agents.length === 0;

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

      <section className="rep-main-shell manager-shell-view">
        <AvaSecondaryNav activeRoute="settings" />
        {error ? (
          <p className="rep-shell-error" role="alert">
            {error}
          </p>
        ) : null}

        <header className="manager-command-header">
          <div>
            <h1>Ava Settings</h1>
            <p>Team configuration and routing controls</p>
          </div>
        </header>

        <div className="manager-settings-grid">
          <section className="manager-panel">
            <header className="manager-panel-header">
              <h2>Agent Directory</h2>
              <small>Last 7 days</small>
            </header>
            <div className="manager-agent-list">
              {isInitialLoading ? (
                <>
                  <article className="manager-agent-list-item skeleton" />
                  <article className="manager-agent-list-item skeleton" />
                  <article className="manager-agent-list-item skeleton" />
                </>
              ) : agents.length === 0 ? (
                <p className="rep-shell-hint">No agent activity found for this date range.</p>
              ) : (
                agents.map((agent) => (
                  <article key={agent.agentId} className="manager-agent-list-item">
                    <div>
                      <strong>{agent.name}</strong>
                      <p>
                        {agent.avgRating === null
                          ? "No rating yet"
                          : `Avg ${agent.avgRating.toFixed(2)} (${agent.ratingCount})`}
                      </p>
                    </div>
                    <div>
                      <span className={`manager-status-pill ${agent.status}`}>
                        {agent.status === "online" ? "Online" : "Offline"}
                      </span>
                      <p>{agent.activeHandoffs} active chats</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="manager-panel">
            <header className="manager-panel-header">
              <h2>Customer Care Working Hours</h2>
              <small>{configUpdatedAt ? `Last updated ${formatAgo(configUpdatedAt)}` : "Not updated yet"}</small>
            </header>
            {configDraft ? (
              <div className="manager-config-grid">
                <label>
                  Timezone
                  <input
                    type="text"
                    value={configDraft.timezone}
                    onChange={(event) =>
                      setConfigDraft((current) =>
                        current
                          ? {
                              ...current,
                              timezone: event.target.value
                            }
                          : current
                      )
                    }
                  />
                </label>
                <label className="manager-inline-toggle">
                  <input
                    type="checkbox"
                    checked={configDraft.workingHours.enabled}
                    onChange={(event) =>
                      setConfigDraft((current) =>
                        current
                          ? {
                              ...current,
                              workingHours: {
                                ...current.workingHours,
                                enabled: event.target.checked
                              }
                            }
                          : current
                      )
                    }
                  />
                  Enable working hours
                </label>
                <label>
                  Start hour (0-23)
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={configDraft.workingHours.startHour24}
                    onChange={(event) =>
                      setConfigDraft((current) =>
                        current
                          ? {
                              ...current,
                              workingHours: {
                                ...current.workingHours,
                                startHour24: Number(event.target.value)
                              }
                            }
                          : current
                      )
                    }
                  />
                </label>
                <label>
                  End hour (0-23)
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={configDraft.workingHours.endHour24}
                    onChange={(event) =>
                      setConfigDraft((current) =>
                        current
                          ? {
                              ...current,
                              workingHours: {
                                ...current.workingHours,
                                endHour24: Number(event.target.value)
                              }
                            }
                          : current
                      )
                    }
                  />
                </label>
                <label>
                  Weekdays (0-6 comma-separated)
                  <input
                    type="text"
                    value={configDraft.workingHours.weekdays.join(",")}
                    onChange={(event) =>
                      setConfigDraft((current) =>
                        current
                          ? {
                              ...current,
                              workingHours: {
                                ...current.workingHours,
                                weekdays: event.target.value
                                  .split(",")
                                  .map((value) => Number(value.trim()))
                                  .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
                              }
                            }
                          : current
                      )
                    }
                  />
                </label>
                <label>
                  Slow first reply threshold (minutes)
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={configDraft.thresholds.slowFirstReplyMinutes}
                    onChange={(event) =>
                      setConfigDraft((current) =>
                        current
                          ? {
                              ...current,
                              thresholds: {
                                ...current.thresholds,
                                slowFirstReplyMinutes: Number(event.target.value)
                              }
                            }
                          : current
                      )
                    }
                  />
                </label>
                <label>
                  Stalled conversation threshold (minutes)
                  <input
                    type="number"
                    min={2}
                    max={240}
                    value={configDraft.thresholds.stalledConversationMinutes}
                    onChange={(event) =>
                      setConfigDraft((current) =>
                        current
                          ? {
                              ...current,
                              thresholds: {
                                ...current.thresholds,
                                stalledConversationMinutes: Number(event.target.value)
                              }
                            }
                          : current
                      )
                    }
                  />
                </label>
                <div className="manager-config-actions">
                  <button
                    type="button"
                    className="manager-action-button primary"
                    onClick={() => {
                      void saveConfig();
                    }}
                    disabled={savingConfig}
                  >
                    {savingConfig ? "Saving..." : "Save settings"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="manager-config-grid skeleton">
                <div className="manager-skeleton-line field" />
                <div className="manager-skeleton-line field" />
                <div className="manager-skeleton-line field" />
                <div className="manager-skeleton-line field" />
                <div className="manager-skeleton-line field" />
                <div className="manager-skeleton-line field" />
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
