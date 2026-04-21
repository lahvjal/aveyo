export type AppRole = "support_agent" | "super_admin" | "customer" | "unknown";
export type AppUserType = "employee" | "customer" | "unknown";
export type AuthSessionFailureReason =
  | "missing_access_token"
  | "invalid_access_token"
  | "refresh_failed"
  | "refreshed_access_token_invalid"
  | "project_ref_mismatch";

export interface SessionDepartmentNode {
  id: string;
  name: string;
  parentId: string | null;
}

export interface SessionAccessContext {
  userType: AppUserType;
  departmentId: string | null;
  departmentName: string | null;
  departmentPath: SessionDepartmentNode[];
  subDepartments: SessionDepartmentNode[];
  subDepartmentIds: string[];
  isManager: boolean;
  isAdmin: boolean;
  isExecutive: boolean;
  isSuperAdmin: boolean;
}

export interface AuthSessionRefreshTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSessionFailure {
  reason: AuthSessionFailureReason;
  expectedProjectRef?: string | null;
  actualProjectRef?: string | null;
}

export interface SessionUser {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
}

export interface AuthSessionResult {
  authenticated: boolean;
  role: AppRole;
  userType: AppUserType;
  access: SessionAccessContext;
  user: SessionUser | null;
  failure?: AuthSessionFailure;
  refreshedTokens?: AuthSessionRefreshTokens;
}
