import { ServiceError } from "@/lib/service-error";
import { getAuthSessionResult } from "./session";
import {
  type AppRole,
  type AppUserType,
  type AuthSessionRefreshTokens,
  type SessionAccessContext,
  type SessionUser
} from "./types";

export interface AuthenticatedRequestContext {
  user: SessionUser;
  role: AppRole;
  userType: AppUserType;
  access: SessionAccessContext;
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
    userType: session.userType,
    access: session.access,
    refreshedTokens: session.refreshedTokens
  };
}
