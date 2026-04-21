import { getPlatformApiBaseUrl } from "./config";

export type PlatformSessionRole = "support_agent" | "super_admin" | "customer" | "unknown";
export type PlatformSessionUserType = "employee" | "customer" | "unknown";

export interface PlatformSessionUser {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
}

export interface PlatformSessionAccess {
  userType: PlatformSessionUserType;
  departmentId: string | null;
  departmentName: string | null;
  departmentPath: Array<{
    id: string;
    name: string;
    parentId: string | null;
  }>;
  subDepartments: Array<{
    id: string;
    name: string;
    parentId: string | null;
  }>;
  subDepartmentIds: string[];
  isManager: boolean;
  isAdmin: boolean;
  isExecutive: boolean;
  isSuperAdmin: boolean;
}

export interface PlatformSessionPayload {
  authenticated: boolean;
  role?: PlatformSessionRole;
  userType?: PlatformSessionUserType;
  access?: PlatformSessionAccess | null;
  user?: PlatformSessionUser | null;
}

const platformApiBaseUrl = getPlatformApiBaseUrl();

export async function fetchPlatformAuthSession() {
  const response = await fetch(`${platformApiBaseUrl}/api/auth/session`, {
    method: "GET",
    credentials: "include",
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as PlatformSessionPayload | null;
  return {
    ok: response.ok,
    status: response.status,
    payload
  };
}

export async function logoutPlatformAuthSession() {
  const response = await fetch(`${platformApiBaseUrl}/api/auth/session/logout`, {
    method: "POST",
    credentials: "include",
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  return {
    ok: response.ok,
    status: response.status,
    payload
  };
}
