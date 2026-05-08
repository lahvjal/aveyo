'use client';

import { useState, FormEvent } from 'react';
import { Users, RefreshCw, AlertCircle, Calendar, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomerTracking } from '@/hooks/use-customer-tracking';
import type { MilestoneCustomerCount } from '@/hooks/use-customer-tracking';

// =============================================================================
// HELPERS
// =============================================================================

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function sevenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface LiveCountCardProps {
  count: number;
  totalCustomers: number;
  loading: boolean;
  nextRefreshIn: number;
  onRefresh: () => void;
}

function LiveCountCard({ count, totalCustomers, loading, nextRefreshIn, onRefresh }: LiveCountCardProps) {
  return (
    <div className="rounded-card border border-slate-200 bg-white p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-600 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            Live Now
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Active in the last 30 minutes</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="flex-1">
        <span className="text-5xl font-bold text-slate-900 tabular-nums">{loading ? '—' : count}</span>
        <span className="ml-2 text-sm text-slate-500">
          {count === 1 ? 'customer' : 'customers'}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-2">
        <span>of {totalCustomers.toLocaleString()} total</span>
        <span>Refreshing in {nextRefreshIn}s</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface DateRangeCardProps {
  count: number | null;
  loading: boolean;
  onQuery: (from: string, to: string) => void;
}

function DateRangeCard({ count, loading, onQuery }: DateRangeCardProps) {
  const [from, setFrom] = useState(sevenDaysAgo());
  const [to, setTo] = useState(today());

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (from && to) onQuery(from, to);
  }

  return (
    <div className="rounded-card border border-slate-200 bg-white p-5 flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-medium text-slate-600 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          Login History
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">Customers last active in date range</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">From</label>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-400 text-slate-800"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">To</label>
            <input
              type="date"
              value={to}
              min={from}
              max={today()}
              onChange={(e) => setTo(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-400 text-slate-800"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !from || !to}
          className="w-full text-sm font-medium px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Loading…' : 'Search'}
        </button>
      </form>

      {count !== null && !loading && (
        <div className="border-t border-slate-100 pt-3 flex items-baseline gap-2">
          <span className="text-4xl font-bold text-slate-900 tabular-nums">{count}</span>
          <span className="text-sm text-slate-500">
            {count === 1 ? 'customer' : 'customers'}
          </span>
        </div>
      )}
      {count === null && !loading && (
        <p className="text-xs text-slate-400 border-t border-slate-100 pt-3">
          Select a date range and press Search.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

interface MilestoneBreakdownCardProps {
  milestones: MilestoneCustomerCount[];
  loading: boolean;
}

function MilestoneBreakdownCard({ milestones, loading }: MilestoneBreakdownCardProps) {
  const [selectedStage, setSelectedStage] = useState<number | null>(null);

  const maxCount = Math.max(...milestones.map((m) => m.customerCount), 1);
  const activeStages = milestones.filter((m) => m.customerCount > 0);
  const displayed = selectedStage !== null
    ? milestones.filter((m) => m.stage === selectedStage)
    : activeStages;

  return (
    <div className="rounded-card border border-slate-200 bg-white p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-medium text-slate-600 flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-400" />
            Customers by Project Stage
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Distinct customers with at least one active project at each milestone
          </p>
        </div>

        <select
          value={selectedStage ?? ''}
          onChange={(e) => setSelectedStage(e.target.value ? Number(e.target.value) : null)}
          className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-400 text-slate-700 bg-white"
        >
          <option value="">All active stages</option>
          {milestones.map((m) => (
            <option key={m.stage} value={m.stage}>
              Stage {m.name} – {m.fullName}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-5 w-5 animate-spin text-slate-300" />
        </div>
      ) : displayed.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">No data for selected stage.</p>
      ) : (
        <div className="space-y-2">
          {displayed.map((m) => (
            <div key={m.stage} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs text-slate-500 text-right leading-tight">
                {m.fullName}
              </span>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-all duration-500"
                    style={{ width: `${Math.max((m.customerCount / maxCount) * 100, 2)}%` }}
                  />
                </div>
                <span className="w-10 text-right text-sm font-semibold text-slate-700 tabular-nums">
                  {m.customerCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && selectedStage !== null && displayed[0] && (
        <div className="border-t border-slate-100 pt-3 text-center">
          <span className="text-3xl font-bold text-slate-900">{displayed[0].customerCount}</span>
          <span className="ml-2 text-sm text-slate-500">customers</span>
          <p className="text-xs text-slate-400 mt-1">{displayed[0].fullName}</p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN SECTION
// =============================================================================

export function CustomerTrackingSection() {
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined);
  const [dateTo, setDateTo] = useState<string | undefined>(undefined);

  const { data, loading, error, nextRefreshIn, refetch } = useCustomerTracking({
    refreshIntervalSeconds: 30,
    dateFrom,
    dateTo,
  });

  function handleDateQuery(from: string, to: string) {
    setDateFrom(from);
    setDateTo(to);
  }

  if (error) {
    return (
      <section className="animate-fade-in">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Customer Portal Activity</h2>
          <p className="text-sm text-slate-500 mt-0.5">Real-time customer login tracking</p>
        </div>
        <div className="rounded-card border border-red-200 bg-red-50 p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Failed to load customer tracking</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
            <button
              onClick={refetch}
              className="text-xs font-medium text-red-600 hover:text-red-800 underline mt-2"
            >
              Try again
            </button>
          </div>
        </div>
      </section>
    );
  }

  const liveCount = data?.liveCount ?? 0;
  const totalCustomers = data?.totalCustomers ?? 0;
  const dateRangeCount = data?.dateRangeCount ?? null;
  const milestones = data?.milestoneBreakdown ?? [];

  return (
    <section className="animate-fade-in">
      {/* Section Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
          <Users className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Customer Portal Activity</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time logins, date range history, and project milestone breakdown
          </p>
        </div>
      </div>

      {/* Top row: Live count + Date range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <LiveCountCard
          count={liveCount}
          totalCustomers={totalCustomers}
          loading={loading}
          nextRefreshIn={nextRefreshIn}
          onRefresh={refetch}
        />
        <DateRangeCard
          count={dateRangeCount}
          loading={loading && (dateFrom !== undefined)}
          onQuery={handleDateQuery}
        />
      </div>

      {/* Bottom row: Milestone breakdown (full width) */}
      <MilestoneBreakdownCard
        milestones={milestones}
        loading={loading && milestones.length === 0}
      />
    </section>
  );
}
