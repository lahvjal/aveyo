import { getMySqlPool } from "./client";

export interface MySqlCustomerProjectDetails {
  matchedBy: "project-id" | "customer-id" | "email";
  projectId: string | null;
  customerId: string | null;
  customerName: string | null;
  email: string | null;
  phone: string | null;
  fullAddress: string | null;
  financeId: string | null;
  projectStatus: string | null;
  projectTitle: string | null;
}

export interface MySqlProjectCustomerCandidate {
  projectId: string | null;
  customerId: string | null;
  customerName: string | null;
  email: string | null;
  phone: string | null;
  fullAddress: string | null;
  financeId: string | null;
  projectStatus: string | null;
  projectTitle: string | null;
  updatedAt: string | null;
}

export interface MySqlIdentityProjectCandidate {
  projectId: string;
  customerId: string | null;
  email: string | null;
  customerName: string | null;
  fullAddress: string | null;
  projectStatus: string | null;
  projectTitle: string | null;
  lastSync: string | null;
}

interface ProjectDataRow {
  projectId: string | null;
  customerId: string | null;
  customerName: string | null;
  email: string | null;
  phone: string | null;
  fullAddress: string | null;
  financeId: string | null;
  projectStatus: string | null;
  projectTitle: string | null;
}

interface ProjectCustomerListRow extends ProjectDataRow {
  updatedAt: string | null;
}

interface IdentityProjectRow extends ProjectDataRow {
  lastSync: string | null;
}

interface LookupInput {
  projectRef?: string | null;
  customerId?: string | null;
  email?: string | null;
}

interface ProjectCustomerLookupInput {
  query?: string | null;
  limit?: number;
}

interface IdentityProjectsLookupInput {
  customerId?: string | null;
  email?: string | null;
  limit?: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const DEFAULT_LOOKUP_CACHE_TTL_MS = 30_000;
const DEFAULT_CACHE_MAX_ENTRIES = 2000;

const detailsLookupCache = new Map<string, CacheEntry<MySqlCustomerProjectDetails | null>>();
const projectCustomersLookupCache = new Map<
  string,
  CacheEntry<MySqlProjectCustomerCandidate[]>
>();
const identityProjectsLookupCache = new Map<
  string,
  CacheEntry<MySqlIdentityProjectCandidate[]>
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

const lookupCacheTtlMs = parsePositiveIntegerEnv(
  process.env.AVA_MYSQL_LOOKUP_CACHE_TTL_MS,
  DEFAULT_LOOKUP_CACHE_TTL_MS
);
const lookupCacheMaxEntries = parsePositiveIntegerEnv(
  process.env.AVA_MYSQL_LOOKUP_CACHE_MAX_ENTRIES,
  DEFAULT_CACHE_MAX_ENTRIES
);
const mysqlTelemetryEnabled = process.env.AVA_MYSQL_TELEMETRY !== "0";

function logMySqlLookup(event: string, payload: Record<string, unknown>) {
  if (!mysqlTelemetryEnabled) {
    return;
  }
  console.info(`[ava-mysql] ${event}`, payload);
}

function getLookupFingerprint(input: {
  projectRef?: string | null;
  customerId?: string | null;
  email?: string | null;
}) {
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
  pruneCache(cache, lookupCacheMaxEntries);
  cache.set(key, {
    value,
    expiresAt: Date.now() + lookupCacheTtlMs
  });
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeSearchQuery(value: string | null | undefined) {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function normalizeLimit(value: number | undefined, fallback: number, max: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  const rounded = Math.floor(value ?? fallback);
  if (rounded < 1) {
    return 1;
  }
  return Math.min(rounded, max);
}

function toCaseInsensitiveKey(value: string | null) {
  return value ? value.toLowerCase() : null;
}

function toCachePart(value: string | null | undefined) {
  const normalized = normalizeString(value ?? null);
  return normalized ? normalized.toLowerCase() : "-";
}

function mapProjectDataRow(
  row: ProjectDataRow,
  matchedBy: MySqlCustomerProjectDetails["matchedBy"]
): MySqlCustomerProjectDetails {
  return {
    matchedBy,
    projectId: normalizeString(row.projectId),
    customerId: normalizeString(row.customerId),
    customerName: normalizeString(row.customerName),
    email: normalizeString(row.email),
    phone: normalizeString(row.phone),
    fullAddress: normalizeString(row.fullAddress),
    financeId: normalizeString(row.financeId),
    projectStatus: normalizeString(row.projectStatus),
    projectTitle: normalizeString(row.projectTitle)
  };
}

async function queryProjectData(
  whereClause: string,
  value: string
): Promise<ProjectDataRow | undefined> {
  const mysqlPool = getMySqlPool();
  if (!mysqlPool) {
    return undefined;
  }

  const [rows] = await mysqlPool.query(
    `
      SELECT
        \`project-id\` AS projectId,
        \`customer-id\` AS customerId,
        \`customer-name\` AS customerName,
        \`email\` AS email,
        \`ph\` AS phone,
        \`full-address\` AS fullAddress,
        \`finance-id\` AS financeId,
        \`project-status\` AS projectStatus,
        \`project-title\` AS projectTitle
      FROM \`project-data\`
      WHERE \`is_deleted\` = 0
        AND ${whereClause}
      ORDER BY COALESCE(\`data-updated-timestamp\`, \`last-sync\`, \`sent-to-supabase-date\`) DESC, \`item_id\` DESC
      LIMIT 1
    `,
    [value]
  );

  return (rows as ProjectDataRow[])[0];
}

async function queryProjectCustomers(input: {
  query?: string;
  queryLimit: number;
}): Promise<ProjectCustomerListRow[]> {
  const mysqlPool = getMySqlPool();
  if (!mysqlPool) {
    return [];
  }

  const filters: string[] = ["\`is_deleted\` = 0", "COALESCE(TRIM(\`project-id\`), '') <> ''"];
  const values: string[] = [];
  if (input.query) {
    const likeValue = `%${input.query}%`;
    filters.push(
      "(\n          LOWER(\`project-id\`) LIKE LOWER(?)\n          OR LOWER(\`customer-id\`) LIKE LOWER(?)\n          OR LOWER(\`customer-name\`) LIKE LOWER(?)\n          OR LOWER(\`email\`) LIKE LOWER(?)\n          OR LOWER(\`project-title\`) LIKE LOWER(?)\n        )"
    );
    values.push(likeValue, likeValue, likeValue, likeValue, likeValue);
  }

  const [rows] = await mysqlPool.query(
    `
      SELECT
        \`project-id\` AS projectId,
        \`customer-id\` AS customerId,
        \`customer-name\` AS customerName,
        \`email\` AS email,
        \`ph\` AS phone,
        \`full-address\` AS fullAddress,
        \`finance-id\` AS financeId,
        \`project-status\` AS projectStatus,
        \`project-title\` AS projectTitle,
        CAST(COALESCE(\`data-updated-timestamp\`, \`last-sync\`, \`sent-to-supabase-date\`) AS CHAR) AS updatedAt
      FROM \`project-data\`
      WHERE ${filters.join("\n        AND ")}
      ORDER BY COALESCE(\`data-updated-timestamp\`, \`last-sync\`, \`sent-to-supabase-date\`) DESC, \`item_id\` DESC
      LIMIT ?
    `,
    [...values, input.queryLimit]
  );

  return rows as ProjectCustomerListRow[];
}

async function queryIdentityProjects(
  whereClause: string,
  value: string,
  queryLimit: number
): Promise<IdentityProjectRow[]> {
  const mysqlPool = getMySqlPool();
  if (!mysqlPool) {
    return [];
  }

  const [rows] = await mysqlPool.query(
    `
      SELECT
        \`project-id\` AS projectId,
        \`customer-id\` AS customerId,
        \`customer-name\` AS customerName,
        \`email\` AS email,
        \`ph\` AS phone,
        \`full-address\` AS fullAddress,
        \`finance-id\` AS financeId,
        \`project-status\` AS projectStatus,
        \`project-title\` AS projectTitle,
        CAST(COALESCE(\`data-updated-timestamp\`, \`last-sync\`, \`sent-to-supabase-date\`) AS CHAR) AS lastSync
      FROM \`project-data\`
      WHERE \`is_deleted\` = 0
        AND COALESCE(TRIM(\`project-id\`), '') <> ''
        AND ${whereClause}
      ORDER BY COALESCE(\`data-updated-timestamp\`, \`last-sync\`, \`sent-to-supabase-date\`) DESC, \`item_id\` DESC
      LIMIT ?
    `,
    [value, queryLimit]
  );

  return rows as IdentityProjectRow[];
}

function mapIdentityProjects(rows: IdentityProjectRow[], limit: number): MySqlIdentityProjectCandidate[] {
  const unique = new Map<string, MySqlIdentityProjectCandidate>();

  for (const row of rows) {
    const projectId = normalizeString(row.projectId);
    if (!projectId || unique.has(projectId)) {
      continue;
    }

    unique.set(projectId, {
      projectId,
      customerId: normalizeString(row.customerId),
      email: normalizeString(row.email),
      customerName: normalizeString(row.customerName),
      fullAddress: normalizeString(row.fullAddress),
      projectStatus: normalizeString(row.projectStatus),
      projectTitle: normalizeString(row.projectTitle),
      lastSync: normalizeString(row.lastSync)
    });

    if (unique.size >= limit) {
      break;
    }
  }

  return Array.from(unique.values());
}

export async function getMySqlCustomerProjectDetails(input: LookupInput) {
  const projectRef = normalizeString(input.projectRef);
  const customerId = normalizeString(input.customerId);
  const email = normalizeString(input.email);

  const cacheKey = `details:${toCachePart(projectRef)}:${toCachePart(customerId)}:${toCachePart(email)}`;
  const cached = readCacheValue(detailsLookupCache, cacheKey);
  if (cached.hit) {
    logMySqlLookup("get-customer-project-details", {
      cacheHit: true,
      ...getLookupFingerprint({ projectRef, customerId, email })
    });
    return cached.value ?? undefined;
  }

  const startedAt = Date.now();
  let result: MySqlCustomerProjectDetails | undefined;

  if (projectRef) {
    const projectMatch = await queryProjectData("\`project-id\` = ?", projectRef);
    if (projectMatch) {
      result = mapProjectDataRow(projectMatch, "project-id");
    }
  }

  if (!result && customerId) {
    const customerIdMatch = await queryProjectData("\`customer-id\` = ?", customerId);
    if (customerIdMatch) {
      result = mapProjectDataRow(customerIdMatch, "customer-id");
    }
  }

  if (!result && email) {
    const emailMatch = await queryProjectData("LOWER(\`email\`) = LOWER(?)", email);
    if (emailMatch) {
      result = mapProjectDataRow(emailMatch, "email");
    }
  }

  writeCacheValue(detailsLookupCache, cacheKey, result ?? null);
  logMySqlLookup("get-customer-project-details", {
    cacheHit: false,
    durationMs: Date.now() - startedAt,
    matchedBy: result?.matchedBy ?? null,
    found: Boolean(result),
    ...getLookupFingerprint({ projectRef, customerId, email })
  });

  return result;
}

export async function listMySqlProjectCustomers(input: ProjectCustomerLookupInput = {}) {
  const normalizedQuery = normalizeSearchQuery(input.query);
  const limit = normalizeLimit(input.limit, 25, 100);
  const cacheKey = `project-customers:${toCachePart(normalizedQuery ?? null)}:${limit}`;
  const cached = readCacheValue(projectCustomersLookupCache, cacheKey);
  if (cached.hit) {
    logMySqlLookup("list-project-customers", {
      cacheHit: true,
      queryProvided: Boolean(normalizedQuery),
      limit,
      candidateCount: cached.value?.length ?? 0
    });
    return cached.value ?? [];
  }

  const startedAt = Date.now();
  const queryLimit = normalizeLimit(limit * 8, 200, 800);
  const rows = await queryProjectCustomers({
    query: normalizedQuery,
    queryLimit
  });

  const unique = new Map<string, MySqlProjectCustomerCandidate>();
  for (const row of rows) {
    const projectId = normalizeString(row.projectId);
    const customerId = normalizeString(row.customerId);
    const email = normalizeString(row.email);

    const dedupeKey =
      (projectId ? `project:${projectId}` : null) ??
      (customerId ? `customer:${customerId}` : null) ??
      (email ? `email:${toCaseInsensitiveKey(email)}` : null);

    if (!dedupeKey || unique.has(dedupeKey)) {
      continue;
    }

    unique.set(dedupeKey, {
      projectId,
      customerId,
      customerName: normalizeString(row.customerName),
      email,
      phone: normalizeString(row.phone),
      fullAddress: normalizeString(row.fullAddress),
      financeId: normalizeString(row.financeId),
      projectStatus: normalizeString(row.projectStatus),
      projectTitle: normalizeString(row.projectTitle),
      updatedAt: normalizeString(row.updatedAt)
    });

    if (unique.size >= limit) {
      break;
    }
  }

  const result = Array.from(unique.values());
  writeCacheValue(projectCustomersLookupCache, cacheKey, result);
  logMySqlLookup("list-project-customers", {
    cacheHit: false,
    durationMs: Date.now() - startedAt,
    queryProvided: Boolean(normalizedQuery),
    limit,
    candidateCount: result.length
  });

  return result;
}

export async function listMySqlIdentityProjects(input: IdentityProjectsLookupInput = {}) {
  const limit = normalizeLimit(input.limit, 10, 50);
  const normalizedCustomerId = normalizeString(input.customerId);
  const normalizedEmail = normalizeString(input.email);
  const cacheKey = `identity-projects:${toCachePart(normalizedCustomerId)}:${toCachePart(normalizedEmail)}:${limit}`;
  const cached = readCacheValue(identityProjectsLookupCache, cacheKey);
  if (cached.hit) {
    logMySqlLookup("list-identity-projects", {
      cacheHit: true,
      limit,
      candidateCount: cached.value?.length ?? 0,
      ...getLookupFingerprint({
        customerId: normalizedCustomerId,
        email: normalizedEmail
      })
    });
    return cached.value ?? [];
  }

  const startedAt = Date.now();
  const queryLimit = normalizeLimit(limit * 12, 200, 1200);
  let result: MySqlIdentityProjectCandidate[] = [];

  if (normalizedCustomerId) {
    const customerRows = await queryIdentityProjects(
      "\`customer-id\` = ?",
      normalizedCustomerId,
      queryLimit
    );
    const mappedCustomerRows = mapIdentityProjects(customerRows, limit);
    if (mappedCustomerRows.length > 0) {
      result = mappedCustomerRows;
    }
  }

  if (result.length === 0 && normalizedEmail) {
    const emailRows = await queryIdentityProjects(
      "LOWER(\`email\`) = LOWER(?)",
      normalizedEmail,
      queryLimit
    );
    result = mapIdentityProjects(emailRows, limit);
  }

  writeCacheValue(identityProjectsLookupCache, cacheKey, result);
  logMySqlLookup("list-identity-projects", {
    cacheHit: false,
    durationMs: Date.now() - startedAt,
    limit,
    candidateCount: result.length,
    ...getLookupFingerprint({
      customerId: normalizedCustomerId,
      email: normalizedEmail
    })
  });

  return result;
}
