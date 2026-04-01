import { query, queryOne } from './db';
import { TimePeriod, KPIValue, KPITrend, KPIStatus } from '@/types/kpi';
import { getServiceRoleClient } from './supabase';
import { replaceFieldTokens, extractExpressionVariables } from './formula-validator';
import type { CustomKPIRecord } from './supabase';

/**
 * KPI Service Layer
 * 
 * This module provides functions to calculate all dashboard KPIs from the MySQL database.
 * Each function queries the database and returns formatted KPI values with trends and goals.
 */

// =============================================================================
// DATE RANGE HELPERS
// =============================================================================

interface DateRange {
  start: string;
  end: string;
}

/**
 * Get date range SQL for a given period
 */
function getPeriodDateRange(period: TimePeriod): DateRange {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  switch (period) {
    case 'current_week': {
      // Monday to Sunday of current week
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0],
      };
    }
    
    case 'previous_week': {
      const dayOfWeek = now.getDay();
      const lastMonday = new Date(now);
      lastMonday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) - 7);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      
      return {
        start: lastMonday.toISOString().split('T')[0],
        end: lastSunday.toISOString().split('T')[0],
      };
    }
    
    case 'mtd': {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        start: firstOfMonth.toISOString().split('T')[0],
        end: today,
      };
    }
    
    case 'ytd': {
      const firstOfYear = new Date(now.getFullYear(), 0, 1);
      return {
        start: firstOfYear.toISOString().split('T')[0],
        end: today,
      };
    }
    
    case 'next_week': {
      const dayOfWeek = now.getDay();
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + 7);
      const nextSunday = new Date(nextMonday);
      nextSunday.setDate(nextMonday.getDate() + 6);
      
      return {
        start: nextMonday.toISOString().split('T')[0],
        end: nextSunday.toISOString().split('T')[0],
      };
    }
    
    default:
      return { start: today, end: today };
  }
}

/**
 * Build SQL date filter clause
 */
function buildDateFilter(field: string, period: TimePeriod): string {
  const range = getPeriodDateRange(period);
  return `${field} >= '${range.start}' AND ${field} <= '${range.end}'`;
}

// =============================================================================
// FORMATTING HELPERS
// =============================================================================

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatDays(value: number): string {
  return `${Math.round(value)} days`;
}

function calculateTrend(current: number, previous: number): { trend: KPITrend; trendValue: string } {
  if (previous === 0) {
    return { trend: 'neutral', trendValue: 'N/A' };
  }
  
  const change = ((current - previous) / previous) * 100;
  const absChange = Math.abs(change);
  
  if (absChange < 1) {
    return { trend: 'neutral', trendValue: '0%' };
  }
  
  return {
    trend: change > 0 ? 'up' : 'down',
    trendValue: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
  };
}

function calculateStatus(value: number, goal?: number): KPIStatus {
  if (!goal) return 'neutral';
  
  const percentOfGoal = (value / goal) * 100;
  
  if (percentOfGoal >= 100) return 'success';
  if (percentOfGoal >= 80) return 'warning';
  return 'danger';
}

// =============================================================================
// GOALS MANAGEMENT (Supabase)
// =============================================================================

// Cache goals in memory to avoid database queries on every request
let goalsCache: any = null;
let goalsCacheTime: number = 0;
const GOALS_CACHE_TTL = 60000; // 1 minute

/**
 * Invalidate the goals cache (call when goals are updated)
 */
export function invalidateGoalsCache(): void {
  goalsCache = null;
  goalsCacheTime = 0;
  console.log('Goals cache invalidated');
}

/**
 * Load goals from Supabase with caching
 */
async function loadGoals(): Promise<any> {
  const now = Date.now();
  
  // Return cached goals if still valid
  if (goalsCache && (now - goalsCacheTime) < GOALS_CACHE_TTL) {
    return goalsCache;
  }
  
  try {
    // Use service role client — this is a server-side read of goal config values,
    // no user data involved. The auth check happens at the dashboard/page level.
    const { data, error } = await getServiceRoleClient()
      .from('goals')
      .select('*');
    
    if (error) {
      throw error;
    }
    
    // Transform database rows into goals object structure
    const goals: Record<string, Record<string, number>> = {};
    
    data?.forEach((row: any) => {
      if (!goals[row.kpi_id]) {
        goals[row.kpi_id] = {};
      }
      goals[row.kpi_id][row.period] = parseFloat(row.value);
    });
    
    goalsCache = goals;
    goalsCacheTime = now;
    return goals;
  } catch (error) {
    console.error('Error loading goals from Supabase:', error);
    // Return default goals as fallback
    return {
      total_sales: {
        current_week: 50,
        previous_week: 50,
        mtd: 200,
        ytd: 2400,
      },
      installs_complete: {
        current_week: 40,
        previous_week: 40,
        mtd: 160,
        ytd: 1920,
      },
      avg_days_pp_to_install: {
        current_week: 60,
        previous_week: 60,
        mtd: 60,
      },
      avg_days_install_to_m2: {
        previous_week: 30,
        ytd: 30,
      },
      avg_days_pp_to_pto: {
        previous_week: 90,
        mtd: 90,
        ytd: 90,
      },
      total_kw_scheduled: {
        current_week: 500,
        next_week: 500,
      },
      total_kw_installed: {
        current_week: 400,
        previous_week: 400,
        mtd: 1600,
        ytd: 19200,
      },
    };
  }
}

/**
 * Get goal for a specific KPI and period
 */
async function getGoal(kpiId: string, period: TimePeriod): Promise<number | undefined> {
  const goals = await loadGoals();
  return goals[kpiId]?.[period];
}

// =============================================================================
// SALES & APPROVAL PIPELINE
// =============================================================================

export async function getTotalSales(period: TimePeriod): Promise<KPIValue> {
  const dateFilter = buildDateFilter('t.`contract-signed`', period);
  
  const sql = `
    SELECT COUNT(*) as count
    FROM \`timeline\` t
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`contract-signed\` IS NOT NULL
      AND pd.\`project-status\` != 'Cancelled'
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND ${dateFilter}
  `;
  
  const result = await queryOne<{ count: number }>(sql);
  const value = result?.count || 0;
  
  // Get previous period for trend
  const prevPeriod = period === 'current_week' ? 'previous_week' : period;
  const prevDateFilter = buildDateFilter('t.`contract-signed`', prevPeriod);
  const prevSql = sql.replace(dateFilter, prevDateFilter);
  const prevResult = await queryOne<{ count: number }>(prevSql);
  const prevValue = prevResult?.count || 0;
  
  const goal = await getGoal('total_sales', period);
  const trend = calculateTrend(value, prevValue);
  
  return {
    value,
    formatted: formatNumber(value),
    trend: trend.trend,
    trendValue: trend.trendValue,
    goal,
    goalFormatted: goal ? formatNumber(goal) : undefined,
    percentToGoal: goal ? Math.round((value / goal) * 100) : undefined,
    status: calculateStatus(value, goal),
  };
}

export async function getTotalSalesGoal(period: TimePeriod): Promise<KPIValue> {
  const goal = await getGoal('total_sales', period) || 0;
  
  return {
    value: goal,
    formatted: formatNumber(goal),
  };
}

export async function getAveyoApproved(period: TimePeriod): Promise<KPIValue> {
  const dateFilter = buildDateFilter('cs.`sow-approved-timestamp`', period);
  
  const sql = `
    SELECT COUNT(DISTINCT cs.\`project-id\`) as count
    FROM \`customer-sow\` cs
    LEFT JOIN \`project-data\` pd ON cs.\`project-id\` = pd.\`project-id\`
    WHERE cs.\`sow-approved-timestamp\` IS NOT NULL
      AND (pd.\`project-status\` IS NULL OR pd.\`project-status\` != 'Cancelled')
      AND ${dateFilter}
  `;
  
  const result = await queryOne<{ count: number }>(sql);
  const value = result?.count || 0;
  
  return {
    value,
    formatted: formatNumber(value),
  };
}

export async function getPullThroughRate(period: TimePeriod): Promise<KPIValue> {
  // Pull through rate for selected period
  // Shows completion rate for jobs sold during the selected time period
  const dateFilter = buildDateFilter('t.`contract-signed`', period);
  
  const totalSql = `
    SELECT COUNT(*) as total
    FROM \`timeline\` t
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`contract-signed\` IS NOT NULL
      AND pd.\`project-status\` != 'Cancelled'
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND ${dateFilter}
  `;
  
  const completedSql = `
    SELECT COUNT(*) as completed
    FROM \`timeline\` t
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`contract-signed\` IS NOT NULL
      AND t.\`install-complete\` IS NOT NULL
      AND pd.\`project-status\` != 'Cancelled'
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND ${dateFilter}
  `;
  
  const totalResult = await queryOne<{ total: number }>(totalSql);
  const completedResult = await queryOne<{ completed: number }>(completedSql);
  
  const total = totalResult?.total || 0;
  const completed = completedResult?.completed || 0;
  const rate = total > 0 ? (completed / total) * 100 : 0;
  
  return {
    value: rate,
    formatted: formatPercentage(rate),
    secondaryValue: completed,
    secondaryFormatted: `${completed} of ${total} jobs`,
    status: rate >= 90 ? 'success' : rate >= 75 ? 'warning' : 'danger',
  };
}

// =============================================================================
// INSTALL OPERATIONS
// =============================================================================

export async function getJobsOnHold(period: TimePeriod): Promise<KPIValue> {
  const sql = `
    SELECT COUNT(*) as count
    FROM \`project-data\` pd
    LEFT JOIN \`timeline\` t ON pd.\`project-dev-id\` = t.\`project-dev-id\`
    WHERE pd.\`project-status\` = 'On Hold'
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
  `;
  
  const result = await queryOne<{ count: number }>(sql);
  const value = result?.count || 0;
  
  return {
    value,
    formatted: formatNumber(value),
    status: value === 0 ? 'success' : value <= 5 ? 'warning' : 'danger',
  };
}

export async function getInstallsComplete(period: TimePeriod): Promise<KPIValue> {
  const dateFilter = buildDateFilter('`install-complete`', period);
  
  const sql = `
    SELECT COUNT(*) as count
    FROM \`timeline\`
    WHERE \`install-complete\` IS NOT NULL
      AND \`install-stage-status\` = 'Complete'
      AND (\`cancellation-reason\` IS NULL OR \`cancellation-reason\` != 'Duplicate Project (Error)')
      AND ${dateFilter}
  `;
  
  const result = await queryOne<{ count: number }>(sql);
  const value = result?.count || 0;
  
  const goal = await getGoal('installs_complete', period);
  
  return {
    value,
    formatted: formatNumber(value),
    goal,
    goalFormatted: goal ? formatNumber(goal) : undefined,
    percentToGoal: goal ? Math.round((value / goal) * 100) : undefined,
    status: calculateStatus(value, goal),
  };
}

export async function getInstallCompletionGoal(period: TimePeriod): Promise<KPIValue> {
  const goal = await getGoal('installs_complete', period) || 0;
  
  return {
    value: goal,
    formatted: formatNumber(goal),
  };
}

export async function getInstallCompleteNoPTO(period: TimePeriod): Promise<KPIValue> {
  const dateFilter = buildDateFilter('t.`install-complete`', period);
  
  const sql = `
    SELECT COUNT(*) as count
    FROM \`timeline\` t
    WHERE t.\`install-complete\` IS NOT NULL
      AND t.\`pto-received\` IS NULL
      AND t.\`install-stage-status\` = 'Complete'
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND ${dateFilter}
  `;
  
  const result = await queryOne<{ count: number }>(sql);
  const value = result?.count || 0;
  
  return {
    value,
    formatted: formatNumber(value),
    status: value <= 20 ? 'success' : value <= 50 ? 'warning' : 'danger',
  };
}

export async function getInstallScheduled(period: TimePeriod): Promise<KPIValue> {
  const dateFilter = buildDateFilter('`install-appointment`', period);
  
  const sql = `
    SELECT COUNT(*) as count
    FROM \`timeline\`
    WHERE \`install-appointment\` IS NOT NULL
      AND (\`cancellation-reason\` IS NULL OR \`cancellation-reason\` != 'Duplicate Project (Error)')
      AND ${dateFilter}
  `;
  
  const result = await queryOne<{ count: number }>(sql);
  const value = result?.count || 0;
  
  return {
    value,
    formatted: formatNumber(value),
  };
}

// =============================================================================
// CYCLE TIMES
// =============================================================================

export async function getAvgDaysPPToInstall(period: TimePeriod): Promise<KPIValue> {
  const dateFilter = buildDateFilter('`install-appointment`', period);
  
  // TODO: Update to use MEDIAN instead of AVG for more accurate cycle time representation
  const sql = `
    SELECT AVG(DATEDIFF(\`install-appointment\`, \`packet-approval\`)) as avg_days
    FROM \`timeline\`
    WHERE \`packet-approval\` IS NOT NULL
      AND \`install-appointment\` IS NOT NULL
      AND (\`cancellation-reason\` IS NULL OR \`cancellation-reason\` != 'Duplicate Project (Error)')
      AND ${dateFilter}
  `;
  
  const result = await queryOne<{ avg_days: number }>(sql);
  const value = result?.avg_days || 0;
  
  const goal = await getGoal('avg_days_pp_to_install', period);
  
  // For cycle times, lower is better - calculate inverse percentage
  const percentToGoal = goal && value > 0 ? Math.round((goal / value) * 100) : undefined;
  
  return {
    value,
    formatted: formatDays(value),
    goal,
    goalFormatted: goal ? formatDays(goal) : undefined,
    percentToGoal,
    status: goal ? (value <= goal ? 'success' : value <= goal * 1.2 ? 'warning' : 'danger') : 'neutral',
  };
}

export async function getAvgDaysInstallToM2(period: TimePeriod): Promise<KPIValue> {
  const dateFilter = buildDateFilter('t.`install-appointment`', period);
  
  // TODO: Update to use MEDIAN instead of AVG for more accurate cycle time representation
  const sql = `
    SELECT AVG(DATEDIFF(pd.\`m2-approved\`, t.\`install-appointment\`)) as avg_days
    FROM \`timeline\` t
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`install-appointment\` IS NOT NULL
      AND pd.\`m2-approved\` IS NOT NULL
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND ${dateFilter}
  `;
  
  const result = await queryOne<{ avg_days: number }>(sql);
  const value = result?.avg_days || 0;
  
  const goal = await getGoal('avg_days_install_to_m2', period);
  
  // For cycle times, lower is better - calculate inverse percentage
  const percentToGoal = goal && value > 0 ? Math.round((goal / value) * 100) : undefined;
  
  return {
    value,
    formatted: formatDays(value),
    goal,
    goalFormatted: goal ? formatDays(goal) : undefined,
    percentToGoal,
    status: goal ? (value <= goal ? 'success' : value <= goal * 1.2 ? 'warning' : 'danger') : 'neutral',
  };
}

export async function getAvgDaysPPToPTO(period: TimePeriod): Promise<KPIValue> {
  const dateFilter = buildDateFilter('`pto-received`', period);
  
  // TODO: Update to use MEDIAN instead of AVG for more accurate cycle time representation
  const sql = `
    SELECT AVG(DATEDIFF(\`pto-received\`, \`packet-approval\`)) as avg_days
    FROM \`timeline\`
    WHERE \`packet-approval\` IS NOT NULL
      AND \`pto-received\` IS NOT NULL
      AND (\`cancellation-reason\` IS NULL OR \`cancellation-reason\` != 'Duplicate Project (Error)')
      AND ${dateFilter}
  `;
  
  const result = await queryOne<{ avg_days: number }>(sql);
  const value = result?.avg_days || 0;
  
  const goal = await getGoal('avg_days_pp_to_pto', period);
  
  // For cycle times, lower is better - calculate inverse percentage
  const percentToGoal = goal && value > 0 ? Math.round((goal / value) * 100) : undefined;
  
  return {
    value,
    formatted: formatDays(value),
    goal,
    goalFormatted: goal ? formatDays(goal) : undefined,
    percentToGoal,
    status: goal ? (value <= goal ? 'success' : value <= goal * 1.2 ? 'warning' : 'danger') : 'neutral',
  };
}

// =============================================================================
// RESIDENTIAL FINANCIALS
// =============================================================================

export async function getARM2M3(period: TimePeriod): Promise<KPIValue> {
  // Calculate M2 outstanding (80% of contract price for submitted but not received)
  // NOTE: Now using funding table which has all M2/M3 data
  const m2Sql = `
    SELECT 
      SUM(f.\`contract-price\` * 0.8) as m2_total,
      COUNT(DISTINCT f.project_ids) as m2_count
    FROM funding f
    LEFT JOIN \`timeline\` t ON f.project_ids = t.\`project-dev-id\`
    WHERE f.\`m2-submitted-date\` IS NOT NULL
      AND f.\`m2-received-date\` IS NULL
      AND f.\`project-status-2\` IN ('Active', 'New Lender', 'Finance Hold', 'Pre-Approvals')
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
  `;
  
  // Calculate M3 outstanding (20% of contract price for submitted but not received)
  // NOTE: funding table includes m3-received-date field
  const m3Sql = `
    SELECT 
      SUM(f.\`contract-price\` * 0.2) as m3_total,
      COUNT(DISTINCT f.project_ids) as m3_count
    FROM funding f
    LEFT JOIN \`timeline\` t ON f.project_ids = t.\`project-dev-id\`
    WHERE f.\`m3-submitted-date\` IS NOT NULL
      AND f.\`m3-received-date\` IS NULL
      AND f.\`project-status-2\` IN ('Active', 'New Lender', 'Finance Hold', 'Pre-Approvals')
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
  `;
  
  // Count distinct projects with outstanding A/R (either M2 or M3)
  const countSql = `
    SELECT COUNT(DISTINCT f.project_ids) as project_count
    FROM funding f
    LEFT JOIN \`timeline\` t ON f.project_ids = t.\`project-dev-id\`
    WHERE f.\`project-status-2\` IN ('Active', 'New Lender', 'Finance Hold', 'Pre-Approvals')
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND (
        (f.\`m2-submitted-date\` IS NOT NULL AND f.\`m2-received-date\` IS NULL)
        OR
        (f.\`m3-submitted-date\` IS NOT NULL AND f.\`m3-received-date\` IS NULL)
      )
  `;
  
  const m2Result = await queryOne<{ m2_total: number; m2_count: number }>(m2Sql);
  const m3Result = await queryOne<{ m3_total: number; m3_count: number }>(m3Sql);
  const countResult = await queryOne<{ project_count: number }>(countSql);
  
  const m2Value = m2Result?.m2_total || 0;
  const m3Value = m3Result?.m3_total || 0;
  const m2Count = m2Result?.m2_count || 0;
  const m3Count = m3Result?.m3_count || 0;
  const value = m2Value + m3Value;
  const projectCount = countResult?.project_count || 0;
  
  return {
    value,
    formatted: formatCurrency(value),
    secondaryValue: projectCount,
    secondaryFormatted: `${projectCount} project${projectCount !== 1 ? 's' : ''} (${m2Count} M2, ${m3Count} M3)`,
  };
}

export async function getRevenueReceived(period: TimePeriod): Promise<KPIValue> {
  const dateFilter = buildDateFilter('pd.`m1-received-date`', period);
  const dateFilter2 = buildDateFilter('pd.`m2-received-date`', period);
  
  // Calculate M1 revenue (20% of contract price) received in period
  const m1Sql = `
    SELECT SUM(pd.\`contract-price\` * 0.2) as m1_revenue
    FROM \`project-data\` pd
    LEFT JOIN \`timeline\` t ON pd.\`project-dev-id\` = t.\`project-dev-id\`
    WHERE pd.\`m1-received-date\` IS NOT NULL
      AND ${dateFilter}
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
  `;
  
  // Calculate M2 revenue (80% of contract price) received in period  
  const m2Sql = `
    SELECT SUM(pd.\`contract-price\` * 0.8) as m2_revenue
    FROM \`project-data\` pd
    LEFT JOIN \`timeline\` t ON pd.\`project-dev-id\` = t.\`project-dev-id\`
    WHERE pd.\`m2-received-date\` IS NOT NULL
      AND ${dateFilter2}
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
  `;
  
  // Count distinct projects with revenue received in period (M1 or M2)
  const countSql = `
    SELECT COUNT(DISTINCT pd.\`project-dev-id\`) as project_count
    FROM \`project-data\` pd
    LEFT JOIN \`timeline\` t ON pd.\`project-dev-id\` = t.\`project-dev-id\`
    WHERE (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND (
        (pd.\`m1-received-date\` IS NOT NULL AND ${dateFilter})
        OR
        (pd.\`m2-received-date\` IS NOT NULL AND ${dateFilter2})
      )
  `;
  
  const m1Result = await queryOne<{ m1_revenue: number }>(m1Sql);
  const m2Result = await queryOne<{ m2_revenue: number }>(m2Sql);
  const countResult = await queryOne<{ project_count: number }>(countSql);
  
  const m1Value = m1Result?.m1_revenue || 0;
  const m2Value = m2Result?.m2_revenue || 0;
  const value = m1Value + m2Value;
  const projectCount = countResult?.project_count || 0;
  
  return {
    value,
    formatted: formatCurrency(value),
    secondaryValue: projectCount,
    secondaryFormatted: `${projectCount} project${projectCount !== 1 ? 's' : ''}`,
  };
}

export async function getInstallM2NotApproved(period: TimePeriod): Promise<KPIValue> {
  const dateFilter = buildDateFilter('t.`install-complete`', period);
  
  const sql = `
    SELECT SUM(pd.\`contract-price\` * 0.8) as total
    FROM \`timeline\` t
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`install-complete\` IS NOT NULL
      AND pd.\`m2-approved\` IS NULL
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND ${dateFilter}
  `;
  
  const result = await queryOne<{ total: number }>(sql);
  const value = result?.total || 0;
  
  return {
    value,
    formatted: formatCurrency(value),
    status: value <= 100000 ? 'success' : value <= 500000 ? 'warning' : 'danger',
  };
}

export async function getInstallStartedM2NotReceived(period: TimePeriod): Promise<KPIValue> {
  // No period filter - this is a snapshot of current state
  // Shows all projects with install complete but M2 payment not yet received
  
  const amountSql = `
    SELECT SUM(f.\`contract-price\` * 0.8) as total_amount
    FROM \`timeline\` t
    JOIN \`funding\` f ON t.\`project-dev-id\` = f.\`project_ids\`
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`install-complete\` IS NOT NULL
      AND f.\`m2-received-date\` IS NULL
      AND pd.\`project-status\` IN ('Active', 'Complete', 'Pre-Approvals', 'New Lender', 'Finance Hold')
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
  `;
  
  const countSql = `
    SELECT COUNT(*) as count
    FROM \`timeline\` t
    JOIN \`funding\` f ON t.\`project-dev-id\` = f.\`project_ids\`
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`install-complete\` IS NOT NULL
      AND f.\`m2-received-date\` IS NULL
      AND pd.\`project-status\` IN ('Active', 'Complete', 'Pre-Approvals', 'New Lender', 'Finance Hold')
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
  `;
  
  const amountResult = await queryOne<{ total_amount: number }>(amountSql);
  const countResult = await queryOne<{ count: number }>(countSql);
  
  const value = amountResult?.total_amount || 0;
  const projectCount = countResult?.count || 0;
  
  return {
    value,
    formatted: formatCurrency(value),
    secondaryValue: projectCount,
    secondaryFormatted: `${projectCount} projects`,
    status: value >= 500000 ? 'danger' : value >= 200000 ? 'warning' : 'success',
  };
}

export async function getTotalHoldback(period: TimePeriod): Promise<KPIValue> {
  // Placeholder - need to clarify data source
  return {
    value: 0,
    formatted: formatCurrency(0),
  };
}

export async function getTotalDCA(period: TimePeriod): Promise<KPIValue> {
  // Placeholder - need to clarify data source
  return {
    value: 0,
    formatted: formatCurrency(0),
  };
}

export async function getPTOReceivedM3NotReceived(period: TimePeriod): Promise<KPIValue> {
  // No period filter - this is a snapshot of current state
  // Shows all projects with PTO received but M3 payment not yet received
  
  const amountSql = `
    SELECT SUM(f.\`contract-price\` * 0.2) as total_amount
    FROM \`timeline\` t
    JOIN \`funding\` f ON t.\`project-dev-id\` = f.\`project_ids\`
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`pto-received\` IS NOT NULL
      AND f.\`m3-received-date\` IS NULL
      AND pd.\`project-status\` IN ('Active', 'Complete', 'Pre-Approvals', 'New Lender', 'Finance Hold')
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
  `;
  
  const countSql = `
    SELECT COUNT(*) as count
    FROM \`timeline\` t
    JOIN \`funding\` f ON t.\`project-dev-id\` = f.\`project_ids\`
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`pto-received\` IS NOT NULL
      AND f.\`m3-received-date\` IS NULL
      AND pd.\`project-status\` IN ('Active', 'Complete', 'Pre-Approvals', 'New Lender', 'Finance Hold')
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
  `;
  
  const amountResult = await queryOne<{ total_amount: number }>(amountSql);
  const countResult = await queryOne<{ count: number }>(countSql);
  
  const value = amountResult?.total_amount || 0;
  const projectCount = countResult?.count || 0;
  
  return {
    value,
    formatted: formatCurrency(value),
    secondaryValue: projectCount,
    secondaryFormatted: `${projectCount} projects`,
    status: value >= 300000 ? 'danger' : value >= 100000 ? 'warning' : 'success',
  };
}

export async function getActiveInstallNotStarted(period: TimePeriod): Promise<KPIValue> {
  // No period filter - this is a snapshot of current state
  // Shows active projects without an install appointment
  
  const sql = `
    SELECT COUNT(*) as count
    FROM \`timeline\` t
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE pd.\`project-status\` = 'Active'
      AND t.\`install-appointment\` IS NULL
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
  `;
  
  const result = await queryOne<{ count: number }>(sql);
  const value = result?.count || 0;
  
  return {
    value,
    formatted: formatNumber(value),
    status: value >= 50 ? 'danger' : value >= 20 ? 'warning' : 'success',
  };
}

export async function getAvgSaleToGlass(period: TimePeriod): Promise<KPIValue> {
  const dateFilter = buildDateFilter('t.`contract-signed`', period);
  
  const sql = `
    SELECT AVG(DATEDIFF(t.\`panel-install-complete\`, t.\`contract-signed\`)) as avg_days
    FROM \`timeline\` t
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`contract-signed\` IS NOT NULL
      AND t.\`panel-install-complete\` IS NOT NULL
      AND pd.\`project-status\` != 'Cancelled'
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND ${dateFilter}
  `;
  
  const result = await queryOne<{ avg_days: number }>(sql);
  const value = result?.avg_days || 0;
  
  return {
    value,
    formatted: `${formatNumber(value)} days`,
  };
}

export async function getAvgSaleToPTO(period: TimePeriod): Promise<KPIValue> {
  const dateFilter = buildDateFilter('t.`contract-signed`', period);
  
  const sql = `
    SELECT AVG(DATEDIFF(t.\`pto-received\`, t.\`contract-signed\`)) as avg_days
    FROM \`timeline\` t
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`contract-signed\` IS NOT NULL
      AND t.\`pto-received\` IS NOT NULL
      AND pd.\`project-status\` != 'Cancelled'
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND ${dateFilter}
  `;
  
  const result = await queryOne<{ avg_days: number }>(sql);
  const value = result?.avg_days || 0;
  
  return {
    value,
    formatted: `${formatNumber(value)} days`,
  };
}

export async function getRepsWithSale(period: TimePeriod): Promise<KPIValue> {
  const dateFilter = buildDateFilter('t.`contract-signed`', period);
  
  // Count unique closers (sales-rep-id) and setters (setter-id) who had sales in the period
  const closersSql = `
    SELECT COUNT(DISTINCT pd.\`sales-rep-id\`) as closer_count
    FROM \`timeline\` t
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`contract-signed\` IS NOT NULL
      AND pd.\`sales-rep-id\` IS NOT NULL
      AND pd.\`sales-rep-id\` != ''
      AND pd.\`project-status\` != 'Cancelled'
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND ${dateFilter}
  `;
  
  const settersSql = `
    SELECT COUNT(DISTINCT pd.\`setter-id\`) as setter_count
    FROM \`timeline\` t
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`contract-signed\` IS NOT NULL
      AND pd.\`setter-id\` IS NOT NULL
      AND pd.\`setter-id\` != ''
      AND pd.\`project-status\` != 'Cancelled'
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND ${dateFilter}
  `;
  
  const closersResult = await queryOne<{ closer_count: number }>(closersSql);
  const settersResult = await queryOne<{ setter_count: number }>(settersSql);
  
  const closerCount = closersResult?.closer_count || 0;
  const setterCount = settersResult?.setter_count || 0;
  const totalReps = closerCount + setterCount;
  
  return {
    value: totalReps,
    formatted: formatNumber(totalReps),
    secondaryValue: closerCount,
    secondaryFormatted: `${closerCount} closers, ${setterCount} setters`,
  };
}

export async function getPullThroughRolling6Month(period: TimePeriod): Promise<KPIValue> {
  // Rolling 6-month calculation: jobs sold 61-180 days ago
  // Formula: (Jobs with install-complete / Total jobs sold) in that window
  
  const totalSql = `
    SELECT COUNT(*) as total
    FROM \`timeline\` t
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`contract-signed\` >= DATE_SUB(CURDATE(), INTERVAL 180 DAY)
      AND t.\`contract-signed\` <= DATE_SUB(CURDATE(), INTERVAL 61 DAY)
      AND pd.\`project-status\` != 'Cancelled'
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
  `;
  
  const completedSql = `
    SELECT COUNT(*) as completed
    FROM \`timeline\` t
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`contract-signed\` >= DATE_SUB(CURDATE(), INTERVAL 180 DAY)
      AND t.\`contract-signed\` <= DATE_SUB(CURDATE(), INTERVAL 61 DAY)
      AND t.\`install-complete\` IS NOT NULL
      AND pd.\`project-status\` != 'Cancelled'
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
  `;
  
  const totalResult = await queryOne<{ total: number }>(totalSql);
  const completedResult = await queryOne<{ completed: number }>(completedSql);
  
  const total = totalResult?.total || 0;
  const completed = completedResult?.completed || 0;
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  
  return {
    value: percentage,
    formatted: formatPercentage(percentage),
    secondaryValue: completed,
    secondaryFormatted: `${completed} of ${total} jobs`,
  };
}

export async function getMaxPullThroughRolling6Month(period: TimePeriod): Promise<KPIValue> {
  // Rolling 6-month calculation: jobs sold 61-180 days ago
  // Formula: (Active jobs / Total jobs sold) in that window
  // Active = ALL jobs EXCEPT Cancelled, Pending Cancel, On Hold, Finance Hold
  // (includes: Active, Complete, Pre-Approvals, New Lender, etc.)
  
  const totalSql = `
    SELECT COUNT(*) as total
    FROM \`timeline\` t
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`contract-signed\` >= DATE_SUB(CURDATE(), INTERVAL 180 DAY)
      AND t.\`contract-signed\` <= DATE_SUB(CURDATE(), INTERVAL 61 DAY)
      AND pd.\`project-status\` != 'Cancelled'
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
  `;
  
  const activeSql = `
    SELECT COUNT(*) as active
    FROM \`timeline\` t
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`contract-signed\` >= DATE_SUB(CURDATE(), INTERVAL 180 DAY)
      AND t.\`contract-signed\` <= DATE_SUB(CURDATE(), INTERVAL 61 DAY)
      AND pd.\`project-status\` NOT IN ('Cancelled', 'Pending Cancel', 'On Hold', 'Finance Hold')
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
  `;
  
  const totalResult = await queryOne<{ total: number }>(totalSql);
  const activeResult = await queryOne<{ active: number }>(activeSql);
  
  const total = totalResult?.total || 0;
  const active = activeResult?.active || 0;
  const percentage = total > 0 ? (active / total) * 100 : 0;
  
  return {
    value: percentage,
    formatted: formatPercentage(percentage),
    secondaryValue: active,
    secondaryFormatted: `${active} of ${total} jobs`,
  };
}

// =============================================================================
// ACTIVE PIPELINE
// =============================================================================

interface PipelineMilestone {
  stage: number;
  name: string;
  fullName: string;
  count: number;
}

export async function getActiveNoPTO(period: TimePeriod): Promise<KPIValue> {
  // Query to get count of projects at each milestone stage
  const sql = `
    SELECT 
      CASE
        WHEN t.\`pto-submitted\` IS NOT NULL AND t.\`pto-received\` IS NULL THEN 13
        WHEN t.\`ahj-inspection-complete\` IS NOT NULL THEN 12
        WHEN t.\`install-complete\` IS NOT NULL THEN 11
        WHEN t.\`panel-install-complete\` IS NOT NULL THEN 10
        WHEN t.\`install-appointment\` IS NOT NULL THEN 9
        WHEN t.\`install-ready-date\` IS NOT NULL THEN 8
        WHEN t.\`equipment-ordered\` IS NOT NULL THEN 7
        WHEN t.\`all-permits-complete\` IS NOT NULL THEN 6
        WHEN t.\`engineering-complete\` IS NOT NULL THEN 5
        WHEN t.\`ntp-complete\` IS NOT NULL THEN 4
        WHEN t.\`site-survey-complete\` IS NOT NULL THEN 3
        WHEN t.\`contract-signed\` IS NOT NULL THEN 2
        ELSE 1
      END as milestone_stage,
      COUNT(*) as count
    FROM \`project-data\` pd
    JOIN \`timeline\` t ON pd.\`project-dev-id\` = t.\`project-dev-id\`
    WHERE pd.\`project-status\` IN ('Active', 'Complete', 'Pre-Approvals', 'New Lender', 'Finance Hold')
      AND t.\`pto-received\` IS NULL
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
    GROUP BY milestone_stage
    ORDER BY milestone_stage
  `;
  
  const results = await query<{ milestone_stage: number; count: number }>(sql);
  
  // Define all milestone stages with names
  const milestoneDefinitions = [
    { stage: 1, name: '1', fullName: 'Initial - No Milestones', count: 0 },
    { stage: 2, name: '2', fullName: 'Contract Signed', count: 0 },
    { stage: 3, name: '3', fullName: 'Site Survey Complete', count: 0 },
    { stage: 4, name: '4', fullName: 'NTP Complete', count: 0 },
    { stage: 5, name: '5', fullName: 'Engineering Complete', count: 0 },
    { stage: 6, name: '6', fullName: 'All Permits Complete', count: 0 },
    { stage: 7, name: '7', fullName: 'Equipment Ordered', count: 0 },
    { stage: 8, name: '8', fullName: 'Install Ready', count: 0 },
    { stage: 9, name: '9', fullName: 'Install Appointment Scheduled', count: 0 },
    { stage: 10, name: '10', fullName: 'Panel Install Complete', count: 0 },
    { stage: 11, name: '11', fullName: 'Install Complete', count: 0 },
    { stage: 12, name: '12', fullName: 'AHJ Inspection Complete', count: 0 },
    { stage: 13, name: '13', fullName: 'PTO Submitted - Awaiting Approval', count: 0 },
  ];
  
  // Map results to milestone definitions (update counts from query results)
  const milestones: PipelineMilestone[] = milestoneDefinitions.map(def => {
    const result = results.find((r) => r.milestone_stage === def.stage);
    return {
      stage: def.stage,
      name: def.name,
      fullName: def.fullName,
      count: result ? result.count : 0
    };
  });
  
  const totalCount = milestones.reduce((sum, m) => sum + m.count, 0);
  
  return {
    value: totalCount,
    formatted: formatNumber(totalCount),
    metadata: {
      milestones: milestones
    }
  };
}

export async function getPTOReceivedCount(period: TimePeriod): Promise<KPIValue> {
  const dateFilter = buildDateFilter('`pto-received`', period);
  
  const sql = `
    SELECT COUNT(*) as count
    FROM \`timeline\`
    WHERE \`pto-received\` IS NOT NULL
      AND (\`cancellation-reason\` IS NULL OR \`cancellation-reason\` != 'Duplicate Project (Error)')
      AND ${dateFilter}
  `;
  
  const result = await queryOne<{ count: number }>(sql);
  const value = result?.count || 0;
  
  return {
    value,
    formatted: formatNumber(value),
  };
}

export async function getBatteryPercentage(period: TimePeriod): Promise<KPIValue> {
  const dateFilter = buildDateFilter('t.`contract-signed`', period);
  
  // Get total sales in period (denominator)
  const totalSales = await getTotalSales(period);
  const totalValue = typeof totalSales.value === 'number' ? totalSales.value : 0;
  
  // Get sales with battery (numerator)
  const batterySql = `
    SELECT COUNT(*) as count
    FROM \`timeline\` t
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`contract-signed\` IS NOT NULL
      AND pd.\`battery-count\` > 0
      AND pd.\`project-status\` != 'Cancelled'
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND ${dateFilter}
  `;
  
  const result = await queryOne<{ count: number }>(batterySql);
  const batteryCount = result?.count || 0;
  
  const percentage = totalValue > 0 ? (batteryCount / totalValue) * 100 : 0;
  
  return {
    value: percentage,
    formatted: formatPercentage(percentage),
    secondaryValue: batteryCount,
    secondaryFormatted: `${batteryCount} of ${totalValue} jobs`,
  };
}

export async function getPacketApprovalPercentage(period: TimePeriod): Promise<KPIValue> {
  const dateFilter = buildDateFilter('t.`contract-signed`', period);
  
  // Get total sales in period (denominator)
  const totalSales = await getTotalSales(period);
  const totalValue = typeof totalSales.value === 'number' ? totalSales.value : 0;
  
  // Get packet approvals in same period (numerator)
  const approvalSql = `
    SELECT COUNT(*) as count
    FROM \`timeline\` t
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`contract-signed\` IS NOT NULL
      AND t.\`packet-approval\` IS NOT NULL
      AND pd.\`project-status\` != 'Cancelled'
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND ${dateFilter}
  `;
  
  const result = await queryOne<{ count: number }>(approvalSql);
  const approvalCount = result?.count || 0;
  
  const percentage = totalValue > 0 ? (approvalCount / totalValue) * 100 : 0;
  
  return {
    value: percentage,
    formatted: formatPercentage(percentage),
    secondaryValue: approvalCount,
    secondaryFormatted: `${approvalCount} of ${totalValue} sales`,
  };
}

// =============================================================================
// COMMERCIAL DIVISION
// =============================================================================

export async function getTotalKWScheduled(period: TimePeriod): Promise<KPIValue> {
  const dateFilter = buildDateFilter('t.`install-appointment`', period);
  
  const sql = `
    SELECT SUM(pd.\`system-size\`) as total_kw
    FROM \`timeline\` t
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`install-appointment\` IS NOT NULL
      AND t.\`install-complete\` IS NULL
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND ${dateFilter}
  `;
  
  const result = await queryOne<{ total_kw: number }>(sql);
  const value = result?.total_kw || 0;
  
  const goal = await getGoal('total_kw_scheduled', period);
  
  return {
    value,
    formatted: formatNumber(value),
    goal,
    goalFormatted: goal ? formatNumber(goal) : undefined,
    percentToGoal: goal ? Math.round((value / goal) * 100) : undefined,
    status: calculateStatus(value, goal),
  };
}

export async function getKWScheduledGoal(period: TimePeriod): Promise<KPIValue> {
  const goal = await getGoal('total_kw_scheduled', period) || 0;
  
  return {
    value: goal,
    formatted: formatNumber(goal),
  };
}

export async function getTotalKWInstalled(period: TimePeriod): Promise<KPIValue> {
  const dateFilter = buildDateFilter('t.`install-complete`', period);
  
  const sql = `
    SELECT SUM(pd.\`system-size\`) as total_kw
    FROM \`timeline\` t
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`install-complete\` IS NOT NULL
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND ${dateFilter}
  `;
  
  const result = await queryOne<{ total_kw: number }>(sql);
  const value = result?.total_kw || 0;
  
  const goal = await getGoal('total_kw_installed', period);
  
  return {
    value,
    formatted: formatNumber(value),
    goal,
    goalFormatted: goal ? formatNumber(goal) : undefined,
    percentToGoal: goal ? Math.round((value / goal) * 100) : undefined,
    status: calculateStatus(value, goal),
  };
}

export async function getKWInstalledGoal(period: TimePeriod): Promise<KPIValue> {
  const goal = await getGoal('total_kw_installed', period) || 0;
  
  return {
    value: goal,
    formatted: formatNumber(goal),
  };
}

export async function getARCommercial(period: TimePeriod): Promise<KPIValue> {
  // Same as residential for now - need to add commercial filter when available
  return await getARM2M3(period);
}

export async function getRevenueReceivedCommercial(period: TimePeriod): Promise<KPIValue> {
  // Same as residential for now - need to add commercial filter when available
  return await getRevenueReceived(period);
}

// =============================================================================
// CUSTOM KPI EXECUTION
// =============================================================================

/**
 * Fetch custom KPI from Supabase
 */
async function getCustomKPI(kpiId: string): Promise<CustomKPIRecord | null> {
  try {
    // Use service role client — server-side lookup of KPI formula config.
    const { data, error } = await getServiceRoleClient()
      .from('custom_kpis')
      .select('*')
      .eq('kpi_id', kpiId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data as CustomKPIRecord;
  } catch (error) {
    console.error('Error fetching custom KPI:', error);
    return null;
  }
}

/**
 * Format secondary value based on format type
 */
function formatSecondaryValue(value: any, format: 'count' | 'breakdown' | 'text' | null): string {
  if (!format || value === null || value === undefined) return '';
  
  switch (format) {
    case 'count':
      return `${value} ${value === 1 ? 'item' : 'items'}`;
    case 'breakdown':
      // For breakdown, value should be an object with counts
      if (typeof value === 'object') {
        const parts = Object.entries(value)
          .filter(([_, val]) => val !== null && val !== undefined)
          .map(([key, val]) => `${val} ${key}`)
          .join(', ');
        return parts || String(value);
      }
      return String(value);
    case 'text':
      return String(value);
    default:
      return String(value);
  }
}

/**
 * Execute SQL-based custom KPI formula
 */
async function executeSQLFormula(
  kpi: CustomKPIRecord,
  period: TimePeriod
): Promise<KPIValue> {
  // Replace @field tokens with actual SQL field names
  let sql = replaceFieldTokens(kpi.formula);
  
  // If formula has {{dateFilter}} placeholder, replace it with actual date filter
  if (sql.includes('{{dateFilter}}')) {
    const dateField = kpi.field_mappings?.dateField || 't.`contract-signed`';
    const dateFilter = buildDateFilter(dateField, period);
    sql = sql.replace(/\{\{dateFilter\}\}/gi, dateFilter);
  }
  
  // Execute the query
  const result = await queryOne<any>(sql);
  
  // Extract the value (look for common column names)
  let value: number = 0;
  if (result) {
    value = result.value ?? result.count ?? result.total ?? result.avg_days ?? 0;
  }
  
  // Format based on KPI format type
  let formatted: string;
  switch (kpi.format) {
    case 'currency':
      formatted = formatCurrency(value);
      break;
    case 'percentage':
      formatted = formatPercentage(value);
      break;
    case 'days':
      formatted = formatDays(value);
      break;
    default:
      formatted = formatNumber(value);
  }
  
  // Execute secondary formula if present
  let secondaryValue: number | string | undefined;
  let secondaryFormatted: string | undefined;
  
  if (kpi.secondary_formula) {
    try {
      let secondarySql = replaceFieldTokens(kpi.secondary_formula);
      
      // Replace date filter in secondary formula if needed
      if (secondarySql.includes('{{dateFilter}}')) {
        const dateField = kpi.field_mappings?.dateField || 't.`contract-signed`';
        const dateFilter = buildDateFilter(dateField, period);
        secondarySql = secondarySql.replace(/\{\{dateFilter\}\}/gi, dateFilter);
      }
      
      const secondaryResult = await queryOne<any>(secondarySql);
      
      if (secondaryResult) {
        // Extract secondary value
        secondaryValue = secondaryResult.value ?? secondaryResult.count ?? secondaryResult.total_count;
        
        // Format based on secondary_format
        if (kpi.secondary_format === 'breakdown' && typeof secondaryResult === 'object') {
          // For breakdown, pass the entire result object
          secondaryFormatted = formatSecondaryValue(secondaryResult, kpi.secondary_format);
        } else {
          secondaryFormatted = formatSecondaryValue(secondaryValue, kpi.secondary_format);
        }
      }
    } catch (error) {
      console.error('Error executing secondary formula:', error);
      // Continue without secondary value if it fails
    }
  }
  
  // Get goal and calculate status, trend
  const goal = await getGoal(kpi.kpi_id, period);
  
  // Calculate trend (compare with previous period if applicable)
  let trend: KPITrend | undefined;
  let trendValue: string | undefined;
  
  if (period === 'current_week' || period === 'mtd' || period === 'ytd') {
    try {
      // Get previous period value
      const prevPeriod = period === 'current_week' ? 'previous_week' : period;
      let prevSql = replaceFieldTokens(kpi.formula);
      if (prevSql.includes('{{dateFilter}}')) {
        const dateField = kpi.field_mappings?.dateField || 't.`contract-signed`';
        const prevDateFilter = buildDateFilter(dateField, prevPeriod);
        prevSql = prevSql.replace(/\{\{dateFilter\}\}/gi, prevDateFilter);
      }
      const prevResult = await queryOne<any>(prevSql);
      const prevValue = prevResult?.value ?? prevResult?.count ?? prevResult?.total ?? prevResult?.avg_days ?? 0;
      
      const trendCalc = calculateTrend(value, prevValue);
      trend = trendCalc.trend;
      trendValue = trendCalc.trendValue;
    } catch (error) {
      // Silently fail trend calculation
      console.error('Error calculating trend for custom KPI:', error);
    }
  }
  
  return {
    value,
    formatted,
    secondaryValue,
    secondaryFormatted,
    status: calculateStatus(value, goal),
    trend,
    trendValue,
    goal,
    goalFormatted: goal ? formatNumber(goal) : undefined,
    percentToGoal: goal ? Math.round((value / goal) * 100) : undefined,
  };
}

/**
 * Execute expression-based custom KPI formula
 */
async function executeExpressionFormula(
  kpi: CustomKPIRecord,
  period: TimePeriod
): Promise<KPIValue> {
  // Extract variable names from expression
  const variables = extractExpressionVariables(kpi.formula);
  
  // Fetch values for each variable from field_mappings
  const values: Record<string, number> = {};
  
  for (const varName of variables) {
    const mapping = kpi.field_mappings?.[varName];
    if (mapping) {
      // If mapping is a KPI ID, fetch that KPI value
      if (typeof mapping === 'string') {
        const kpiValue = await getKPIValue(mapping, period);
        values[varName] = typeof kpiValue.value === 'number' ? kpiValue.value : 0;
      } else if (mapping.sql) {
        // If mapping is a SQL query, execute it
        const result = await queryOne<any>(mapping.sql);
        values[varName] = result?.value ?? result?.count ?? 0;
      }
    } else {
      values[varName] = 0;
    }
  }
  
  // Replace variables in formula with their values
  let expression = kpi.formula;
  for (const [varName, value] of Object.entries(values)) {
    expression = expression.replace(new RegExp(`@${varName}`, 'g'), String(value));
  }
  
  // Evaluate the expression safely
  try {
    // Use Function constructor for safer evaluation than eval()
    // eslint-disable-next-line no-new-func
    const result = new Function(`return ${expression}`)();
    const value = Number(result) || 0;
    
    // Format based on KPI format type
    let formatted: string;
    switch (kpi.format) {
      case 'currency':
        formatted = formatCurrency(value);
        break;
      case 'percentage':
        formatted = formatPercentage(value);
        break;
      case 'days':
        formatted = formatDays(value);
        break;
      default:
        formatted = formatNumber(value);
    }
    
    // Get goal and calculate status
    const goal = await getGoal(kpi.kpi_id, period);
    
    // For expression KPIs, trend calculation would require re-evaluating with previous period
    // This is complex, so we'll skip trend for now or implement later if needed
    
    return {
      value,
      formatted,
      status: calculateStatus(value, goal),
      goal,
      goalFormatted: goal ? formatNumber(goal) : undefined,
      percentToGoal: goal ? Math.round((value / goal) * 100) : undefined,
    };
  } catch (error) {
    console.error('Error evaluating expression:', error);
    return {
      value: 0,
      formatted: 'Error',
      status: 'neutral' as KPIStatus
    };
  }
}

/**
 * Execute custom KPI formula
 */
export async function executeCustomKPI(
  kpi: CustomKPIRecord,
  period: TimePeriod
): Promise<KPIValue> {
  if (kpi.formula_type === 'sql') {
    return executeSQLFormula(kpi, period);
  } else {
    return executeExpressionFormula(kpi, period);
  }
}

// =============================================================================
// MAIN KPI FETCHER
// =============================================================================

export async function getKPIValue(kpiId: string, period: TimePeriod): Promise<KPIValue> {
  // Special case: active_no_pto always uses TypeScript implementation for milestone breakdown
  if (kpiId === 'active_no_pto') {
    return getActiveNoPTO(period);
  }
  
  // First, check if this is a custom or original KPI in database
  const customKPI = await getCustomKPI(kpiId);
  if (customKPI) {
    try {
      return await executeCustomKPI(customKPI, period);
    } catch (error) {
      console.error(`KPI ${kpiId} failed from database, falling back to TypeScript:`, error);
      // If it's an original KPI and fails, fall through to TypeScript fallback
      // If it's a custom KPI and fails, re-throw the error
      if (!customKPI.is_original) {
        throw error;
      }
      // Fall through to TypeScript implementation for original KPIs
    }
  }
  
  // TypeScript fallback for built-in KPIs
  switch (kpiId) {
    // Sales & Approval Pipeline
    case 'total_sales': return getTotalSales(period);
    case 'total_sales_goal': return getTotalSalesGoal(period);
    case 'aveyo_approved': return getAveyoApproved(period);
    case 'pull_through_rate': return getPullThroughRate(period);
    case 'battery_percentage': return getBatteryPercentage(period);
    case 'packet_approval_percentage': return getPacketApprovalPercentage(period);
    
    // Install Operations
    case 'jobs_on_hold': return getJobsOnHold(period);
    case 'installs_complete': return getInstallsComplete(period);
    case 'install_completion_goal': return getInstallCompletionGoal(period);
    case 'install_complete_no_pto': return getInstallCompleteNoPTO(period);
    case 'install_scheduled': return getInstallScheduled(period);
    
    // Cycle Times
    case 'avg_days_pp_to_install': return getAvgDaysPPToInstall(period);
    case 'avg_days_install_to_m2': return getAvgDaysInstallToM2(period);
    case 'avg_days_pp_to_pto': return getAvgDaysPPToPTO(period);
    
    // Residential Financials
    case 'ar_m2_m3': return getARM2M3(period);
    case 'revenue_received': return getRevenueReceived(period);
    case 'install_m2_not_approved': return getInstallM2NotApproved(period);
    case 'total_holdback': return getTotalHoldback(period);
    case 'total_dca': return getTotalDCA(period);
    
    // Finance Buckets
    case 'install_started_m2_not_received': return getInstallStartedM2NotReceived(period);
    case 'pto_received_m3_not_received': return getPTOReceivedM3NotReceived(period);
    
    // Active Pipeline
    case 'active_no_pto': return getActiveNoPTO(period);
    case 'pto_received_count': return getPTOReceivedCount(period);
    
    // Operations Metrics
    case 'active_install_not_started': return getActiveInstallNotStarted(period);
    case 'avg_sale_to_glass': return getAvgSaleToGlass(period);
    case 'avg_sale_to_pto': return getAvgSaleToPTO(period);
    
    // Sales Stats
    case 'reps_with_sale': return getRepsWithSale(period);
    case 'pull_through_rolling_6m': return getPullThroughRolling6Month(period);
    case 'max_pull_through_rolling_6m': return getMaxPullThroughRolling6Month(period);
    
    // Commercial Division
    case 'total_kw_scheduled': return getTotalKWScheduled(period);
    case 'kw_scheduled_goal': return getKWScheduledGoal(period);
    case 'total_kw_installed': return getTotalKWInstalled(period);
    case 'kw_installed_goal': return getKWInstalledGoal(period);
    case 'ar_commercial': return getARCommercial(period);
    case 'revenue_received_commercial': return getRevenueReceivedCommercial(period);
    
    default:
      throw new Error(`Unknown KPI ID: ${kpiId}`);
  }
}
