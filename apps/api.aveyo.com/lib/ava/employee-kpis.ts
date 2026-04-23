import { getMySqlPool } from "@/lib/mysql/client";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { EmployeeKnowledgePolicy, EmployeeKpiAccessScope } from "@/lib/ava/employee-policy";

type EmployeeKpiPeriod = "current_week" | "previous_week" | "mtd" | "ytd";

interface DateRange {
  start: string;
  end: string;
}

interface TeamMemberRow {
  full_name: string | null;
  preferred_name: string | null;
  employment_status: string | null;
}

interface CountRow {
  count: number | null;
}

interface SumRow {
  total: number | null;
}

interface ProjectCountRow {
  projectCount: number | null;
}

export interface EmployeeKpiMetric {
  id: string;
  label: string;
  formattedValue: string;
  detail: string | null;
}

export interface EmployeeKpiLookupResult {
  status: "ok" | "restricted" | "unavailable";
  period: EmployeeKpiPeriod;
  scope: EmployeeKpiAccessScope;
  scopeLabel: string | null;
  metrics: EmployeeKpiMetric[];
  note: string | null;
}

function normalizeName(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isActiveEmployee(employmentStatus: string | null | undefined) {
  const normalized = employmentStatus?.trim().toLowerCase();
  return !normalized || normalized === "active";
}

function getPeriodDateRange(period: EmployeeKpiPeriod): DateRange {
  const now = new Date();
  const today = now.toISOString().split("T")[0] ?? "";

  switch (period) {
    case "current_week": {
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        start: monday.toISOString().split("T")[0] ?? today,
        end: sunday.toISOString().split("T")[0] ?? today
      };
    }
    case "previous_week": {
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) - 7);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        start: monday.toISOString().split("T")[0] ?? today,
        end: sunday.toISOString().split("T")[0] ?? today
      };
    }
    case "ytd": {
      const firstOfYear = new Date(now.getFullYear(), 0, 1);
      return {
        start: firstOfYear.toISOString().split("T")[0] ?? today,
        end: today
      };
    }
    case "mtd":
    default: {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        start: firstOfMonth.toISOString().split("T")[0] ?? today,
        end: today
      };
    }
  }
}

function inferPeriodFromQuestion(question: string): EmployeeKpiPeriod {
  const normalized = question.toLowerCase();
  if (normalized.includes("previous week") || normalized.includes("last week")) {
    return "previous_week";
  }
  if (normalized.includes("ytd") || normalized.includes("year to date") || normalized.includes("this year")) {
    return "ytd";
  }
  if (normalized.includes("current week") || normalized.includes("this week")) {
    return "current_week";
  }
  return "mtd";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function createRestrictedResult(
  period: EmployeeKpiPeriod,
  scope: EmployeeKpiAccessScope
): EmployeeKpiLookupResult {
  return {
    status: "restricted",
    period,
    scope,
    scopeLabel: null,
    metrics: [],
    note: "Approved KPI summaries are limited to managers, admins, executives, and super admins."
  };
}

async function querySingleRow<T>(sql: string, params: unknown[]): Promise<T | null> {
  const mysqlPool = getMySqlPool();
  if (!mysqlPool) {
    return null;
  }

  const [rows] = await mysqlPool.query(sql, params);
  const typedRows = rows as T[];
  return typedRows[0] ?? null;
}

function buildOwnerFilterSql(nameAliases: string[]) {
  if (nameAliases.length === 0) {
    return {
      sql: "1 = 0",
      params: [] as string[]
    };
  }

  const placeholders = nameAliases.map(() => "?").join(", ");
  const ownerColumns = ["pd.`sales-rep-name`", "pd.`setter-name`", "pd.`project-manager`"];
  const sql = `(${ownerColumns.map((column) => `${column} IN (${placeholders})`).join(" OR ")})`;
  const params = ownerColumns.flatMap(() => nameAliases);

  return { sql, params };
}

async function loadDepartmentTeamAliases(departmentIds: string[]) {
  if (departmentIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, preferred_name, employment_status")
    .in("department_id", departmentIds);

  if (error) {
    return [];
  }

  return Array.from(
    new Set(
      ((data ?? []) as TeamMemberRow[])
        .filter((profile) => isActiveEmployee(profile.employment_status))
        .flatMap((profile) => [normalizeName(profile.full_name), normalizeName(profile.preferred_name)])
        .filter((value): value is string => Boolean(value))
    )
  );
}

async function loadOrganizationKpiSummary(period: EmployeeKpiPeriod): Promise<EmployeeKpiLookupResult> {
  const { start, end } = getPeriodDateRange(period);

  const totalSalesSql = `
    SELECT COUNT(*) AS count
    FROM \`timeline\` t
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`contract-signed\` IS NOT NULL
      AND pd.\`project-status\` != 'Cancelled'
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND t.\`contract-signed\` >= ?
      AND t.\`contract-signed\` <= ?
  `;
  const installsCompleteSql = `
    SELECT COUNT(*) AS count
    FROM \`timeline\` t
    WHERE t.\`install-complete\` IS NOT NULL
      AND t.\`install-stage-status\` = 'Complete'
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND t.\`install-complete\` >= ?
      AND t.\`install-complete\` <= ?
  `;
  const aveyoApprovedSql = `
    SELECT COUNT(DISTINCT cs.\`project-id\`) AS count
    FROM \`customer-sow\` cs
    LEFT JOIN \`project-data\` pd ON cs.\`project-id\` = pd.\`project-id\`
    WHERE cs.\`sow-approved-timestamp\` IS NOT NULL
      AND (pd.\`project-status\` IS NULL OR pd.\`project-status\` != 'Cancelled')
      AND cs.\`sow-approved-timestamp\` >= ?
      AND cs.\`sow-approved-timestamp\` <= ?
  `;
  const revenueSql = `
    SELECT
      COALESCE(SUM(
        CASE
          WHEN pd.\`m1-received-date\` IS NOT NULL
            AND pd.\`m1-received-date\` >= ?
            AND pd.\`m1-received-date\` <= ?
          THEN pd.\`contract-price\` * 0.2
          ELSE 0
        END
      ), 0) +
      COALESCE(SUM(
        CASE
          WHEN pd.\`m2-received-date\` IS NOT NULL
            AND pd.\`m2-received-date\` >= ?
            AND pd.\`m2-received-date\` <= ?
          THEN pd.\`contract-price\` * 0.8
          ELSE 0
        END
      ), 0) AS total
    FROM \`project-data\` pd
    LEFT JOIN \`timeline\` t ON pd.\`project-dev-id\` = t.\`project-dev-id\`
    WHERE t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)'
  `;

  const [totalSalesRow, installsRow, approvedRow, revenueRow] = await Promise.all([
    querySingleRow<CountRow>(totalSalesSql, [start, end]),
    querySingleRow<CountRow>(installsCompleteSql, [start, end]),
    querySingleRow<CountRow>(aveyoApprovedSql, [start, end]),
    querySingleRow<SumRow>(revenueSql, [start, end, start, end])
  ]);

  return {
    status: "ok",
    period,
    scope: "organization",
    scopeLabel: "organization-wide",
    metrics: [
      {
        id: "total_sales",
        label: "Total sales",
        formattedValue: formatNumber(totalSalesRow?.count ?? 0),
        detail: null
      },
      {
        id: "aveyo_approved",
        label: "Aveyo approved",
        formattedValue: formatNumber(approvedRow?.count ?? 0),
        detail: null
      },
      {
        id: "installs_complete",
        label: "Installs complete",
        formattedValue: formatNumber(installsRow?.count ?? 0),
        detail: null
      },
      {
        id: "revenue_received",
        label: "Revenue received",
        formattedValue: formatCurrency(revenueRow?.total ?? 0),
        detail: null
      }
    ],
    note: "Approved KPI summaries stay high-level and scoped to the allowed org view."
  };
}

async function loadDepartmentKpiSummary(
  period: EmployeeKpiPeriod,
  policy: EmployeeKnowledgePolicy
): Promise<EmployeeKpiLookupResult> {
  const nameAliases = await loadDepartmentTeamAliases(policy.kpiDepartmentIds);
  if (nameAliases.length === 0) {
    return {
      status: "ok",
      period,
      scope: "department",
      scopeLabel: policy.kpiScopeLabel,
      metrics: [],
      note: "No active team members were found in the approved department KPI scope."
    };
  }

  const { start, end } = getPeriodDateRange(period);
  const ownerFilter = buildOwnerFilterSql(nameAliases);

  const totalSalesSql = `
    SELECT COUNT(DISTINCT t.\`project-dev-id\`) AS count
    FROM \`timeline\` t
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`contract-signed\` IS NOT NULL
      AND pd.\`project-status\` != 'Cancelled'
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND t.\`contract-signed\` >= ?
      AND t.\`contract-signed\` <= ?
      AND ${ownerFilter.sql}
  `;
  const installsCompleteSql = `
    SELECT COUNT(DISTINCT t.\`project-dev-id\`) AS count
    FROM \`timeline\` t
    JOIN \`project-data\` pd ON t.\`project-dev-id\` = pd.\`project-dev-id\`
    WHERE t.\`install-complete\` IS NOT NULL
      AND t.\`install-stage-status\` = 'Complete'
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND t.\`install-complete\` >= ?
      AND t.\`install-complete\` <= ?
      AND ${ownerFilter.sql}
  `;
  const revenueSql = `
    SELECT
      COALESCE(SUM(
        CASE
          WHEN pd.\`m1-received-date\` IS NOT NULL
            AND pd.\`m1-received-date\` >= ?
            AND pd.\`m1-received-date\` <= ?
          THEN pd.\`contract-price\` * 0.2
          ELSE 0
        END
      ), 0) +
      COALESCE(SUM(
        CASE
          WHEN pd.\`m2-received-date\` IS NOT NULL
            AND pd.\`m2-received-date\` >= ?
            AND pd.\`m2-received-date\` <= ?
          THEN pd.\`contract-price\` * 0.8
          ELSE 0
        END
      ), 0) AS total
    FROM \`project-data\` pd
    LEFT JOIN \`timeline\` t ON pd.\`project-dev-id\` = t.\`project-dev-id\`
    WHERE (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND ${ownerFilter.sql}
  `;
  const revenueCountSql = `
    SELECT COUNT(DISTINCT pd.\`project-dev-id\`) AS projectCount
    FROM \`project-data\` pd
    LEFT JOIN \`timeline\` t ON pd.\`project-dev-id\` = t.\`project-dev-id\`
    WHERE (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND (
        (pd.\`m1-received-date\` IS NOT NULL AND pd.\`m1-received-date\` >= ? AND pd.\`m1-received-date\` <= ?)
        OR
        (pd.\`m2-received-date\` IS NOT NULL AND pd.\`m2-received-date\` >= ? AND pd.\`m2-received-date\` <= ?)
      )
      AND ${ownerFilter.sql}
  `;

  const [totalSalesRow, installsRow, revenueRow, revenueProjectCountRow] = await Promise.all([
    querySingleRow<CountRow>(totalSalesSql, [start, end, ...ownerFilter.params]),
    querySingleRow<CountRow>(installsCompleteSql, [start, end, ...ownerFilter.params]),
    querySingleRow<SumRow>(revenueSql, [start, end, start, end, ...ownerFilter.params]),
    querySingleRow<ProjectCountRow>(revenueCountSql, [
      start,
      end,
      start,
      end,
      ...ownerFilter.params
    ])
  ]);

  return {
    status: "ok",
    period,
    scope: "department",
    scopeLabel: policy.kpiScopeLabel,
    metrics: [
      {
        id: "team_sales",
        label: "Team sales",
        formattedValue: formatNumber(totalSalesRow?.count ?? 0),
        detail: `${nameAliases.length} active name alias${nameAliases.length === 1 ? "" : "es"} in scope`
      },
      {
        id: "team_installs_complete",
        label: "Team installs complete",
        formattedValue: formatNumber(installsRow?.count ?? 0),
        detail: null
      },
      {
        id: "team_revenue_received",
        label: "Team revenue received",
        formattedValue: formatCurrency(revenueRow?.total ?? 0),
        detail: `${formatNumber(revenueProjectCountRow?.projectCount ?? 0)} project${
          revenueProjectCountRow?.projectCount === 1 ? "" : "s"
        }`
      }
    ],
    note: "Department-scoped KPIs use approved team-name matching across sales and project ownership fields."
  };
}

export async function lookupEmployeeKpiSummary(params: {
  question: string;
  policy: EmployeeKnowledgePolicy;
}): Promise<EmployeeKpiLookupResult> {
  const period = inferPeriodFromQuestion(params.question);

  if (params.policy.kpiScope === "none") {
    return createRestrictedResult(period, "none");
  }

  if (!getMySqlPool()) {
    return {
      status: "unavailable",
      period,
      scope: params.policy.kpiScope,
      scopeLabel: params.policy.kpiScopeLabel,
      metrics: [],
      note: "KPI data is temporarily unavailable."
    };
  }

  try {
    if (params.policy.kpiScope === "organization") {
      return await loadOrganizationKpiSummary(period);
    }

    return await loadDepartmentKpiSummary(period, params.policy);
  } catch {
    return {
      status: "unavailable",
      period,
      scope: params.policy.kpiScope,
      scopeLabel: params.policy.kpiScopeLabel,
      metrics: [],
      note: "KPI data is temporarily unavailable."
    };
  }
}
