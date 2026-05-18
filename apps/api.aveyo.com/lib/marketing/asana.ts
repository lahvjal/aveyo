const ASANA_API_BASE = "https://app.asana.com/api/1.0";

export class AsanaError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "AsanaError";
  }
}

// Module-level cache so section lookups only hit the Asana API once per process.
const sectionGidCache = new Map<string, string>();

function asanaHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Accept: "application/json"
  };
}

async function parseAsanaError(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { errors?: { message?: string }[] };
    return json.errors?.[0]?.message ?? "";
  } catch {
    return "";
  }
}

/**
 * Resolves a section name (e.g. "To Do") to its GID within a project.
 * Returns undefined if no section with that name exists.
 * Result is cached for the lifetime of the process.
 */
export async function findSectionGid(
  projectGid: string,
  sectionName: string,
  accessToken: string
): Promise<string | undefined> {
  const cacheKey = `${projectGid}::${sectionName}`;
  const cached = sectionGidCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await fetch(`${ASANA_API_BASE}/projects/${projectGid}/sections`, {
    headers: asanaHeaders(accessToken)
  });

  if (!response.ok) {
    const detail = await parseAsanaError(response);
    throw new AsanaError(
      detail || `Could not fetch Asana sections (${response.status}).`,
      502
    );
  }

  const json = (await response.json()) as { data?: { gid: string; name: string }[] };
  const sections = json.data ?? [];
  const match = sections.find(
    (s) => s.name.trim().toLowerCase() === sectionName.trim().toLowerCase()
  );

  if (match) {
    sectionGidCache.set(cacheKey, match.gid);
    return match.gid;
  }

  return undefined;
}

export interface CreateAsanaTaskInput {
  name: string;
  notes: string;
  dueOn?: string;
  projectGid: string;
  sectionGid?: string;
  accessToken: string;
}

export interface AsanaTaskResult {
  gid: string;
  permalinkUrl: string;
}

export async function createAsanaTask(input: CreateAsanaTaskInput): Promise<AsanaTaskResult> {
  const { name, notes, dueOn, projectGid, sectionGid, accessToken } = input;

  // projects is always required; memberships additionally pins the task to a specific section.
  const body = {
    data: {
      name,
      notes,
      projects: [projectGid],
      ...(sectionGid ? { memberships: [{ project: projectGid, section: sectionGid }] } : {}),
      ...(dueOn ? { due_on: dueOn } : {})
    }
  };

  const response = await fetch(`${ASANA_API_BASE}/tasks`, {
    method: "POST",
    headers: asanaHeaders(accessToken),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const detail = await parseAsanaError(response);
    throw new AsanaError(
      detail || `Asana API responded with ${response.status}.`,
      response.status >= 400 && response.status < 500 ? 400 : 502
    );
  }

  const json = (await response.json()) as { data?: { gid?: string; permalink_url?: string } };
  const gid = json.data?.gid;
  const permalinkUrl = json.data?.permalink_url;

  if (!gid || !permalinkUrl) {
    throw new AsanaError("Asana returned an incomplete task response.", 502);
  }

  return { gid, permalinkUrl };
}
