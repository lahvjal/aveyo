import { getMySqlPool } from "./client";

export interface MySqlCustomerProjectContextSnapshot {
  resolvedBy: "project-id" | "customer-id" | "email";
  generatedAt: string;
  project: {
    projectRef: string;
    projectTitle: string | null;
    projectStatus: string | null;
    milestone: string | null;
    customerId: string | null;
    customerName: string | null;
    customerEmail: string | null;
    financeId: string | null;
    lender: string | null;
    financeType: string | null;
    fundingStatus: string | null;
    utilityCompany: string | null;
    ahj: string | null;
    projectManager: string | null;
    installBranch: string | null;
    systemSize: string | null;
    estimatedYearlyProduction: string | null;
    lastSync: string | null;
  };
  timeline: {
    siteSurveyStatus: string | null;
    siteSurveyAppointment: string | null;
    siteSurveyComplete: string | null;
    ntpComplete: string | null;
    installReady: string | null;
    installAppointment: string | null;
    installComplete: string | null;
    inspectionStatus: string | null;
    ahjInspectionAppointment: string | null;
    ahjInspectionComplete: string | null;
    ptoStatus: string | null;
    ptoSubmitted: string | null;
    ptoReceived: string | null;
    energizeCompleteDate: string | null;
  } | null;
  customerActions: {
    vwcStatus: string | null;
    customerSowStatus: string | null;
    pendingSowCount: number;
    pendingSowItems: Array<{
      title: string | null;
      status: string | null;
      dueDate: string | null;
      formUrl: string | null;
    }>;
  };
}

interface LookupInput {
  projectRef?: string | null;
  customerId?: string | null;
  email?: string | null;
}

interface ResolvedProjectReference {
  projectRef: string;
  resolvedBy: MySqlCustomerProjectContextSnapshot["resolvedBy"];
}

interface ProjectRefLookupRow {
  projectId: string | null;
}

interface ProjectProfileRow {
  projectRef: string | null;
  projectTitle: string | null;
  projectStatus: string | null;
  milestone: string | null;
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  financeId: string | null;
  lender: string | null;
  financeType: string | null;
  fundingStatus: string | null;
  utilityCompany: string | null;
  ahj: string | null;
  projectManager: string | null;
  installBranch: string | null;
  systemSize: string | null;
  estimatedYearlyProduction: string | null;
  vwcStatus: string | null;
  customerSowStatus: string | null;
  lastSync: string | null;
}

interface TimelineSnapshotRow {
  siteSurveyStatus: string | null;
  siteSurveyAppointment: string | null;
  siteSurveyComplete: string | null;
  ntpComplete: string | null;
  installReady: string | null;
  installAppointment: string | null;
  installComplete: string | null;
  inspectionStatus: string | null;
  ahjInspectionAppointment: string | null;
  ahjInspectionComplete: string | null;
  ptoStatus: string | null;
  ptoSubmitted: string | null;
  ptoReceived: string | null;
  energizeCompleteDate: string | null;
}

interface CustomerSowSummaryRow {
  pendingSowCount: number | string | null;
}

interface PendingCustomerSowRow {
  title: string | null;
  customerPortalSowStatus: string | null;
  status: string | null;
  dueDate: string | null;
  formUrl: string | null;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const DEFAULT_CONTEXT_CACHE_TTL_MS = 20_000;
const DEFAULT_CONTEXT_CACHE_MAX_ENTRIES = 1500;
const contextSnapshotCache = new Map<
  string,
  CacheEntry<MySqlCustomerProjectContextSnapshot | null>
>();

function parsePositiveIntegerEnv(rawValue: string | undefined, fallback: number) {
  if (!rawValue) {
    return fallback;
  }
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

const contextCacheTtlMs = parsePositiveIntegerEnv(
  process.env.AVA_MYSQL_CONTEXT_CACHE_TTL_MS ?? process.env.AVA_MYSQL_LOOKUP_CACHE_TTL_MS,
  DEFAULT_CONTEXT_CACHE_TTL_MS
);
const contextCacheMaxEntries = parsePositiveIntegerEnv(
  process.env.AVA_MYSQL_CONTEXT_CACHE_MAX_ENTRIES ?? process.env.AVA_MYSQL_LOOKUP_CACHE_MAX_ENTRIES,
  DEFAULT_CONTEXT_CACHE_MAX_ENTRIES
);
const mysqlTelemetryEnabled = process.env.AVA_MYSQL_TELEMETRY !== "0";

function logMySqlContext(event: string, payload: Record<string, unknown>) {
  if (!mysqlTelemetryEnabled) {
    return;
  }
  console.info(`[ava-mysql-context] ${event}`, payload);
}

function getLookupFingerprint(input: LookupInput) {
  return {
    hasProjectRef: Boolean(input.projectRef),
    hasCustomerId: Boolean(input.customerId),
    hasEmail: Boolean(input.email)
  };
}

function pruneCache<T>(cache: Map<string, CacheEntry<T>>, maxEntries: number) {
  if (cache.size < maxEntries) {
    return;
  }

  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }

  if (cache.size < maxEntries) {
    return;
  }

  const keys = Array.from(cache.keys());
  const overflow = cache.size - maxEntries + 1;
  for (let index = 0; index < overflow && index < keys.length; index += 1) {
    const key = keys[index];
    if (key) {
      cache.delete(key);
    }
  }
}

function readCacheValue<T>(cache: Map<string, CacheEntry<T>>, key: string) {
  const cached = cache.get(key);
  if (!cached) {
    return {
      hit: false,
      value: undefined as T | undefined
    };
  }

  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return {
      hit: false,
      value: undefined as T | undefined
    };
  }

  return {
    hit: true,
    value: cached.value
  };
}

function writeCacheValue<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T) {
  pruneCache(cache, contextCacheMaxEntries);
  cache.set(key, {
    value,
    expiresAt: Date.now() + contextCacheTtlMs
  });
}

function normalizeString(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function normalizeCount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }
  return 0;
}

function normalizeLookupValue(value: string | null | undefined) {
  return normalizeString(value);
}

function toCachePart(value: string | null | undefined) {
  const normalized = normalizeLookupValue(value);
  return normalized ? normalized.toLowerCase() : "-";
}

function getSnapshotCacheKey(input: LookupInput) {
  return `snapshot:${toCachePart(input.projectRef)}:${toCachePart(input.customerId)}:${toCachePart(input.email)}`;
}

function nowIso() {
  return new Date().toISOString();
}

async function queryProjectRefByLookup(params: {
  whereClause: string;
  value: string;
}): Promise<string | null> {
  const mysqlPool = getMySqlPool();
  if (!mysqlPool) {
    return null;
  }

  const [rows] = await mysqlPool.query(
    `
      SELECT
        \`project-id\` AS projectId
      FROM \`project-data\`
      WHERE \`is_deleted\` = 0
        AND ${params.whereClause}
      ORDER BY COALESCE(\`last-sync\`, \`sent-to-supabase-date\`) DESC, \`item_id\` DESC
      LIMIT 1
    `,
    [params.value]
  );

  const row = (rows as ProjectRefLookupRow[])[0];
  return normalizeString(row?.projectId);
}

async function resolveProjectReference(
  input: LookupInput
): Promise<ResolvedProjectReference | undefined> {
  const projectRef = normalizeLookupValue(input.projectRef);
  if (projectRef) {
    return {
      projectRef,
      resolvedBy: "project-id"
    };
  }

  const customerId = normalizeLookupValue(input.customerId);
  if (customerId) {
    const resolvedFromCustomerId = await queryProjectRefByLookup({
      whereClause: "\`customer-id\` = ?",
      value: customerId
    });
    if (resolvedFromCustomerId) {
      return {
        projectRef: resolvedFromCustomerId,
        resolvedBy: "customer-id"
      };
    }
  }

  const email = normalizeLookupValue(input.email);
  if (email) {
    const resolvedFromEmail = await queryProjectRefByLookup({
      whereClause: "LOWER(\`email\`) = LOWER(?)",
      value: email
    });
    if (resolvedFromEmail) {
      return {
        projectRef: resolvedFromEmail,
        resolvedBy: "email"
      };
    }
  }

  return undefined;
}

async function queryProjectProfile(projectRef: string): Promise<ProjectProfileRow | undefined> {
  const mysqlPool = getMySqlPool();
  if (!mysqlPool) {
    return undefined;
  }

  const [rows] = await mysqlPool.query(
    `
      SELECT
        \`project-id\` AS projectRef,
        \`project-title\` AS projectTitle,
        \`project-status\` AS projectStatus,
        \`milestone\` AS milestone,
        \`customer-id\` AS customerId,
        \`customer-name\` AS customerName,
        \`email\` AS customerEmail,
        \`finance-id\` AS financeId,
        \`lender\` AS lender,
        \`finance-type\` AS financeType,
        \`funding-status\` AS fundingStatus,
        \`utility-company\` AS utilityCompany,
        \`ahj\` AS ahj,
        \`project-manager\` AS projectManager,
        \`install-branch\` AS installBranch,
        \`system-size\` AS systemSize,
        \`estimated-yearly-production\` AS estimatedYearlyProduction,
        \`vwc-status\` AS vwcStatus,
        \`customer-sow-status\` AS customerSowStatus,
        CAST(\`last-sync\` AS CHAR) AS lastSync
      FROM \`project-data\`
      WHERE \`is_deleted\` = 0
        AND \`project-id\` = ?
      ORDER BY COALESCE(\`last-sync\`, \`sent-to-supabase-date\`) DESC, \`item_id\` DESC
      LIMIT 1
    `,
    [projectRef]
  );

  return (rows as ProjectProfileRow[])[0];
}

async function queryTimelineSnapshot(projectRef: string): Promise<TimelineSnapshotRow | undefined> {
  const mysqlPool = getMySqlPool();
  if (!mysqlPool) {
    return undefined;
  }

  const [rows] = await mysqlPool.query(
    `
      SELECT
        \`site-survey-status\` AS siteSurveyStatus,
        CAST(\`site-survey-appointment\` AS CHAR) AS siteSurveyAppointment,
        CAST(\`site-survey-complete\` AS CHAR) AS siteSurveyComplete,
        CAST(\`ntp-complete\` AS CHAR) AS ntpComplete,
        \`install-ready\` AS installReady,
        CAST(\`install-appointment\` AS CHAR) AS installAppointment,
        CAST(\`install-complete\` AS CHAR) AS installComplete,
        \`inspection-status\` AS inspectionStatus,
        CAST(\`ahj-inspection-appointment\` AS CHAR) AS ahjInspectionAppointment,
        CAST(\`ahj-inspection-complete\` AS CHAR) AS ahjInspectionComplete,
        \`pto-status\` AS ptoStatus,
        CAST(\`pto-submitted\` AS CHAR) AS ptoSubmitted,
        CAST(\`pto-received\` AS CHAR) AS ptoReceived,
        CAST(\`energize-complete-date\` AS CHAR) AS energizeCompleteDate
      FROM \`timeline\`
      WHERE \`is_deleted\` = 0
        AND \`project-id\` = ?
      ORDER BY \`item_id\` DESC
      LIMIT 1
    `,
    [projectRef]
  );

  return (rows as TimelineSnapshotRow[])[0];
}

async function queryPendingCustomerSowSummary(projectRef: string) {
  const mysqlPool = getMySqlPool();
  if (!mysqlPool) {
    return {
      pendingSowCount: 0,
      pendingSowItems: []
    };
  }

  const closedStatuses = [
    "approved",
    "complete",
    "completed",
    "done",
    "cancelled",
    "canceled"
  ];
  const placeholders = closedStatuses.map(() => "?").join(", ");

  const [countRows] = await mysqlPool.query(
    `
      SELECT
        COUNT(*) AS pendingSowCount
      FROM \`customer-sow\`
      WHERE \`is_deleted\` = 0
        AND \`project-id\` = ?
        AND LOWER(TRIM(COALESCE(\`customer-portal-sow-status\`, \`status\`, ''))) NOT IN (${placeholders})
    `,
    [projectRef, ...closedStatuses]
  );
  const countRow = (countRows as CustomerSowSummaryRow[])[0];

  const [itemRows] = await mysqlPool.query(
    `
      SELECT
        \`title\` AS title,
        \`customer-portal-sow-status\` AS customerPortalSowStatus,
        \`status\` AS status,
        CAST(\`customer-sow-due-date\` AS CHAR) AS dueDate,
        \`link-to-scope-approval-form\` AS formUrl
      FROM \`customer-sow\`
      WHERE \`is_deleted\` = 0
        AND \`project-id\` = ?
        AND LOWER(TRIM(COALESCE(\`customer-portal-sow-status\`, \`status\`, ''))) NOT IN (${placeholders})
      ORDER BY \`customer-sow-due-date\` ASC, \`item_id\` DESC
      LIMIT 3
    `,
    [projectRef, ...closedStatuses]
  );

  const pendingSowItems = (itemRows as PendingCustomerSowRow[]).map((row) => ({
    title: normalizeString(row.title),
    status: normalizeString(row.customerPortalSowStatus) ?? normalizeString(row.status),
    dueDate: normalizeString(row.dueDate),
    formUrl: normalizeString(row.formUrl)
  }));

  return {
    pendingSowCount: normalizeCount(countRow?.pendingSowCount),
    pendingSowItems
  };
}

export async function getMySqlCustomerProjectContextSnapshot(input: LookupInput) {
  const normalizedInput: LookupInput = {
    projectRef: normalizeLookupValue(input.projectRef),
    customerId: normalizeLookupValue(input.customerId),
    email: normalizeLookupValue(input.email)
  };
  const cacheKey = getSnapshotCacheKey(normalizedInput);
  const cached = readCacheValue(contextSnapshotCache, cacheKey);
  if (cached.hit) {
    logMySqlContext("get-project-context-snapshot", {
      cacheHit: true,
      ...getLookupFingerprint(normalizedInput)
    });
    return cached.value ?? undefined;
  }

  const startedAt = Date.now();
  const mysqlPool = getMySqlPool();
  if (!mysqlPool) {
    return undefined;
  }

  const resolvedReference = await resolveProjectReference(normalizedInput);
  if (!resolvedReference) {
    writeCacheValue(contextSnapshotCache, cacheKey, null);
    logMySqlContext("get-project-context-snapshot", {
      cacheHit: false,
      durationMs: Date.now() - startedAt,
      found: false,
      reason: "no-project-reference",
      ...getLookupFingerprint(normalizedInput)
    });
    return undefined;
  }

  const projectProfile = await queryProjectProfile(resolvedReference.projectRef);
  if (!projectProfile) {
    writeCacheValue(contextSnapshotCache, cacheKey, null);
    logMySqlContext("get-project-context-snapshot", {
      cacheHit: false,
      durationMs: Date.now() - startedAt,
      found: false,
      reason: "missing-project-profile",
      resolvedBy: resolvedReference.resolvedBy,
      projectRef: resolvedReference.projectRef
    });
    return undefined;
  }

  const [timelineRow, customerSowSummary] = await Promise.all([
    queryTimelineSnapshot(resolvedReference.projectRef),
    queryPendingCustomerSowSummary(resolvedReference.projectRef)
  ]);

  const snapshot = {
    resolvedBy: resolvedReference.resolvedBy,
    generatedAt: nowIso(),
    project: {
      projectRef: normalizeString(projectProfile.projectRef) ?? resolvedReference.projectRef,
      projectTitle: normalizeString(projectProfile.projectTitle),
      projectStatus: normalizeString(projectProfile.projectStatus),
      milestone: normalizeString(projectProfile.milestone),
      customerId: normalizeString(projectProfile.customerId),
      customerName: normalizeString(projectProfile.customerName),
      customerEmail: normalizeString(projectProfile.customerEmail),
      financeId: normalizeString(projectProfile.financeId),
      lender: normalizeString(projectProfile.lender),
      financeType: normalizeString(projectProfile.financeType),
      fundingStatus: normalizeString(projectProfile.fundingStatus),
      utilityCompany: normalizeString(projectProfile.utilityCompany),
      ahj: normalizeString(projectProfile.ahj),
      projectManager: normalizeString(projectProfile.projectManager),
      installBranch: normalizeString(projectProfile.installBranch),
      systemSize: normalizeString(projectProfile.systemSize),
      estimatedYearlyProduction: normalizeString(projectProfile.estimatedYearlyProduction),
      lastSync: normalizeString(projectProfile.lastSync)
    },
    timeline: timelineRow
      ? {
          siteSurveyStatus: normalizeString(timelineRow.siteSurveyStatus),
          siteSurveyAppointment: normalizeString(timelineRow.siteSurveyAppointment),
          siteSurveyComplete: normalizeString(timelineRow.siteSurveyComplete),
          ntpComplete: normalizeString(timelineRow.ntpComplete),
          installReady: normalizeString(timelineRow.installReady),
          installAppointment: normalizeString(timelineRow.installAppointment),
          installComplete: normalizeString(timelineRow.installComplete),
          inspectionStatus: normalizeString(timelineRow.inspectionStatus),
          ahjInspectionAppointment: normalizeString(timelineRow.ahjInspectionAppointment),
          ahjInspectionComplete: normalizeString(timelineRow.ahjInspectionComplete),
          ptoStatus: normalizeString(timelineRow.ptoStatus),
          ptoSubmitted: normalizeString(timelineRow.ptoSubmitted),
          ptoReceived: normalizeString(timelineRow.ptoReceived),
          energizeCompleteDate: normalizeString(timelineRow.energizeCompleteDate)
        }
      : null,
    customerActions: {
      vwcStatus: normalizeString(projectProfile.vwcStatus),
      customerSowStatus: normalizeString(projectProfile.customerSowStatus),
      pendingSowCount: customerSowSummary.pendingSowCount,
      pendingSowItems: customerSowSummary.pendingSowItems
    }
  } satisfies MySqlCustomerProjectContextSnapshot;

  writeCacheValue(contextSnapshotCache, cacheKey, snapshot);
  logMySqlContext("get-project-context-snapshot", {
    cacheHit: false,
    durationMs: Date.now() - startedAt,
    found: true,
    resolvedBy: snapshot.resolvedBy,
    projectRef: snapshot.project.projectRef,
    pendingSowCount: snapshot.customerActions.pendingSowCount
  });

  return snapshot;
}
