import { ServiceError } from "@/lib/service-error";
import { getAuthSessionResult } from "./session";
import { type AppRole, type AuthSessionRefreshTokens, type SessionUser } from "./types";

export interface AuthenticatedRequestContext {
  user: SessionUser;
  role: AppRole;
  refreshedTokens?: AuthSessionRefreshTokens;
}

export async function requireAuthenticatedRequest(request: Request): Promise<AuthenticatedRequestContext> {
  const session = await getAuthSessionResult(request);
  if (!session.authenticated || !session.user) {
    throw new ServiceError(401, "Authentication required.");
  }

  return {
    user: session.user,
    role: session.role,
    refreshedTokens: session.refreshedTokens
  };
}
