import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/auth/config";
import { getServiceRoleClient } from "@/lib/supabase";

interface SessionUser {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
}

interface SessionPayload {
  authenticated: boolean;
  role?: string;
  user?: SessionUser | null;
}

interface ProfileRow {
  full_name: string | null;
  job_title: string | null;
  profile_photo_url: string | null;
  is_executive: boolean | null;
  is_super_admin: boolean | null;
  onboarding_completed: boolean | null;
}

export interface AuthenticatedRequestContext {
  user: SessionUser;
  role: string;
  profile: ProfileRow;
}

interface AuthenticatedRequestResult {
  context?: AuthenticatedRequestContext;
  errorResponse?: NextResponse;
}

const apiBaseUrl = getApiBaseUrl();

function unauthorizedResponse() {
  return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
}

async function fetchSessionFromAuthority(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const response = await fetch(`${apiBaseUrl}/api/auth/session`, {
    method: "GET",
    headers: {
      cookie: cookieHeader
    },
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as SessionPayload | null;
  if (!response.ok || !payload?.authenticated || !payload.user) {
    return null;
  }

  return payload;
}

export async function requireAuthenticatedContext(
  request: NextRequest
): Promise<AuthenticatedRequestResult> {
  const session = await fetchSessionFromAuthority(request);
  if (!session) {
    return { errorResponse: unauthorizedResponse() };
  }
  const sessionUser = session.user;
  if (!sessionUser) {
    return { errorResponse: unauthorizedResponse() };
  }

  const { data: profile, error: profileError } = await getServiceRoleClient()
    .from("profiles")
    .select("full_name, job_title, profile_photo_url, is_executive, is_super_admin, onboarding_completed")
    .eq("id", sessionUser.id)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: "Profile lookup failed" },
        { status: 403 }
      )
    };
  }

  const isAuthorized = Boolean(profile.is_executive || profile.is_super_admin);
  if (!isAuthorized) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: "Access restricted" },
        { status: 403 }
      )
    };
  }

  return {
    context: {
      user: sessionUser,
      role: session.role ?? "unknown",
      profile: profile as ProfileRow
    }
  };
}
