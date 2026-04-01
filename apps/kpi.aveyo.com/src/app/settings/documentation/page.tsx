"use client";

import { useState, type ReactNode } from "react";
import { ArrowLeft, FileText, Calendar, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function DocumentationPage() {
  const [activeTab, setActiveTab] = useState<'metrics' | 'periods'>('metrics');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1800px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">KPI Documentation</h1>
              <p className="text-slate-600 mt-1">
                Complete reference for all metrics, formulas, and period definitions
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'metrics'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <FileText className="h-4 w-4" />
            Metric Dictionary
          </button>
          <button
            onClick={() => setActiveTab('periods')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'periods'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Period Definitions
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'metrics' ? (
          <MetricDictionaryTab />
        ) : (
          <PeriodDefinitionsTab />
        )}
      </div>
    </div>
  );
}

function MetricDictionaryTab() {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Click any row to expand and view complete details including formulas, validation steps, and period-specific logic.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Dashboard Metrics Reference</h2>
          <p className="text-sm text-slate-600 mt-1">
            {METRIC_DATA.length} metrics across all dashboard sections
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b-2 border-slate-300">
              <tr>
                <th className="px-3 py-3 text-left font-semibold text-slate-700 w-8"></th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700 min-w-[160px]">Card Title</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700 min-w-[140px]">Section</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700 min-w-[220px]">Question Answered</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700 min-w-[120px]">Aggregation</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700 min-w-[140px]">Period Date Field</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700 min-w-[180px]">Source Tables</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {METRIC_DATA.map((metric, index) => (
                <>
                  <tr 
                    key={index} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setExpandedRow(expandedRow === index ? null : index)}
                  >
                    <td className="px-3 py-3">
                      {expandedRow === index ? (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-900 font-medium">{metric.card_title}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        {metric.dashboard_section}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{metric.question_answered}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                        {metric.aggregation_method}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-700 font-mono text-xs">
                      {metric.period_date_field}
                    </td>
                    <td className="px-3 py-3 text-slate-700 font-mono text-xs">
                      {metric.source_tables}
                    </td>
                  </tr>
                  
                  {expandedRow === index && (
                    <tr className="bg-slate-50">
                      <td colSpan={7} className="px-3 py-4">
                        <div className="grid grid-cols-2 gap-6 ml-8">
                          {/* Left Column */}
                          <div className="space-y-4">
                            <DetailSection title="Definition" content={metric.definition_notes} />
                            
                            {metric.numerator_definition !== "N/A (count metric)" && 
                             metric.numerator_definition !== "N/A (sum metric)" && 
                             metric.numerator_definition !== "N/A (sum metric - no period filter)" && 
                             metric.numerator_definition !== "N/A (count metric - no period filter)" && (
                              <>
                                <DetailSection title="Numerator" content={metric.numerator_definition} mono />
                                <DetailSection title="Denominator" content={metric.denominator_definition} mono />
                              </>
                            )}
                            
                            <DetailSection title="Data Sources & Joins" content={
                              <>
                                <div><strong>Tables:</strong> {metric.source_tables}</div>
                                <div className="mt-1"><strong>Joins:</strong> {metric.joins_relationships}</div>
                              </>
                            } />
                            
                            <DetailSection title="Filters & Exclusions" content={
                              <>
                                {metric.status_filters !== "N/A" && (
                                  <div><strong>Status Filters:</strong> {metric.status_filters}</div>
                                )}
                                <div className={metric.status_filters !== "N/A" ? "mt-1" : ""}>
                                  <strong>Excluded:</strong> {metric.excluded_statuses}
                                </div>
                                <div className="mt-1">
                                  <strong>Duplicate Rule:</strong> {metric.duplicate_test_exclusion_rule}
                                </div>
                              </>
                            } />
                          </div>
                          
                          {/* Right Column */}
                          <div className="space-y-4">
                            <DetailSection 
                              title="Period Logic" 
                              content={
                                <div className="space-y-2">
                                  <PeriodBadge label="Current Week" value={metric.period_logic_current_week} />
                                  <PeriodBadge label="Previous Week" value={metric.period_logic_previous_week} />
                                  <PeriodBadge label="Month to Date" value={metric.period_logic_mtd} />
                                  <PeriodBadge label="Year to Date" value={metric.period_logic_ytd} />
                                  <PeriodBadge label="Next Week" value={metric.period_logic_next_week} />
                                </div>
                              } 
                            />
                            
                            <DetailSection 
                              title="SQL Query" 
                              content={
                                <pre className="text-xs bg-slate-900 text-slate-100 p-3 rounded overflow-x-auto max-h-48">
                                  {metric.exact_formula_or_query}
                                </pre>
                              } 
                            />
                            
                            <DetailSection 
                              title="Manual Validation Steps" 
                              content={metric.manual_validation_steps}
                              alert={metric.manual_validation_steps.includes('⚠️ FLAG')}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DetailSection({ 
  title, 
  content, 
  mono = false,
  alert = false 
}: { 
  title: string; 
  content: ReactNode;
  mono?: boolean;
  alert?: boolean;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
        {title}
      </h4>
      <div className={`text-sm ${
        alert ? 'bg-yellow-50 border border-yellow-200 p-2 rounded' : ''
      } ${
        mono ? 'font-mono text-slate-700' : 'text-slate-600'
      }`}>
        {content}
      </div>
    </div>
  );
}

function PeriodBadge({ label, value }: { label: string; value: string }) {
  const available = value === "✓";
  return (
    <div className="flex items-center justify-between py-1 px-2 rounded bg-white border border-slate-200">
      <span className="text-xs text-slate-600">{label}</span>
      {available ? (
        <span className="text-xs font-medium text-green-600">✓ Available</span>
      ) : (
        <span className="text-xs font-medium text-slate-400">N/A</span>
      )}
    </div>
  );
}

function PeriodDefinitionsTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Time Period Definitions</h2>
          <p className="text-sm text-slate-600 mt-1">
            Timezone, week start day, and precise date range logic for each period selector
          </p>
        </div>
        
        <div className="divide-y divide-slate-200">
          {PERIOD_DATA.map((period, index) => (
            <div key={index} className="p-6 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{period.period_name}</h3>
                  <span className="inline-flex px-2 py-1 rounded text-xs font-mono font-medium bg-slate-100 text-slate-700 mt-1">
                    {period.period_id}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-700">
                    {period.week_start_day !== "N/A (calendar month)" && 
                     period.week_start_day !== "N/A (calendar year)" && 
                     period.week_start_day !== "N/A (fixed lookback)" && (
                      <>Week Start: {period.week_start_day}</>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{period.timezone}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Date Range Logic
                  </h4>
                  <p className="text-sm text-slate-700">{period.date_range_logic}</p>
                </div>
                
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    SQL Implementation
                  </h4>
                  <pre className="text-xs bg-slate-900 text-slate-100 p-3 rounded overflow-x-auto font-mono">
                    {period.sql_implementation}
                  </pre>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <div className="text-xs text-blue-600 font-medium mb-1">Example Current Date</div>
                  <div className="text-sm font-mono text-blue-900">{period.example_current_date}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <div className="text-xs text-green-600 font-medium mb-1">Start Date</div>
                  <div className="text-sm font-mono text-green-900">{period.example_start_date}</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded p-3">
                  <div className="text-xs text-purple-600 font-medium mb-1">End Date</div>
                  <div className="text-sm font-mono text-purple-900">{period.example_end_date}</div>
                </div>
              </div>
              
              {period.notes && (
                <div className={`mt-4 p-3 rounded text-sm ${
                  period.notes.includes('⚠️') 
                    ? 'bg-yellow-50 border border-yellow-200 text-yellow-900' 
                    : 'bg-slate-50 border border-slate-200 text-slate-700'
                }`}>
                  <strong>Note:</strong> {period.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Timezone Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Timezone & Configuration</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• <strong>Timezone:</strong> Server Local Time (UTC in production)</li>
          <li>• <strong>Week Start Day:</strong> Monday</li>
          <li>• <strong>Week End Day:</strong> Sunday</li>
          <li>• <strong>Date Boundaries:</strong> Inclusive (start and end dates both included)</li>
        </ul>
      </div>
    </div>
  );
}

// Metric data parsed from CSV
const METRIC_DATA = [
  {
    dashboard_section: "Sales Stats",
    card_title: "Total Sales",
    question_answered: "How many residential contracts were sold?",
    definition_notes: "Counts all signed contracts in the selected period excluding cancelled and duplicates",
    numerator_definition: "COUNT(*) of projects with contract-signed in period",
    denominator_definition: "N/A (count metric)",
    aggregation_method: "COUNT",
    source_tables: "timeline; project-data",
    joins_relationships: "timeline.project-dev-id = project-data.project-dev-id",
    status_filters: "project-status != 'Cancelled'",
    excluded_statuses: "Cancelled, Duplicate Project (Error)",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "contract-signed",
    period_logic_current_week: "✓",
    period_logic_previous_week: "✓",
    period_logic_mtd: "✓",
    period_logic_ytd: "✓",
    period_logic_next_week: "N/A",
    exact_formula_or_query: "SELECT COUNT(*) FROM timeline t JOIN project-data pd ON t.project-dev-id = pd.project-dev-id WHERE t.contract-signed >= '[period_start]' AND t.contract-signed <= '[period_end]' AND pd.project-status != 'Cancelled' AND (t.cancellation-reason IS NULL OR t.cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "1. Query distinct project-dev-id count. 2. Verify no duplicate projects included. 3. Check that cancelled projects are excluded. 4. Confirm date range matches period selector."
  },
  {
    dashboard_section: "Sales Stats",
    card_title: "Aveyo Approved",
    question_answered: "How many sales passed internal QA?",
    definition_notes: "Counts projects with approved SOW timestamp",
    numerator_definition: "COUNT(DISTINCT project-id) with sow-approved-timestamp",
    denominator_definition: "N/A (count metric)",
    aggregation_method: "COUNT",
    source_tables: "customer-sow; project-data",
    joins_relationships: "customer-sow.project-id = project-data.project-id (simple project-id not project-dev-id)",
    status_filters: "project-status != 'Cancelled'",
    excluded_statuses: "Cancelled, Duplicate Project (Error)",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "sow-approved-timestamp",
    period_logic_current_week: "✓",
    period_logic_previous_week: "✓",
    period_logic_mtd: "✓",
    period_logic_ytd: "✓",
    period_logic_next_week: "N/A",
    exact_formula_or_query: "SELECT COUNT(DISTINCT cs.project-id) FROM customer-sow cs JOIN project-data pd ON cs.project-id = pd.project-id WHERE cs.sow-approved-timestamp >= '[period_start]' AND cs.sow-approved-timestamp <= '[period_end]' AND pd.project-status != 'Cancelled'",
    manual_validation_steps: "1. Note: Uses simple project-id field. 2. Verify distinct count (no duplicates). 3. Check SOW-approved-timestamp is non-null. 4. Confirm cancelled filter applied."
  },
  {
    dashboard_section: "Sales Stats",
    card_title: "Pull Through Rate",
    question_answered: "What % of jobs sold reached install complete?",
    definition_notes: "Percentage of jobs sold in period that achieved installation completion",
    numerator_definition: "COUNT(*) WHERE install-complete IS NOT NULL AND contract-signed in [period]",
    denominator_definition: "COUNT(*) WHERE contract-signed in [period]",
    aggregation_method: "PERCENTAGE",
    source_tables: "timeline; project-data",
    joins_relationships: "timeline.project-dev-id = project-data.project-dev-id",
    status_filters: "project-status != 'Cancelled'",
    excluded_statuses: "Cancelled, Duplicate Project (Error)",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "contract-signed (for period filter)",
    period_logic_current_week: "✓",
    period_logic_previous_week: "✓",
    period_logic_mtd: "✓",
    period_logic_ytd: "✓",
    period_logic_next_week: "N/A",
    exact_formula_or_query: "SELECT (COUNT(CASE WHEN t.install-complete IS NOT NULL THEN 1 END) / COUNT(*)) * 100 FROM timeline t JOIN project-data pd ON t.project-dev-id = pd.project-dev-id WHERE t.contract-signed >= '[period_start]' AND t.contract-signed <= '[period_end]' AND pd.project-status != 'Cancelled' AND (t.cancellation-reason IS NULL OR t.cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "1. Both numerator and denominator use contract-signed date. 2. Verify install-complete is NOT NULL for numerator. 3. Recent periods will show low % (jobs need time). 4. Validate count breakdown matches."
  },
  {
    dashboard_section: "Sales Stats",
    card_title: "% Jobs with Battery",
    question_answered: "What % of sold jobs include battery storage?",
    definition_notes: "Percentage of sales with battery systems",
    numerator_definition: "COUNT(*) WHERE battery-count > 0 AND contract-signed in [period]",
    denominator_definition: "COUNT(*) WHERE contract-signed in [period]",
    aggregation_method: "PERCENTAGE",
    source_tables: "project-data; timeline",
    joins_relationships: "project-data.project-dev-id = timeline.project-dev-id",
    status_filters: "project-status != 'Cancelled'",
    excluded_statuses: "Cancelled, Duplicate Project (Error)",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "contract-signed",
    period_logic_current_week: "✓",
    period_logic_previous_week: "✓",
    period_logic_mtd: "✓",
    period_logic_ytd: "✓",
    period_logic_next_week: "N/A",
    exact_formula_or_query: "SELECT (COUNT(CASE WHEN pd.battery-count > 0 THEN 1 END) / COUNT(*)) * 100 FROM project-data pd JOIN timeline t ON pd.project-dev-id = t.project-dev-id WHERE t.contract-signed >= '[period_start]' AND t.contract-signed <= '[period_end]' AND pd.project-status != 'Cancelled' AND (t.cancellation-reason IS NULL OR t.cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "1. Check battery-count > 0 for numerator. 2. Verify both use contract-signed as baseline. 3. Validate % and breakdown match. 4. Database shows 41% overall battery rate."
  },
  {
    dashboard_section: "Sales Stats",
    card_title: "% of Packet Approvals",
    question_answered: "What % of sales received packet approval?",
    definition_notes: "Measures approval rate for sales packets",
    numerator_definition: "COUNT(*) WHERE packet-approval IS NOT NULL AND contract-signed in [period]",
    denominator_definition: "COUNT(*) WHERE contract-signed in [period]",
    aggregation_method: "PERCENTAGE",
    source_tables: "timeline; project-data",
    joins_relationships: "timeline.project-dev-id = project-data.project-dev-id",
    status_filters: "project-status != 'Cancelled'",
    excluded_statuses: "Cancelled, Duplicate Project (Error)",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "contract-signed",
    period_logic_current_week: "✓",
    period_logic_previous_week: "✓",
    period_logic_mtd: "✓",
    period_logic_ytd: "✓",
    period_logic_next_week: "N/A",
    exact_formula_or_query: "SELECT (COUNT(CASE WHEN t.packet-approval IS NOT NULL THEN 1 END) / COUNT(*)) * 100 FROM timeline t JOIN project-data pd ON t.project-dev-id = pd.project-dev-id WHERE t.contract-signed >= '[period_start]' AND t.contract-signed <= '[period_end]' AND pd.project-status != 'Cancelled' AND (t.cancellation-reason IS NULL OR t.cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "1. Note: packet-approval has only 38% coverage. 2. Both use contract-signed as baseline. 3. Verify packet-approval IS NOT NULL for numerator. 4. Low coverage may skew results."
  },
  {
    dashboard_section: "Sales Stats",
    card_title: "Reps with a Sale",
    question_answered: "How many unique reps closed deals?",
    definition_notes: "Count of unique sales reps (closers + setters)",
    numerator_definition: "COUNT(DISTINCT sales-rep-id) + COUNT(DISTINCT setter-id) where contract-signed in [period]",
    denominator_definition: "N/A (count metric)",
    aggregation_method: "COUNT",
    source_tables: "timeline; project-data",
    joins_relationships: "timeline.project-dev-id = project-data.project-dev-id",
    status_filters: "project-status != 'Cancelled'",
    excluded_statuses: "Cancelled, Duplicate Project (Error)",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "contract-signed",
    period_logic_current_week: "✓",
    period_logic_previous_week: "✓",
    period_logic_mtd: "✓",
    period_logic_ytd: "✓",
    period_logic_next_week: "N/A",
    exact_formula_or_query: "SELECT COUNT(DISTINCT pd.sales-rep-id) + COUNT(DISTINCT pd.setter-id) FROM project-data pd JOIN timeline t ON pd.project-dev-id = t.project-dev-id WHERE t.contract-signed >= '[period_start]' AND t.contract-signed <= '[period_end]' AND pd.project-status != 'Cancelled' AND (t.cancellation-reason IS NULL OR t.cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "1. Sum distinct closers and setters. 2. Verify no double-counting if same person is both. 3. Check breakdown shows (X closers Y setters). 4. Null IDs should be excluded."
  },
  {
    dashboard_section: "Sales Stats",
    card_title: "Pull Through % (Rolling 6M)",
    question_answered: "What % of jobs sold 61-180 days ago reached install complete?",
    definition_notes: "Rolling 6-month metric - fixed lookback window prevents 0% for recent periods",
    numerator_definition: "COUNT(*) WHERE install-complete IS NOT NULL AND contract-signed BETWEEN DATE_SUB(CURDATE() INTERVAL 180 DAY) AND DATE_SUB(CURDATE() INTERVAL 61 DAY)",
    denominator_definition: "COUNT(*) WHERE contract-signed BETWEEN DATE_SUB(CURDATE() INTERVAL 180 DAY) AND DATE_SUB(CURDATE() INTERVAL 61 DAY)",
    aggregation_method: "PERCENTAGE",
    source_tables: "timeline; project-data",
    joins_relationships: "timeline.project-dev-id = project-data.project-dev-id",
    status_filters: "project-status != 'Cancelled'",
    excluded_statuses: "Cancelled, Duplicate Project (Error)",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "contract-signed (61-180 days ago - NO period filter)",
    period_logic_current_week: "N/A",
    period_logic_previous_week: "N/A",
    period_logic_mtd: "N/A",
    period_logic_ytd: "N/A",
    period_logic_next_week: "N/A",
    exact_formula_or_query: "SELECT (COUNT(CASE WHEN t.install-complete IS NOT NULL THEN 1 END) / COUNT(*)) * 100 FROM timeline t JOIN project-data pd ON t.project-dev-id = pd.project-dev-id WHERE t.contract-signed >= DATE_SUB(CURDATE() INTERVAL 180 DAY) AND t.contract-signed <= DATE_SUB(CURDATE() INTERVAL 61 DAY) AND pd.project-status != 'Cancelled' AND (t.cancellation-reason IS NULL OR t.cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "⚠️ FLAG: This metric IGNORES period selector - always uses 61-180 day lookback. 1. Verify date range is exactly 61-180 days. 2. Numerator: must have install-complete. 3. Both use contract-signed as baseline. 4. Should show consistent % across all periods."
  },
  {
    dashboard_section: "Sales Stats",
    card_title: "Max Pull Through % (Rolling 6M)",
    question_answered: "What % of jobs sold 61-180 days ago are still active (potential ceiling)?",
    definition_notes: "Maximum achievable pull-through - excludes stuck/cancelled jobs",
    numerator_definition: "COUNT(*) WHERE contract-signed BETWEEN 61-180 days ago AND project-status NOT IN ('Cancelled' 'Pending Cancel' 'On Hold' 'Finance Hold')",
    denominator_definition: "COUNT(*) WHERE contract-signed BETWEEN 61-180 days ago",
    aggregation_method: "PERCENTAGE",
    source_tables: "timeline; project-data",
    joins_relationships: "timeline.project-dev-id = project-data.project-dev-id",
    status_filters: "project-status NOT IN ('Cancelled' 'Pending Cancel' 'On Hold' 'Finance Hold')",
    excluded_statuses: "Cancelled, Pending Cancel, On Hold, Finance Hold, Duplicate Project (Error)",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "contract-signed (61-180 days ago - NO period filter)",
    period_logic_current_week: "N/A",
    period_logic_previous_week: "N/A",
    period_logic_mtd: "N/A",
    period_logic_ytd: "N/A",
    period_logic_next_week: "N/A",
    exact_formula_or_query: "SELECT (COUNT(CASE WHEN pd.project-status NOT IN ('Cancelled' 'Pending Cancel' 'On Hold' 'Finance Hold') THEN 1 END) / COUNT(*)) * 100 FROM timeline t JOIN project-data pd ON t.project-dev-id = pd.project-dev-id WHERE t.contract-signed >= DATE_SUB(CURDATE() INTERVAL 180 DAY) AND t.contract-signed <= DATE_SUB(CURDATE() INTERVAL 61 DAY) AND pd.project-status != 'Cancelled' AND (t.cancellation-reason IS NULL OR t.cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "⚠️ FLAG: Ignores period selector. 1. Numerator EXCLUDES 4 specific statuses. 2. Numerator INCLUDES: Active Complete Pre-Approvals New Lender. 3. Shows max achievable rate if all active jobs complete. 4. Result should be ≥ regular pull-through %."
  },
  {
    dashboard_section: "Operations Stats",
    card_title: "Jobs Placed ON HOLD",
    question_answered: "How many jobs are currently paused?",
    definition_notes: "Current snapshot of paused projects",
    numerator_definition: "COUNT(*) WHERE project-status = 'On Hold'",
    denominator_definition: "N/A (count metric - no period filter)",
    aggregation_method: "COUNT",
    source_tables: "project-data; timeline",
    joins_relationships: "project-data.project-dev-id = timeline.project-dev-id",
    status_filters: "project-status = 'On Hold'",
    excluded_statuses: "Duplicate Project (Error)",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "N/A (no period filter - current snapshot)",
    period_logic_current_week: "N/A",
    period_logic_previous_week: "N/A",
    period_logic_mtd: "N/A",
    period_logic_ytd: "N/A",
    period_logic_next_week: "N/A",
    exact_formula_or_query: "SELECT COUNT(*) FROM project-data pd JOIN timeline t ON pd.project-dev-id = t.project-dev-id WHERE pd.project-status = 'On Hold' AND (t.cancellation-reason IS NULL OR t.cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "⚠️ FLAG: No period filter - shows ALL jobs currently on hold regardless of period. 1. Verify count is current snapshot. 2. Database currently shows ~276 on hold. 3. Highlighted as bottleneck indicator."
  },
  {
    dashboard_section: "Operations Stats",
    card_title: "Installs Complete",
    question_answered: "How many installations finished?",
    definition_notes: "Installations marked complete in period",
    numerator_definition: "COUNT(*) WHERE install-complete in [period] AND install-stage-status = 'Complete'",
    denominator_definition: "N/A (count metric)",
    aggregation_method: "COUNT",
    source_tables: "timeline",
    joins_relationships: "N/A (single table)",
    status_filters: "install-stage-status = 'Complete'",
    excluded_statuses: "Duplicate Project (Error)",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "install-complete",
    period_logic_current_week: "✓",
    period_logic_previous_week: "✓",
    period_logic_mtd: "✓",
    period_logic_ytd: "✓",
    period_logic_next_week: "N/A",
    exact_formula_or_query: "SELECT COUNT(*) FROM timeline WHERE install-complete >= '[period_start]' AND install-complete <= '[period_end]' AND install-stage-status = 'Complete' AND (cancellation-reason IS NULL OR cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "1. Uses install-complete date as period filter (NOT contract-signed). 2. Must have install-stage-status = 'Complete'. 3. Database shows 3003 total complete records. 4. Verify date matches period exactly."
  },
  {
    dashboard_section: "Operations Stats",
    card_title: "Install Complete NO PTO",
    question_answered: "How many completed installs are awaiting PTO?",
    definition_notes: "Bottleneck: installs finished but no permission to operate",
    numerator_definition: "COUNT(*) WHERE install-complete in [period] AND pto-received IS NULL AND install-stage-status = 'Complete'",
    denominator_definition: "N/A (count metric)",
    aggregation_method: "COUNT",
    source_tables: "timeline",
    joins_relationships: "N/A (single table)",
    status_filters: "install-stage-status = 'Complete' AND pto-received IS NULL",
    excluded_statuses: "Duplicate Project (Error)",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "install-complete",
    period_logic_current_week: "✓",
    period_logic_previous_week: "✓",
    period_logic_mtd: "✓",
    period_logic_ytd: "✓",
    period_logic_next_week: "N/A",
    exact_formula_or_query: "SELECT COUNT(*) FROM timeline WHERE install-complete >= '[period_start]' AND install-complete <= '[period_end]' AND pto-received IS NULL AND install-stage-status = 'Complete' AND (cancellation-reason IS NULL OR cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "1. Uses install-complete date for period filter. 2. pto-received must be NULL. 3. Highlighted as bottleneck. 4. Subset of Installs Complete."
  },
  {
    dashboard_section: "Operations Stats",
    card_title: "Install Scheduled",
    question_answered: "How many installs are on the calendar?",
    definition_notes: "Future installations scheduled",
    numerator_definition: "COUNT(*) WHERE install-appointment in [period]",
    denominator_definition: "N/A (count metric)",
    aggregation_method: "COUNT",
    source_tables: "timeline",
    joins_relationships: "N/A (single table)",
    status_filters: "N/A",
    excluded_statuses: "Duplicate Project (Error)",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "install-appointment",
    period_logic_current_week: "✓",
    period_logic_previous_week: "✓",
    period_logic_mtd: "N/A",
    period_logic_ytd: "N/A",
    period_logic_next_week: "✓",
    exact_formula_or_query: "SELECT COUNT(*) FROM timeline WHERE install-appointment >= '[period_start]' AND install-appointment <= '[period_end]' AND (cancellation-reason IS NULL OR cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "1. Uses install-appointment date. 2. Typically for current/previous/next week. 3. Shows upcoming workload. 4. Not available for MTD/YTD."
  },
  {
    dashboard_section: "Operations Stats",
    card_title: "PTO Received",
    question_answered: "How many PTOs were received?",
    definition_notes: "Projects that received permission to operate",
    numerator_definition: "COUNT(*) WHERE pto-received in [period]",
    denominator_definition: "N/A (count metric)",
    aggregation_method: "COUNT",
    source_tables: "timeline",
    joins_relationships: "N/A (single table)",
    status_filters: "N/A",
    excluded_statuses: "Duplicate Project (Error)",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "pto-received",
    period_logic_current_week: "✓",
    period_logic_previous_week: "✓",
    period_logic_mtd: "✓",
    period_logic_ytd: "✓",
    period_logic_next_week: "N/A",
    exact_formula_or_query: "SELECT COUNT(*) FROM timeline WHERE pto-received >= '[period_start]' AND pto-received <= '[period_end]' AND (cancellation-reason IS NULL OR cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "1. Uses pto-received date for period filter. 2. Final milestone for project. 3. Coverage: 44.8% (2713 records). 4. Verify distinct count."
  },
  {
    dashboard_section: "Operations Stats",
    card_title: "# of Active Jobs; Install Not Started",
    question_answered: "How many active jobs have no install scheduled?",
    definition_notes: "Operational bottleneck - active but no appointment",
    numerator_definition: "COUNT(*) WHERE project-status = 'Active' AND install-appointment IS NULL",
    denominator_definition: "N/A (count metric - no period filter)",
    aggregation_method: "COUNT",
    source_tables: "project-data; timeline",
    joins_relationships: "project-data.project-dev-id = timeline.project-dev-id",
    status_filters: "project-status = 'Active' AND install-appointment IS NULL",
    excluded_statuses: "Duplicate Project (Error)",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "N/A (no period filter - current snapshot)",
    period_logic_current_week: "N/A",
    period_logic_previous_week: "N/A",
    period_logic_mtd: "N/A",
    period_logic_ytd: "N/A",
    period_logic_next_week: "N/A",
    exact_formula_or_query: "SELECT COUNT(*) FROM project-data pd JOIN timeline t ON pd.project-dev-id = t.project-dev-id WHERE pd.project-status = 'Active' AND t.install-appointment IS NULL AND (t.cancellation-reason IS NULL OR t.cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "⚠️ FLAG: No period filter - current snapshot. 1. Highlighted as bottleneck. 2. Status: danger if ≥50 warning if ≥20. 3. Shows jobs stuck in pipeline."
  },
  {
    dashboard_section: "Cycle Times",
    card_title: "Avg Days PP → Install Start",
    question_answered: "How long from packet approval to install?",
    definition_notes: "Average days between perfect packet and installation",
    numerator_definition: "SUM(DATEDIFF(install-appointment packet-approval)) WHERE both dates NOT NULL AND contract-signed in [period]",
    denominator_definition: "COUNT(*) WHERE both dates NOT NULL AND contract-signed in [period]",
    aggregation_method: "AVG (mean)",
    source_tables: "timeline",
    joins_relationships: "N/A (single table)",
    status_filters: "Both dates NOT NULL",
    excluded_statuses: "Duplicate Project (Error)",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "contract-signed (baseline for period filter)",
    period_logic_current_week: "✓",
    period_logic_previous_week: "✓",
    period_logic_mtd: "✓",
    period_logic_ytd: "✓",
    period_logic_next_week: "N/A",
    exact_formula_or_query: "SELECT AVG(DATEDIFF(install-appointment packet-approval)) FROM timeline WHERE contract-signed >= '[period_start]' AND contract-signed <= '[period_end]' AND packet-approval IS NOT NULL AND install-appointment IS NOT NULL AND (cancellation-reason IS NULL OR cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "⚠️ Uses contract-signed as baseline per rule. 1. TODO: Change to MEDIAN. 2. Only 37.7% coverage (2285 records). 3. Lower is better. 4. Verify DATEDIFF calculation."
  },
  {
    dashboard_section: "Cycle Times",
    card_title: "Avg Days Install → M2 Approved",
    question_answered: "How long from install to M2 milestone?",
    definition_notes: "Average days between install and M2 approval",
    numerator_definition: "SUM(DATEDIFF(m2-approved install-appointment)) WHERE both dates NOT NULL AND contract-signed in [period]",
    denominator_definition: "COUNT(*) WHERE both dates NOT NULL AND contract-signed in [period]",
    aggregation_method: "AVG (mean)",
    source_tables: "timeline; project-data",
    joins_relationships: "timeline.project-dev-id = project-data.project-dev-id",
    status_filters: "Both dates NOT NULL",
    excluded_statuses: "Duplicate Project (Error)",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "contract-signed (baseline for period filter)",
    period_logic_current_week: "✓",
    period_logic_previous_week: "✓",
    period_logic_mtd: "✓",
    period_logic_ytd: "✓",
    period_logic_next_week: "N/A",
    exact_formula_or_query: "SELECT AVG(DATEDIFF(pd.m2-approved t.install-appointment)) FROM timeline t JOIN project-data pd ON t.project-dev-id = pd.project-dev-id WHERE t.contract-signed >= '[period_start]' AND t.contract-signed <= '[period_end]' AND t.install-appointment IS NOT NULL AND pd.m2-approved IS NOT NULL AND (t.cancellation-reason IS NULL OR t.cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "⚠️ Uses contract-signed as baseline per rule. 1. TODO: Change to MEDIAN. 2. M2-approved coverage: 47.7% (2893 records). 3. Lower is better. 4. Verify both dates present."
  },
  {
    dashboard_section: "Cycle Times",
    card_title: "Avg Days PP → PTO",
    question_answered: "How long from packet to permission?",
    definition_notes: "Complete cycle from packet approval to PTO",
    numerator_definition: "SUM(DATEDIFF(pto-received packet-approval)) WHERE both dates NOT NULL AND contract-signed in [period]",
    denominator_definition: "COUNT(*) WHERE both dates NOT NULL AND contract-signed in [period]",
    aggregation_method: "AVG (mean)",
    source_tables: "timeline",
    joins_relationships: "N/A (single table)",
    status_filters: "Both dates NOT NULL",
    excluded_statuses: "Duplicate Project (Error)",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "contract-signed (baseline for period filter)",
    period_logic_current_week: "✓",
    period_logic_previous_week: "✓",
    period_logic_mtd: "✓",
    period_logic_ytd: "✓",
    period_logic_next_week: "N/A",
    exact_formula_or_query: "SELECT AVG(DATEDIFF(pto-received packet-approval)) FROM timeline WHERE contract-signed >= '[period_start]' AND contract-signed <= '[period_end]' AND packet-approval IS NOT NULL AND pto-received IS NOT NULL AND (cancellation-reason IS NULL OR cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "⚠️ Uses contract-signed as baseline per rule. 1. TODO: Change to MEDIAN. 2. Coverage: 44.8% PTO 37.7% PP. 3. End-to-end metric. 4. Lower is better."
  },
  {
    dashboard_section: "Cycle Times",
    card_title: "Avg Days Sale → Glass on Roof",
    question_answered: "How long from contract to panel installation?",
    definition_notes: "Time from sale to physical installation",
    numerator_definition: "SUM(DATEDIFF(panel-install-complete contract-signed)) WHERE both dates NOT NULL AND contract-signed in [period]",
    denominator_definition: "COUNT(*) WHERE both dates NOT NULL AND contract-signed in [period]",
    aggregation_method: "AVG (mean)",
    source_tables: "timeline; project-data",
    joins_relationships: "timeline.project-dev-id = project-data.project-dev-id",
    status_filters: "project-status != 'Cancelled'",
    excluded_statuses: "Cancelled",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "contract-signed",
    period_logic_current_week: "✓",
    period_logic_previous_week: "✓",
    period_logic_mtd: "✓",
    period_logic_ytd: "✓",
    period_logic_next_week: "N/A",
    exact_formula_or_query: "SELECT AVG(DATEDIFF(t.panel-install-complete t.contract-signed)) FROM timeline t JOIN project-data pd ON t.project-dev-id = pd.project-dev-id WHERE t.contract-signed >= '[period_start]' AND t.contract-signed <= '[period_end]' AND t.panel-install-complete IS NOT NULL AND pd.project-status != 'Cancelled' AND (t.cancellation-reason IS NULL OR t.cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "✓ Correctly uses contract-signed as baseline. 1. Full pipeline metric. 2. Lower is better. 3. Excludes cancelled. 4. TODO: Change to MEDIAN."
  },
  {
    dashboard_section: "Cycle Times",
    card_title: "Avg Days Sale → PTO",
    question_answered: "How long is complete project lifecycle?",
    definition_notes: "End-to-end time from sale to energization",
    numerator_definition: "SUM(DATEDIFF(pto-received contract-signed)) WHERE both dates NOT NULL AND contract-signed in [period]",
    denominator_definition: "COUNT(*) WHERE both dates NOT NULL AND contract-signed in [period]",
    aggregation_method: "AVG (mean)",
    source_tables: "timeline; project-data",
    joins_relationships: "timeline.project-dev-id = project-data.project-dev-id",
    status_filters: "project-status != 'Cancelled'",
    excluded_statuses: "Cancelled",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "contract-signed",
    period_logic_current_week: "✓",
    period_logic_previous_week: "✓",
    period_logic_mtd: "✓",
    period_logic_ytd: "✓",
    period_logic_next_week: "N/A",
    exact_formula_or_query: "SELECT AVG(DATEDIFF(t.pto-received t.contract-signed)) FROM timeline t JOIN project-data pd ON t.project-dev-id = pd.project-dev-id WHERE t.contract-signed >= '[period_start]' AND t.contract-signed <= '[period_end]' AND t.pto-received IS NOT NULL AND pd.project-status != 'Cancelled' AND (t.cancellation-reason IS NULL OR t.cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "✓ Correctly uses contract-signed as baseline. 1. Complete lifecycle metric. 2. Lower is better. 3. PTO coverage 44.8%. 4. TODO: Change to MEDIAN."
  },
  {
    dashboard_section: "Residential Financials",
    card_title: "A/R (M2/M3 Submitted Not Received)",
    question_answered: "How much money is owed to us?",
    definition_notes: "Outstanding receivables for submitted but unpaid milestones",
    numerator_definition: "SUM(contract-price * 0.8) WHERE m2-submitted NOT NULL AND m2-received IS NULL + SUM(contract-price * 0.2) WHERE m3-submitted NOT NULL AND m3-received IS NULL",
    denominator_definition: "N/A (sum metric - no period filter)",
    aggregation_method: "SUM",
    source_tables: "funding; timeline",
    joins_relationships: "funding.project_ids = timeline.project-dev-id (via string match)",
    status_filters: "project-status-2 IN ('Active' 'New Lender' 'Finance Hold' 'Pre-Approvals')",
    excluded_statuses: "Complete, Cancelled, On Hold, Pending Cancel, Duplicate Project (Error)",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "N/A (no period filter - current snapshot)",
    period_logic_current_week: "N/A",
    period_logic_previous_week: "N/A",
    period_logic_mtd: "N/A",
    period_logic_ytd: "N/A",
    period_logic_next_week: "N/A",
    exact_formula_or_query: "SELECT SUM(CASE WHEN f.m2-submitted-date IS NOT NULL AND f.m2-received-date IS NULL THEN f.contract-price * 0.8 ELSE 0 END) + SUM(CASE WHEN f.m3-submitted-date IS NOT NULL AND f.m3-received-date IS NULL THEN f.contract-price * 0.2 ELSE 0 END) FROM funding f JOIN timeline t ON f.project_ids = t.project-dev-id WHERE f.project-status-2 IN ('Active' 'New Lender' 'Finance Hold' 'Pre-Approvals') AND (t.cancellation-reason IS NULL OR t.cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "⚠️ FLAG: No period filter - current snapshot. 1. M2=80% M3=20% of contract. 2. Only active statuses included. 3. Shows (X projects M2: Y M3: Z). 4. Verify funding table join."
  },
  {
    dashboard_section: "Residential Financials",
    card_title: "Revenue Received",
    question_answered: "How much did we receive in payments?",
    definition_notes: "Total payments received in period",
    numerator_definition: "SUM(contract-price * 0.2) WHERE m1-received-date in [period] + SUM(contract-price * 0.8) WHERE m2-received-date in [period]",
    denominator_definition: "N/A (sum metric)",
    aggregation_method: "SUM",
    source_tables: "project-data; timeline",
    joins_relationships: "project-data.project-dev-id = timeline.project-dev-id",
    status_filters: "N/A",
    excluded_statuses: "Duplicate Project (Error)",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "m1-received-date OR m2-received-date",
    period_logic_current_week: "✓",
    period_logic_previous_week: "✓",
    period_logic_mtd: "✓",
    period_logic_ytd: "✓",
    period_logic_next_week: "N/A",
    exact_formula_or_query: "SELECT SUM(CASE WHEN pd.m1-received-date >= '[period_start]' AND pd.m1-received-date <= '[period_end]' THEN pd.contract-price * 0.2 ELSE 0 END) + SUM(CASE WHEN pd.m2-received-date >= '[period_start]' AND pd.m2-received-date <= '[period_end]' THEN pd.contract-price * 0.8 ELSE 0 END) FROM project-data pd JOIN timeline t ON pd.project-dev-id = t.project-dev-id WHERE (pd.m1-received-date >= '[period_start]' AND pd.m1-received-date <= '[period_end]') OR (pd.m2-received-date >= '[period_start]' AND pd.m2-received-date <= '[period_end]') AND (t.cancellation-reason IS NULL OR t.cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "⚠️ FLAG: Uses TWO different date fields (m1-received m2-received). 1. M1=20% M2=80%. 2. Shows project count with payments. 3. Both milestone dates checked. 4. Verify distinct project count."
  },
  {
    dashboard_section: "Residential Financials",
    card_title: "Install Complete M2 Not Approved",
    question_answered: "How much M2 money is pending approval?",
    definition_notes: "Financial backlog - installs done but paperwork incomplete",
    numerator_definition: "SUM(contract-price * 0.8) WHERE install-complete IS NOT NULL AND m2-approved IS NULL",
    denominator_definition: "N/A (sum metric - no period filter)",
    aggregation_method: "SUM",
    source_tables: "timeline; project-data",
    joins_relationships: "timeline.project-dev-id = project-data.project-dev-id",
    status_filters: "N/A",
    excluded_statuses: "Duplicate Project (Error)",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "N/A (no period filter - current snapshot)",
    period_logic_current_week: "N/A",
    period_logic_previous_week: "N/A",
    period_logic_mtd: "N/A",
    period_logic_ytd: "N/A",
    period_logic_next_week: "N/A",
    exact_formula_or_query: "SELECT SUM(pd.contract-price * 0.8) FROM timeline t JOIN project-data pd ON t.project-dev-id = pd.project-dev-id WHERE t.install-complete IS NOT NULL AND pd.m2-approved IS NULL AND (t.cancellation-reason IS NULL OR t.cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "⚠️ FLAG: No period filter - current snapshot. 1. M2 = 80% of contract. 2. Highlighted as bottleneck. 3. Money ready to bill. 4. Shows project count."
  },
  {
    dashboard_section: "Active Pipeline",
    card_title: "Active Pipeline (Active NO PTO)",
    question_answered: "How many active projects lack PTO?",
    definition_notes: "Current pipeline of progressing projects",
    numerator_definition: "COUNT(*) WHERE project-status IN ('Active' 'Complete' 'Pre-Approvals' 'New Lender' 'Finance Hold') AND pto-received IS NULL",
    denominator_definition: "N/A (count metric - no period filter)",
    aggregation_method: "COUNT",
    source_tables: "project-data; timeline",
    joins_relationships: "project-data.project-dev-id = timeline.project-dev-id",
    status_filters: "project-status IN ('Active' 'Complete' 'Pre-Approvals' 'New Lender' 'Finance Hold') AND pto-received IS NULL",
    excluded_statuses: "Duplicate Project (Error)",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "N/A (no period filter - current snapshot)",
    period_logic_current_week: "N/A",
    period_logic_previous_week: "N/A",
    period_logic_mtd: "N/A",
    period_logic_ytd: "N/A",
    period_logic_next_week: "N/A",
    exact_formula_or_query: "SELECT COUNT(*) FROM project-data pd JOIN timeline t ON pd.project-dev-id = t.project-dev-id WHERE pd.project-status IN ('Active' 'Complete' 'Pre-Approvals' 'New Lender' 'Finance Hold') AND t.pto-received IS NULL AND (t.cancellation-reason IS NULL OR t.cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "⚠️ FLAG: No period filter - current snapshot. 1. Includes 5 active statuses. 2. Shows all without PTO regardless of sale date. 3. Pipeline health indicator."
  },
  {
    dashboard_section: "Commercial Division",
    card_title: "Total KW Scheduled",
    question_answered: "What KW capacity is scheduled?",
    definition_notes: "Planned installation capacity",
    numerator_definition: "SUM(system-size) WHERE install-appointment in [period] AND install-complete IS NULL",
    denominator_definition: "N/A (sum metric)",
    aggregation_method: "SUM",
    source_tables: "timeline; project-data",
    joins_relationships: "timeline.project-dev-id = project-data.project-dev-id",
    status_filters: "install-complete IS NULL",
    excluded_statuses: "Duplicate Project (Error)",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "install-appointment",
    period_logic_current_week: "✓",
    period_logic_previous_week: "✓",
    period_logic_mtd: "N/A",
    period_logic_ytd: "N/A",
    period_logic_next_week: "✓",
    exact_formula_or_query: "SELECT SUM(pd.system-size) FROM timeline t JOIN project-data pd ON t.project-dev-id = pd.project-dev-id WHERE t.install-appointment >= '[period_start]' AND t.install-appointment <= '[period_end]' AND t.install-complete IS NULL AND (t.cancellation-reason IS NULL OR t.cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "1. Uses install-appointment date. 2. Must NOT be complete yet. 3. System-size has 100% coverage. 4. Typically for week periods."
  },
  {
    dashboard_section: "Commercial Division",
    card_title: "Total KW Installed",
    question_answered: "What KW capacity was installed?",
    definition_notes: "Actual installed capacity",
    numerator_definition: "SUM(system-size) WHERE install-complete in [period]",
    denominator_definition: "N/A (sum metric)",
    aggregation_method: "SUM",
    source_tables: "timeline; project-data",
    joins_relationships: "timeline.project-dev-id = project-data.project-dev-id",
    status_filters: "N/A",
    excluded_statuses: "Duplicate Project (Error)",
    duplicate_test_exclusion_rule: "cancellation-reason != 'Duplicate Project (Error)'",
    period_date_field: "install-complete",
    period_logic_current_week: "✓",
    period_logic_previous_week: "✓",
    period_logic_mtd: "✓",
    period_logic_ytd: "✓",
    period_logic_next_week: "N/A",
    exact_formula_or_query: "SELECT SUM(pd.system-size) FROM timeline t JOIN project-data pd ON t.project-dev-id = pd.project-dev-id WHERE t.install-complete >= '[period_start]' AND t.install-complete <= '[period_end]' AND (t.cancellation-reason IS NULL OR t.cancellation-reason != 'Duplicate Project (Error)')",
    manual_validation_steps: "1. Uses install-complete date. 2. Measures delivered capacity. 3. System-size 100% coverage. 4. Verify sum is accurate."
  }
];

const PERIOD_DATA = [
  {
    period_name: "Current Week",
    period_id: "current_week",
    timezone: "Server Local Time (UTC in production)",
    week_start_day: "Monday",
    date_range_logic: "Monday to Sunday of the current calendar week. If today is Sunday the week runs Monday-Sunday inclusive.",
    sql_implementation: "Calculates: dayOfWeek = now.getDay(); monday = now - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) days; sunday = monday + 6 days; Returns: {start: monday end: sunday}",
    example_current_date: "2026-01-28 (Wednesday)",
    example_start_date: "2026-01-27 (Monday)",
    example_end_date: "2026-02-02 (Sunday)",
    notes: "Week always starts Monday and ends Sunday regardless of current day. Sunday (day 0) special handling: goes back 6 days to previous Monday."
  },
  {
    period_name: "Previous Week",
    period_id: "previous_week",
    timezone: "Server Local Time (UTC in production)",
    week_start_day: "Monday",
    date_range_logic: "Monday to Sunday of the previous calendar week.",
    sql_implementation: "Calculates: dayOfWeek = now.getDay(); lastMonday = now - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) - 7 days; lastSunday = lastMonday + 6 days; Returns: {start: lastMonday end: lastSunday}",
    example_current_date: "2026-01-28 (Wednesday)",
    example_start_date: "2026-01-20 (Monday)",
    example_end_date: "2026-01-26 (Sunday)",
    notes: "Complete previous week. Always 7 days. No partial weeks."
  },
  {
    period_name: "Month to Date",
    period_id: "mtd",
    timezone: "Server Local Time (UTC in production)",
    week_start_day: "N/A (calendar month)",
    date_range_logic: "First day of current month through today (inclusive).",
    sql_implementation: "Calculates: firstOfMonth = new Date(year month 1); Returns: {start: firstOfMonth end: today}",
    example_current_date: "2026-01-28",
    example_start_date: "2026-01-01",
    example_end_date: "2026-01-28",
    notes: "Includes today. Resets on the 1st of each month. Partial month until today."
  },
  {
    period_name: "Year to Date",
    period_id: "ytd",
    timezone: "Server Local Time (UTC in production)",
    week_start_day: "N/A (calendar year)",
    date_range_logic: "January 1st of current year through today (inclusive).",
    sql_implementation: "Calculates: firstOfYear = new Date(year 0 1); Returns: {start: firstOfYear end: today}",
    example_current_date: "2026-01-28",
    example_start_date: "2026-01-01",
    example_end_date: "2026-01-28",
    notes: "Includes today. Resets on January 1st. Partial year until today."
  },
  {
    period_name: "Next Week",
    period_id: "next_week",
    timezone: "Server Local Time (UTC in production)",
    week_start_day: "Monday",
    date_range_logic: "Monday to Sunday of the next calendar week.",
    sql_implementation: "Calculates: dayOfWeek = now.getDay(); nextMonday = now - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + 7 days; nextSunday = nextMonday + 6 days; Returns: {start: nextMonday end: nextSunday}",
    example_current_date: "2026-01-28 (Wednesday)",
    example_start_date: "2026-02-03 (Monday)",
    example_end_date: "2026-02-09 (Sunday)",
    notes: "Used for forward-looking metrics like scheduled installs. Complete 7-day week."
  },
  {
    period_name: "Rolling 6-Month (61-180 days)",
    period_id: "rolling_6m_window",
    timezone: "Server Local Time (UTC in production)",
    week_start_day: "N/A (fixed lookback)",
    date_range_logic: "Jobs sold between 180 days ago and 61 days ago. Fixed window that ignores period selector.",
    sql_implementation: "SQL: WHERE contract-signed >= DATE_SUB(CURDATE() INTERVAL 180 DAY) AND contract-signed <= DATE_SUB(CURDATE() INTERVAL 61 DAY)",
    example_current_date: "2026-01-28",
    example_start_date: "2025-07-31 (180 days ago)",
    example_end_date: "2025-11-28 (61 days ago)",
    notes: "⚠️ SPECIAL: This ignores the period selector completely. Always uses fixed 119-day lookback window. Used by Pull Through % (Rolling 6M) and Max Pull Through % (Rolling 6M) metrics only."
  }
];
