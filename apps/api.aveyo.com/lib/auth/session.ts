import { decodeJwtClaims, resolveRole } from "@/lib/auth/jwt";
import { extractAuthTokensFromRequest } from "@/lib/auth/token";
import { type AppRole, type AuthSessionResult } from "@/lib/auth/types";
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from "@/lib/supabase/server";

function anonymousSession(): AuthSessionResult {
  return {
    authenticated: false,
    role: "unknown",
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
  profile_photo_url: string | null;
}

interface ResolvedSessionProfile {
  role: AppRole;
  avatarUrl: string | null;
}

function normalizeProfilePhotoUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function resolveRoleWithProfileFlags(
  userId: string,
  fallbackRole: AppRole
): Promise<ResolvedSessionProfile> {
  try {
    const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
    const [{ data: profileData, error: profileError }, { data: supportData, error: supportError }] =
      await Promise.all([
        supabaseServiceRoleClient
          .from("profiles")
          .select("is_super_admin, profile_photo_url")
          .eq("id", userId)
          .maybeSingle(),
        supabaseServiceRoleClient.rpc("is_ava_support_agent", { p_user_id: userId })
      ]);

    if (profileError || supportError) {
      return {
        role: fallbackRole === "super_admin" ? "unknown" : fallbackRole,
        avatarUrl: null
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

    return {
      role,
      avatarUrl: normalizeProfilePhotoUrl(profileRole?.profile_photo_url)
    };
  } catch {
    return {
      role: fallbackRole === "super_admin" ? "unknown" : fallbackRole,
      avatarUrl: null
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
