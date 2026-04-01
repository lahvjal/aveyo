import { NextResponse } from "next/server";
import { applyAuthSessionCookies, clearAuthSessionCookies } from "@/lib/auth/session-cookies";
import { getSupabaseServerClient } from "@/lib/supabase/server";

interface SessionBootstrapBody {
  accessToken?: string;
  refreshToken?: string;
}

function sanitizeToken(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as SessionBootstrapBody;
  const accessToken = sanitizeToken(body.accessToken);
  const refreshToken = sanitizeToken(body.refreshToken);

  if (!accessToken || !refreshToken) {
    const response = NextResponse.json(
      { error: "Both accessToken and refreshToken are required." },
      { status: 400 }
    );
    clearAuthSessionCookies(response, request);
    return response;
  }

  const supabaseServerClient = getSupabaseServerClient();
  const { data, error } = await supabaseServerClient.auth.getUser(accessToken);
  if (error || !data.user) {
    const response = NextResponse.json(
      { error: "Invalid session token payload." },
      { status: 401 }
    );
    clearAuthSessionCookies(response, request);
    return response;
  }

  const response = NextResponse.json({ ok: true });
  applyAuthSessionCookies(response, { accessToken, refreshToken }, request);
  return response;
}
