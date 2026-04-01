import { NextResponse } from "next/server";
import { getAuthSessionResultWithOptions } from "@/lib/auth/session";
import { applyAuthSessionCookies, clearAuthSessionCookies } from "@/lib/auth/session-cookies";

export async function GET(request: Request) {
  const session = await getAuthSessionResultWithOptions(request, { allowTokenRefresh: true });
  const { refreshedTokens, ...sessionPayload } = session;

  if (!session.authenticated) {
    const response = NextResponse.json(sessionPayload, { status: 401 });
    clearAuthSessionCookies(response, request);
    return response;
  }

  const response = NextResponse.json(sessionPayload);
  if (refreshedTokens) {
    applyAuthSessionCookies(response, refreshedTokens, request);
  }
  return response;
}
