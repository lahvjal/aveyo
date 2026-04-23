import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

interface DirectoryProfileRow {
  id: string;
  full_name: string | null;
  preferred_name: string | null;
  job_title: string | null;
  department_id: string | null;
  manager_id: string | null;
  employment_status: string | null;
}

interface DepartmentRow {
  id: string;
  name: string | null;
  parent_id: string | null;
}

export interface EmployeeDirectoryMatch {
  name: string;
  title: string | null;
  department: string | null;
  manager: string | null;
  reportingChain: string[];
}

export interface EmployeeDirectoryLookupResult {
  status: "ok" | "ambiguous" | "no_match" | "unavailable";
  requestType: "person" | "department";
  restrictedContactRequest: boolean;
  matchedDepartment: string | null;
  matches: EmployeeDirectoryMatch[];
  note: string | null;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isActiveEmployee(employmentStatus: string | null | undefined) {
  const normalized = employmentStatus?.trim().toLowerCase();
  return !normalized || normalized === "active";
}

function getDisplayName(profile: Pick<DirectoryProfileRow, "preferred_name" | "full_name">) {
  const preferredName = normalizeOptionalText(profile.preferred_name);
  if (preferredName) {
    return preferredName;
  }

  const fullName = normalizeOptionalText(profile.full_name);
  if (fullName) {
    return fullName;
  }

  return "Employee";
}

function requestsRestrictedContactDetails(question: string) {
  return /\b(phone|cell|mobile|email|e mail|contact|number|reach|text)\b/.test(question);
}

function isSelfLookup(question: string) {
  return /\b(my manager|my department|my title|my team|who do i report to|who is my manager)\b/.test(
    question
  );
}

function getProfileSearchScore(question: string, profile: DirectoryProfileRow) {
  const questionTokens = new Set(question.split(" ").filter(Boolean));
  const candidateNames = [
    { value: normalizeText(profile.full_name), exactScore: 10, tokenScore: 8 },
    { value: normalizeText(profile.preferred_name), exactScore: 9, tokenScore: 7 }
  ];

  let bestScore = 0;
  for (const candidateName of candidateNames) {
    if (!candidateName.value) {
      continue;
    }

    if (question.includes(candidateName.value)) {
      bestScore = Math.max(bestScore, candidateName.exactScore);
      continue;
    }

    const candidateTokens = candidateName.value.split(" ").filter(Boolean);
    const matchedTokens = candidateTokens.filter((token) => questionTokens.has(token));
    if (matchedTokens.length === 0) {
      continue;
    }
    if (matchedTokens.length === candidateTokens.length) {
      bestScore = Math.max(bestScore, candidateName.tokenScore);
      continue;
    }
    if (matchedTokens.length >= 2) {
      bestScore = Math.max(bestScore, 6);
      continue;
    }

    const [matchedToken] = matchedTokens;
    if (matchedToken && matchedToken.length >= 3) {
      bestScore = Math.max(bestScore, candidateTokens.length === 1 ? 5 : 4);
    }
  }

  return bestScore;
}

function buildChildrenByParentId(departments: DepartmentRow[]) {
  const childrenByParentId = new Map<string, DepartmentRow[]>();
  for (const department of departments) {
    if (!department.parent_id) {
      continue;
    }

    const children = childrenByParentId.get(department.parent_id) ?? [];
    children.push(department);
    childrenByParentId.set(department.parent_id, children);
  }
  return childrenByParentId;
}

function collectDepartmentTreeIds(
  departmentId: string,
  childrenByParentId: Map<string, DepartmentRow[]>
) {
  const departmentIds = new Set<string>([departmentId]);
  const stack = [...(childrenByParentId.get(departmentId) ?? [])];

  while (stack.length > 0) {
    const next = stack.pop();
    if (!next || departmentIds.has(next.id)) {
      continue;
    }

    departmentIds.add(next.id);
    const children = childrenByParentId.get(next.id);
    if (children && children.length > 0) {
      stack.push(...children);
    }
  }

  return departmentIds;
}

function buildReportingChain(
  profile: DirectoryProfileRow,
  profileById: Map<string, DirectoryProfileRow>
) {
  const chain: string[] = [];
  const visitedManagerIds = new Set<string>();
  let managerId = profile.manager_id;

  while (managerId && !visitedManagerIds.has(managerId)) {
    visitedManagerIds.add(managerId);
    const manager = profileById.get(managerId);
    if (!manager) {
      break;
    }

    chain.push(getDisplayName(manager));
    managerId = manager.manager_id;
  }

  return chain;
}

function mapDirectoryMatch(
  profile: DirectoryProfileRow,
  profileById: Map<string, DirectoryProfileRow>,
  departmentNameById: Map<string, string>
): EmployeeDirectoryMatch {
  const manager = profile.manager_id ? profileById.get(profile.manager_id) : undefined;

  return {
    name: getDisplayName(profile),
    title: normalizeOptionalText(profile.job_title),
    department: profile.department_id ? (departmentNameById.get(profile.department_id) ?? null) : null,
    manager: manager ? getDisplayName(manager) : null,
    reportingChain: buildReportingChain(profile, profileById)
  };
}

function createUnavailableResult(note: string): EmployeeDirectoryLookupResult {
  return {
    status: "unavailable",
    requestType: "person",
    restrictedContactRequest: false,
    matchedDepartment: null,
    matches: [],
    note
  };
}

function buildPersonMatchNote(params: {
  restrictedContactRequest: boolean;
  ambiguousMatch: boolean;
}) {
  const notes: string[] = [];
  if (params.ambiguousMatch) {
    notes.push(
      "Multiple employees matched this name. Ask one short clarifying question and use the candidate names instead of guessing."
    );
  }
  if (params.restrictedContactRequest) {
    notes.push(
      "Approved directory answers only include safe org fields. Private contact details stay out of scope."
    );
  }
  return notes.length > 0 ? notes.join(" ") : null;
}

export async function lookupEmployeeDirectoryContext(params: {
  question: string;
  viewerUserId?: string | null;
}): Promise<EmployeeDirectoryLookupResult> {
  try {
    const supabase = getSupabaseServiceRoleClient();
    const [{ data: profilesData, error: profilesError }, { data: departmentsData, error: departmentsError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, preferred_name, job_title, department_id, manager_id, employment_status")
          .limit(5000),
        supabase.from("departments").select("id, name, parent_id").limit(5000)
      ]);

    if (profilesError || departmentsError) {
      return createUnavailableResult("Approved directory data is temporarily unavailable.");
    }

    const question = normalizeText(params.question);
    const profiles = ((profilesData ?? []) as DirectoryProfileRow[]).filter(
      (profile) => profile.id && isActiveEmployee(profile.employment_status)
    );
    const departments = ((departmentsData ?? []) as DepartmentRow[]).filter((department) => department.id);

    const profileById = new Map<string, DirectoryProfileRow>(profiles.map((profile) => [profile.id, profile]));
    const departmentNameById = new Map<string, string>(
      departments
        .map((department) => [department.id, normalizeOptionalText(department.name)])
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
    );
    const childrenByParentId = buildChildrenByParentId(departments);
    const restrictedContactRequest = requestsRestrictedContactDetails(question);
    const viewerProfile = params.viewerUserId ? profileById.get(params.viewerUserId) : undefined;

    if (viewerProfile && isSelfLookup(question)) {
      return {
        status: "ok",
        requestType: "person",
        restrictedContactRequest,
        matchedDepartment: null,
        matches: [mapDirectoryMatch(viewerProfile, profileById, departmentNameById)],
        note: restrictedContactRequest
          ? "Approved directory answers only include safe org fields. Private contact details stay out of scope."
          : null
      };
    }

    const scoredProfileMatches = profiles
      .map((profile) => ({
        profile,
        score: getProfileSearchScore(question, profile)
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => {
        if (left.score !== right.score) {
          return right.score - left.score;
        }
        return getDisplayName(left.profile).localeCompare(getDisplayName(right.profile));
      });

    const ambiguousPersonMatch =
      scoredProfileMatches.length > 1 &&
      scoredProfileMatches[0]?.score === scoredProfileMatches[1]?.score &&
      (scoredProfileMatches[0]?.score ?? 0) <= 6;
    const matchedProfiles = scoredProfileMatches
      .slice(0, 3)
      .map((entry) => mapDirectoryMatch(entry.profile, profileById, departmentNameById));

    if (matchedProfiles.length > 0) {
      return {
        status: ambiguousPersonMatch ? "ambiguous" : "ok",
        requestType: "person",
        restrictedContactRequest,
        matchedDepartment: null,
        matches: matchedProfiles,
        note: buildPersonMatchNote({
          restrictedContactRequest,
          ambiguousMatch: ambiguousPersonMatch
        })
      };
    }

    const matchedDepartment = departments
      .filter((department) => {
        const normalizedDepartmentName = normalizeText(department.name);
        return normalizedDepartmentName && question.includes(normalizedDepartmentName);
      })
      .sort((left, right) => normalizeText(right.name).length - normalizeText(left.name).length)[0];

    if (!matchedDepartment) {
      return {
        status: "no_match",
        requestType: "person",
        restrictedContactRequest,
        matchedDepartment: null,
        matches: [],
        note:
          "No matching employee or department was found in the approved directory data. " +
          "If the name may be incomplete, ask one short follow-up question for a last name, team, or title."
      };
    }

    const departmentIds = collectDepartmentTreeIds(matchedDepartment.id, childrenByParentId);
    const departmentMatches = profiles
      .filter((profile) => profile.department_id && departmentIds.has(profile.department_id))
      .sort((left, right) => getDisplayName(left).localeCompare(getDisplayName(right)))
      .slice(0, 6)
      .map((profile) => mapDirectoryMatch(profile, profileById, departmentNameById));

    return {
      status: departmentMatches.length > 0 ? "ok" : "no_match",
      requestType: "department",
      restrictedContactRequest,
      matchedDepartment: normalizeOptionalText(matchedDepartment.name),
      matches: departmentMatches,
      note:
        departmentMatches.length > 0
          ? restrictedContactRequest
            ? "Approved directory answers only include safe org fields. Private contact details stay out of scope."
            : "Showing approved safe directory fields only."
          : "No active employees were found for that department in the approved directory data."
    };
  } catch {
    return createUnavailableResult("Approved directory data is temporarily unavailable.");
  }
}
