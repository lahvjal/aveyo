import { getMySqlPool } from "@/lib/mysql/client";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

// =============================================================================
// TYPES
// =============================================================================

export interface MilestoneCustomerCount {
  stage: number;
  name: string;
  fullName: string;
  customerCount: number;
}

export interface CustomerTrackingData {
  liveCount: number;
  liveWindowMinutes: number;
  dateRangeCount: number | null;
  totalCustomers: number;
  milestoneBreakdown: MilestoneCustomerCount[];
}

// =============================================================================
// IN-MEMORY CACHING
// =============================================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const CUSTOMER_EMAILS_TTL_MS = 5 * 60 * 1000;
const MILESTONE_TTL_MS = 5 * 60 * 1000;

let customerEmailsCache: CacheEntry<Set<string>> | null = null;
let milestoneCache: CacheEntry<MilestoneCustomerCount[]> | null = null;

function readCache<T>(entry: CacheEntry<T> | null): T | null {
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return entry.value;
}

// =============================================================================
// MYSQL HELPERS
// =============================================================================

async function queryAll<T = Record<string, unknown>>(
  sql: string,
  values: unknown[] = []
): Promise<T[]> {
  const pool = getMySqlPool();
  if (!pool) return [];
  const [rows] = await pool.query(sql, values);
  return rows as T[];
}

// =============================================================================
// CUSTOMER EMAIL LOOKUP
// =============================================================================

async function getCustomerEmailSet(): Promise<Set<string>> {
  const cached = readCache(customerEmailsCache);
  if (cached) return cached;

  const rows = await queryAll<{ email: string }>(
    "SELECT DISTINCT `email` FROM `project-data` WHERE `email` IS NOT NULL AND `email` != '' AND `is_deleted` = 0"
  );

  const emailSet = new Set(rows.map((r) => r.email.toLowerCase().trim()));
  customerEmailsCache = { value: emailSet, expiresAt: Date.now() + CUSTOMER_EMAILS_TTL_MS };
  return emailSet;
}

export async function getTotalCustomerCount(): Promise<number> {
  const emails = await getCustomerEmailSet();
  return emails.size;
}

// =============================================================================
// LOGIN COUNTS (Supabase auth admin)
// =============================================================================

async function countCustomerLoginsByWindow(
  customerEmails: Set<string>,
  cutoffTime: Date | null,
  endTime: Date | null
): Promise<number> {
  if (customerEmails.size === 0) return 0;

  const supabase = getSupabaseServiceRoleClient();
  let count = 0;
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error || !data?.users?.length) break;

    for (const user of data.users) {
      if (!user.email) continue;
      if (!customerEmails.has(user.email.toLowerCase().trim())) continue;
      if (!user.last_sign_in_at) continue;

      const loginTime = new Date(user.last_sign_in_at);
      if (cutoffTime && loginTime < cutoffTime) continue;
      if (endTime && loginTime > endTime) continue;

      count++;
    }

    if (data.users.length < perPage) break;
    page++;
  }

  return count;
}

export async function getLiveCustomerCount(windowMinutes = 30): Promise<number> {
  const customerEmails = await getCustomerEmailSet();
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
  return countCustomerLoginsByWindow(customerEmails, cutoff, null);
}

export async function getCustomerLoginsByDateRange(
  dateFrom: string,
  dateTo: string
): Promise<number> {
  const customerEmails = await getCustomerEmailSet();
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  to.setHours(23, 59, 59, 999);
  return countCustomerLoginsByWindow(customerEmails, from, to);
}

// =============================================================================
// MILESTONE BREAKDOWN (MySQL)
// =============================================================================

const MILESTONE_STAGE_DEFINITIONS: Omit<MilestoneCustomerCount, "customerCount">[] = [
  { stage: 1, name: "1", fullName: "Initial – No Milestones" },
  { stage: 2, name: "2", fullName: "Contract Signed" },
  { stage: 3, name: "3", fullName: "Site Survey Complete" },
  { stage: 4, name: "4", fullName: "NTP Complete" },
  { stage: 5, name: "5", fullName: "Engineering Complete" },
  { stage: 6, name: "6", fullName: "All Permits Complete" },
  { stage: 7, name: "7", fullName: "Equipment Ordered" },
  { stage: 8, name: "8", fullName: "Install Ready" },
  { stage: 9, name: "9", fullName: "Install Appointment Scheduled" },
  { stage: 10, name: "10", fullName: "Panel Install Complete" },
  { stage: 11, name: "11", fullName: "Install Complete" },
  { stage: 12, name: "12", fullName: "AHJ Inspection Complete" },
  { stage: 13, name: "13", fullName: "PTO Submitted – Awaiting Approval" },
  { stage: 14, name: "14", fullName: "PTO Received" },
];

export async function getCustomersByMilestoneStage(): Promise<MilestoneCustomerCount[]> {
  const cached = readCache(milestoneCache);
  if (cached) return cached;

  const rows = await queryAll<{ milestone_stage: number; customer_count: number }>(
    `SELECT
      CASE
        WHEN t.\`pto-received\` IS NOT NULL                                     THEN 14
        WHEN t.\`pto-submitted\` IS NOT NULL AND t.\`pto-received\` IS NULL      THEN 13
        WHEN t.\`ahj-inspection-complete\` IS NOT NULL                           THEN 12
        WHEN t.\`install-complete\` IS NOT NULL                                  THEN 11
        WHEN t.\`panel-install-complete\` IS NOT NULL                            THEN 10
        WHEN t.\`install-appointment\` IS NOT NULL                               THEN 9
        WHEN t.\`install-ready-date\` IS NOT NULL                                THEN 8
        WHEN t.\`equipment-ordered\` IS NOT NULL                                 THEN 7
        WHEN t.\`all-permits-complete\` IS NOT NULL                              THEN 6
        WHEN t.\`engineering-complete\` IS NOT NULL                              THEN 5
        WHEN t.\`ntp-complete\` IS NOT NULL                                      THEN 4
        WHEN t.\`site-survey-complete\` IS NOT NULL                              THEN 3
        WHEN t.\`contract-signed\` IS NOT NULL                                   THEN 2
        ELSE 1
      END AS milestone_stage,
      COUNT(DISTINCT pd.\`email\`) AS customer_count
    FROM \`project-data\` pd
    JOIN \`timeline\` t ON pd.\`project-dev-id\` = t.\`project-dev-id\`
    WHERE pd.\`project-status\` IN ('Active','Complete','Pre-Approvals','New Lender','Finance Hold')
      AND (t.\`cancellation-reason\` IS NULL OR t.\`cancellation-reason\` != 'Duplicate Project (Error)')
      AND pd.\`is_deleted\` = 0
      AND pd.\`email\` IS NOT NULL
      AND pd.\`email\` != ''
    GROUP BY milestone_stage
    ORDER BY milestone_stage`
  );

  const breakdown = MILESTONE_STAGE_DEFINITIONS.map((def) => {
    const row = rows.find((r) => r.milestone_stage === def.stage);
    return { ...def, customerCount: row?.customer_count ?? 0 };
  });

  milestoneCache = { value: breakdown, expiresAt: Date.now() + MILESTONE_TTL_MS };
  return breakdown;
}

// =============================================================================
// MAIN AGGREGATOR
// =============================================================================

export async function getCustomerTrackingData(params: {
  dateFrom?: string | null;
  dateTo?: string | null;
}): Promise<CustomerTrackingData> {
  const [liveCount, milestoneBreakdown, totalCustomers] = await Promise.all([
    getLiveCustomerCount(30),
    getCustomersByMilestoneStage(),
    getTotalCustomerCount(),
  ]);

  let dateRangeCount: number | null = null;
  if (params.dateFrom && params.dateTo) {
    dateRangeCount = await getCustomerLoginsByDateRange(params.dateFrom, params.dateTo);
  }

  return { liveCount, liveWindowMinutes: 30, dateRangeCount, totalCustomers, milestoneBreakdown };
}
