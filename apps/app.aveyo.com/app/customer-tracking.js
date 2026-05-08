"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { authApiRequest } from "../lib/auth/session";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function sevenDaysAgoStr() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// Data hook
// ---------------------------------------------------------------------------

function useCustomerTracking({ refreshIntervalSeconds = 30, dateFrom, dateTo } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nextRefreshIn, setNextRefreshIn] = useState(refreshIntervalSeconds);

  const dateFromRef = useRef(dateFrom);
  const dateToRef = useRef(dateTo);
  dateFromRef.current = dateFrom;
  dateToRef.current = dateTo;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = dateFromRef.current;
      const to = dateToRef.current;
      const params = from && to ? `?dateFrom=${from}&dateTo=${to}` : "";
      const result = await authApiRequest(`/api/customer-tracking${params}`);
      setData(result);
      setNextRefreshIn(refreshIntervalSeconds);
    } catch (err) {
      setError(err?.message ?? "Failed to load customer tracking data.");
    } finally {
      setLoading(false);
    }
  }, [refreshIntervalSeconds]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Re-fetch when date range changes
  const prevFromRef = useRef(dateFrom);
  const prevToRef = useRef(dateTo);
  useEffect(() => {
    if (prevFromRef.current !== dateFrom || prevToRef.current !== dateTo) {
      prevFromRef.current = dateFrom;
      prevToRef.current = dateTo;
      if (dateFrom && dateTo) fetchData();
    }
  }, [dateFrom, dateTo, fetchData]);

  // Auto-refresh countdown + periodic refetch
  useEffect(() => {
    const tick = setInterval(() => {
      setNextRefreshIn((prev) => {
        if (prev <= 1) {
          fetchData();
          return refreshIntervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [fetchData, refreshIntervalSeconds]);

  return { data, loading, error, nextRefreshIn, refetch: fetchData };
}

// ---------------------------------------------------------------------------
// Live Count Card
// ---------------------------------------------------------------------------

function LiveCountCard({ count, totalCustomers, loading, nextRefreshIn, onRefresh }) {
  return (
    <div className="ct-card">
      <div className="ct-card-header">
        <div>
          <p className="ct-card-label">
            <span className="ct-live-dot" aria-hidden="true" />
            Live Now
          </p>
          <p className="ct-card-sub">Active in the last 30 minutes</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="ct-icon-btn"
          title="Refresh"
          aria-label="Refresh live count"
        >
          <RefreshIcon spinning={loading} />
        </button>
      </div>
      <div className="ct-big-number">{loading ? "—" : count.toLocaleString()}</div>
      <div className="ct-card-footer">
        <span>{totalCustomers.toLocaleString()} total customers</span>
        <span>Refreshing in {nextRefreshIn}s</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date Range Card
// ---------------------------------------------------------------------------

function DateRangeCard({ count, loading, onQuery }) {
  const [from, setFrom] = useState(sevenDaysAgoStr());
  const [to, setTo] = useState(todayStr());

  function handleSubmit(e) {
    e.preventDefault();
    if (from && to) onQuery(from, to);
  }

  return (
    <div className="ct-card">
      <div className="ct-card-header">
        <div>
          <p className="ct-card-label">Login History</p>
          <p className="ct-card-sub">Customers last active in date range</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="ct-date-form">
        <div className="ct-date-row">
          <label className="ct-date-field">
            <span>From</span>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="ct-date-input"
            />
          </label>
          <label className="ct-date-field">
            <span>To</span>
            <input
              type="date"
              value={to}
              min={from}
              max={todayStr()}
              onChange={(e) => setTo(e.target.value)}
              className="ct-date-input"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={loading || !from || !to}
          className="ct-search-btn"
        >
          {loading ? "Loading…" : "Search"}
        </button>
      </form>

      {count !== null && !loading && (
        <div className="ct-range-result">
          <span className="ct-big-number ct-big-number--sm">{count.toLocaleString()}</span>
          <span className="ct-range-label">{count === 1 ? "customer" : "customers"}</span>
        </div>
      )}
      {count === null && !loading && (
        <p className="ct-hint">Select a date range and press Search.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Milestone Breakdown Card
// ---------------------------------------------------------------------------

function MilestoneBreakdownCard({ milestones, loading }) {
  const [selectedStage, setSelectedStage] = useState("");

  const activeStages = milestones.filter((m) => m.customerCount > 0);
  const displayed =
    selectedStage !== ""
      ? milestones.filter((m) => String(m.stage) === selectedStage)
      : activeStages;
  const maxCount = Math.max(...milestones.map((m) => m.customerCount), 1);

  return (
    <div className="ct-card ct-card--full">
      <div className="ct-card-header">
        <div>
          <p className="ct-card-label">Customers by Project Stage</p>
          <p className="ct-card-sub">
            Distinct customers with at least one active project at each milestone
          </p>
        </div>
        <select
          value={selectedStage}
          onChange={(e) => setSelectedStage(e.target.value)}
          className="ct-stage-select"
          aria-label="Filter by stage"
        >
          <option value="">All active stages</option>
          {milestones.map((m) => (
            <option key={m.stage} value={String(m.stage)}>
              Stage {m.name} – {m.fullName}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="ct-loading-row">
          <RefreshIcon spinning />
          <span>Loading stages…</span>
        </div>
      ) : displayed.length === 0 ? (
        <p className="ct-hint">No customers at selected stage.</p>
      ) : (
        <div className="ct-bar-list">
          {displayed.map((m) => (
            <div key={m.stage} className="ct-bar-row">
              <span className="ct-bar-label">{m.fullName}</span>
              <div className="ct-bar-track">
                <div
                  className="ct-bar-fill"
                  style={{
                    width: `${Math.max((m.customerCount / maxCount) * 100, 1.5)}%`,
                  }}
                />
              </div>
              <span className="ct-bar-count">{m.customerCount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {!loading && selectedStage !== "" && displayed[0] && (
        <div className="ct-stage-total">
          <span className="ct-big-number ct-big-number--sm">
            {displayed[0].customerCount.toLocaleString()}
          </span>
          <span className="ct-range-label">{displayed[0].fullName}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Refresh icon (inline SVG – no external dep)
// ---------------------------------------------------------------------------

function RefreshIcon({ spinning }) {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={spinning ? { animation: "ct-spin 0.8s linear infinite" } : undefined}
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main section
// ---------------------------------------------------------------------------

export default function CustomerTrackingSection() {
  const [dateFrom, setDateFrom] = useState(undefined);
  const [dateTo, setDateTo] = useState(undefined);

  const { data, loading, error, nextRefreshIn, refetch } = useCustomerTracking({
    refreshIntervalSeconds: 30,
    dateFrom,
    dateTo,
  });

  function handleDateQuery(from, to) {
    setDateFrom(from);
    setDateTo(to);
  }

  if (error) {
    return (
      <section className="ct-section" aria-label="Customer Portal Activity">
        <div className="ct-section-header">
          <h2 className="ct-section-title">Customer Portal Activity</h2>
        </div>
        <div className="ct-error-card">
          <p className="ct-error-title">Failed to load customer tracking</p>
          <p className="ct-error-msg">{error}</p>
          <button onClick={refetch} className="ct-retry-btn">
            Try again
          </button>
        </div>
      </section>
    );
  }

  const liveCount = data?.liveCount ?? 0;
  const totalCustomers = data?.totalCustomers ?? 0;
  const dateRangeCount = data?.dateRangeCount ?? null;
  const milestones = data?.milestoneBreakdown ?? [];

  return (
    <section className="ct-section" aria-label="Customer Portal Activity">
      <div className="ct-section-header">
        <div className="ct-section-title-row">
          <span className="ct-section-icon" aria-hidden="true">◎</span>
          <h2 className="ct-section-title">Customer Portal Activity</h2>
        </div>
        <p className="ct-section-desc">
          Real-time logins, date range history, and project milestone breakdown
        </p>
      </div>

      <div className="ct-top-row">
        <LiveCountCard
          count={liveCount}
          totalCustomers={totalCustomers}
          loading={loading}
          nextRefreshIn={nextRefreshIn}
          onRefresh={refetch}
        />
        <DateRangeCard
          count={dateRangeCount}
          loading={loading && dateFrom !== undefined}
          onQuery={handleDateQuery}
        />
      </div>

      <MilestoneBreakdownCard
        milestones={milestones}
        loading={loading && milestones.length === 0}
      />
    </section>
  );
}
