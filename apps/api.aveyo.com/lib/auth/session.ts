import { decodeJwtClaims, resolveRole } from "@/lib/auth/jwt";
import { extractAuthTokensFromRequest } from "@/lib/auth/token";
import {
  type AppRole,
  type AppUserType,
  type AuthSessionResult,
  type SessionAccessContext,
  type SessionDepartmentNode
} from "@/lib/auth/types";
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from "@/lib/supabase/server";

const MAX_DEPARTMENT_DEPTH = 25;

function fallbackAccessContext(role: AppRole): SessionAccessContext {
  const userType: AppUserType =
    role === "customer" ? "customer" : role === "support_agent" || role === "super_admin" ? "employee" : "unknown";
  const isSuperAdmin = role === "super_admin";

  return {
    userType,
    departmentId: null,
    departmentName: null,
    departmentPath: [],
    subDepartments: [],
    subDepartmentIds: [],
    isManager: false,
    isAdmin: isSuperAdmin,
    isExecutive: false,
    isSuperAdmin
  };
}

function anonymousSession(): AuthSessionResult {
  return {
    authenticated: false,
    role: "unknown",
    userType: "unknown",
    access: fallbackAccessContext("unknown"),
    user: null
  };
}

function getDisplayName(params: { email: string | null; fullName: unknown; username: unknown }) {
  const fullName = typeof params.fullName === "string" ? params.fullName.trim() : "";
  if (fullName) {
    return fullName;
  }

  const username = typeof params.username === "string" ? params.username.trim() : "";
  if (username) {
    return username;
  }

  if (!params.email) {
    return "Account";
  }

  const [localPart] = params.email.split("@");
  return localPart || "Account";
}

interface ProfileRoleRow {
  is_super_admin: boolean | null;
  is_admin: boolean | null;
  is_manager: boolean | null;
  is_executive: boolean | null;
  department_id: string | null;
  profile_photo_url: string | null;
}

interface DepartmentRow {
  id: string;
  name: string;
  parent_id: string | null;
}

interface DepartmentContextResult {
  departmentName: string | null;
  departmentPath: SessionDepartmentNode[];
  subDepartments: SessionDepartmentNode[];
  subDepartmentIds: string[];
}

interface ResolvedSessionProfile {
  role: AppRole;
  avatarUrl: string | null;
  userType: AppUserType;
  access: SessionAccessContext;
}

function normalizeProfilePhotoUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toDepartmentNode(row: DepartmentRow): SessionDepartmentNode {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id
  };
}

function resolveUserType(role: AppRole, hasProfileRecord: boolean): AppUserType {
  if (role === "customer") {
    return "customer";
  }
  if (hasProfileRecord || role === "support_agent" || role === "super_admin") {
    return "employee";
  }
  return "unknown";
}

async function resolveDepartmentContext(departmentId: string | null): Promise<DepartmentContextResult> {
  if (!departmentId) {
    return {
      departmentName: null,
      departmentPath: [],
      subDepartments: [],
      subDepartmentIds: []
    };
  }

  try {
    const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
    const { data, error } = await supabaseServiceRoleClient
      .from("departments")
      .select("id, name, parent_id")
      .limit(5000);

    if (error || !data) {
      return {
        departmentName: null,
        departmentPath: [],
        subDepartments: [],
        subDepartmentIds: []
      };
    }

    const departments = (data as DepartmentRow[]).filter((row) => row?.id);
    const departmentById = new Map(departments.map((row) => [row.id, row]));
    const current = departmentById.get(departmentId);
    if (!current) {
      return {
        departmentName: null,
        departmentPath: [],
        subDepartments: [],
        subDepartmentIds: []
      };
    }

    const path: SessionDepartmentNode[] = [];
    const visitedPathIds = new Set<string>();
    let cursor: DepartmentRow | undefined = current;
    let depth = 0;
    while (cursor && depth < MAX_DEPARTMENT_DEPTH) {
      if (visitedPathIds.has(cursor.id)) {
        break;
      }
      visitedPathIds.add(cursor.id);
      path.unshift(toDepartmentNode(cursor));
      cursor = cursor.parent_id ? departmentById.get(cursor.parent_id) : undefined;
      depth += 1;
    }

    const childrenByParentId = new Map<string, DepartmentRow[]>();
    for (const department of departments) {
      if (!department.parent_id) {
        continue;
      }
      const list = childrenByParentId.get(department.parent_id) ?? [];
      list.push(department);
      childrenByParentId.set(department.parent_id, list);
    }

    const subDepartments: SessionDepartmentNode[] = [];
    const subDepartmentIds: string[] = [];
    const stack = [...(childrenByParentId.get(current.id) ?? [])];
    const visitedDescendantIds = new Set<string>();
    while (stack.length > 0) {
      const next = stack.pop();
      if (!next || visitedDescendantIds.has(next.id)) {
        continue;
      }
      visitedDescendantIds.add(next.id);
      const node = toDepartmentNode(next);
      subDepartments.push(node);
      subDepartmentIds.push(next.id);
      const children = childrenByParentId.get(next.id);
      if (children && children.length > 0) {
        stack.push(...children);
      }
    }

    return {
      departmentName: current.name,
      departmentPath: path,
      subDepartments,
      subDepartmentIds
    };
  } catch {
    return {
      departmentName: null,
      departmentPath: [],
      subDepartments: [],
      subDepartmentIds: []
    };
  }
}

export async function resolveRoleWithProfileFlags(
  userId: string,
  fallbackRole: AppRole
): Promise<ResolvedSessionProfile> {
  const safeFallbackRole: AppRole = fallbackRole === "super_admin" ? "unknown" : fallbackRole;
  const fallbackAccess = fallbackAccessContext(safeFallbackRole);

  try {
    const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
    const [{ data: profileData, error: profileError }, { data: supportData, error: supportError }] =
      await Promise.all([
        supabaseServiceRoleClient
          .from("profiles")
          .select(
            "is_super_admin, is_admin, is_manager, is_executive, department_id, profile_photo_url"
          )
          .eq("id", userId)
          .maybeSingle(),
        supabaseServiceRoleClient.rpc("is_ava_support_agent", { p_user_id: userId })
      ]);

    if (profileError || supportError) {
      return {
        role: safeFallbackRole,
        avatarUrl: null,
        userType: fallbackAccess.userType,
        access: fallbackAccess
      };
    }

    const profileRole = (profileData ?? null) as ProfileRoleRow | null;
    const role: AppRole = profileRole?.is_super_admin
      ? "super_admin"
      : Boolean(supportData)
        ? "support_agent"
        : fallbackRole === "customer"
          ? "customer"
          : "unknown";
    const userType = resolveUserType(role, Boolean(profileRole));
    const isSuperAdmin = Boolean(profileRole?.is_super_admin) || role === "super_admin";
    const isAdmin = Boolean(profileRole?.is_admin) || isSuperAdmin;
    const isManager = Boolean(profileRole?.is_manager);
    const isExecutive = Boolean(profileRole?.is_executive);
    const departmentContext = await resolveDepartmentContext(profileRole?.department_id ?? null);

    return {
      role,
      avatarUrl: normalizeProfilePhotoUrl(profileRole?.profile_photo_url),
      userType,
      access: {
        userType,
        departmentId: profileRole?.department_id ?? null,
        departmentName: departmentContext.departmentName,
        departmentPath: departmentContext.departmentPath,
        subDepartments: departmentContext.subDepartments,
        subDepartmentIds: departmentContext.subDepartmentIds,
        isManager,
        isAdmin,
        isExecutive,
        isSuperAdmin
      }
    };
  } catch {
    return {
      role: safeFallbackRole,
      avatarUrl: null,
      userType: fallbackAccess.userType,
      access: fallbackAccess
    };
  }
}

export async function getAuthSessionResult(request: Request): Promise<AuthSessionResult> {
  return getAuthSessionResultWithOptions(request);
}

interface GetAuthSessionOptions {
  allowTokenRefresh?: boolean;
}

export async function getAuthSessionResultWithOptions(
  request: Request,
  options: GetAuthSessionOptions = {}
): Promise<AuthSessionResult> {
  const { accessToken: accessTokenFromCookie, refreshToken } = extractAuthTokensFromRequest(request);
  if (!accessTokenFromCookie) {
    return anonymousSession();
  }

  const supabaseServerClient = getSupabaseServerClient();
  let accessToken = accessTokenFromCookie;
  let refreshedTokens: AuthSessionResult["refreshedTokens"];
  let userResult = await supabaseServerClient.auth.getUser(accessToken);

  if ((userResult.error || !userResult.data.user) && refreshToken && options.allowTokenRefresh) {
    const { data: refreshed, error: refreshError } =
      await supabaseServerClient.auth.refreshSession({ refresh_token: refreshToken });

    if (!refreshError && refreshed.session?.access_token && refreshed.session?.refresh_token) {
      accessToken = refreshed.session.access_token;
      refreshedTokens = {
        accessToken: refreshed.session.access_token,
        refreshToken: refreshed.session.refresh_token
      };
      userResult = await supabaseServerClient.auth.getUser(accessToken);
    }
  }

  const claims = decodeJwtClaims(accessToken);
  const { data, error } = userResult;

  if (error || !data.user) {
    return anonymousSession();
  }

  const resolvedProfile = await resolveRoleWithProfileFlags(
    data.user.id,
    resolveRole(claims, data.user)
  );

  return {
    authenticated: true,
    role: resolvedProfile.role,
    userType: resolvedProfile.userType,
    access: resolvedProfile.access,
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
      name: getDisplayName({
        email: data.user.email ?? null,
        fullName: data.user.user_metadata?.full_name,
        username: data.user.user_metadata?.username
      }),
      avatarUrl: resolvedProfile.avatarUrl
    },
    refreshedTokens
  };
}
