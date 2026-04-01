export type AppRole = "support_agent" | "super_admin" | "customer" | "unknown";

export interface AuthSessionRefreshTokens {
  accessToken: string;
  refreshToken: string;
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
  user: SessionUser | null;
  refreshedTokens?: AuthSessionRefreshTokens;
}
