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

interface LookupInput {
  projectRef?: string | null;
  customerId?: string | null;
  email?: string | null;
}

interface ProjectCustomerLookupInput {
  query?: string | null;
  limit?: number;
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
      ORDER BY \`data-updated-timestamp\` DESC, \`item_id\` DESC
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
        CAST(\`data-updated-timestamp\` AS CHAR) AS updatedAt
      FROM \`project-data\`
      WHERE ${filters.join("\n        AND ")}
      ORDER BY \`data-updated-timestamp\` DESC, \`item_id\` DESC
      LIMIT ?
    `,
    [...values, input.queryLimit]
  );

  return rows as ProjectCustomerListRow[];
}

export async function getMySqlCustomerProjectDetails(input: LookupInput) {
  const projectRef = normalizeString(input.projectRef);
  if (projectRef) {
    const projectMatch = await queryProjectData("\`project-id\` = ?", projectRef);
    if (projectMatch) {
      return mapProjectDataRow(projectMatch, "project-id");
    }
  }

  const customerId = normalizeString(input.customerId);
  if (customerId) {
    const customerIdMatch = await queryProjectData("\`customer-id\` = ?", customerId);
    if (customerIdMatch) {
      return mapProjectDataRow(customerIdMatch, "customer-id");
    }
  }

  const email = normalizeString(input.email);
  if (email) {
    const emailMatch = await queryProjectData("LOWER(\`email\`) = LOWER(?)", email);
    if (emailMatch) {
      return mapProjectDataRow(emailMatch, "email");
    }
  }

  return undefined;
}

export async function listMySqlProjectCustomers(input: ProjectCustomerLookupInput = {}) {
  const normalizedQuery = normalizeSearchQuery(input.query);
  const limit = normalizeLimit(input.limit, 25, 100);
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

  return Array.from(unique.values());
}
