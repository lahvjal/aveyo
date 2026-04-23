import { NextResponse } from "next/server";
import { getAuthSessionResultWithOptions } from "@/lib/auth/session";
import { applyAuthSessionCookies } from "@/lib/auth/session-cookies";
import { extractAuthTokensFromRequest } from "@/lib/auth/token";

function buildSessionResponsePayload(session: Awaited<ReturnType<typeof getAuthSessionResultWithOptions>>) {
  const { refreshedTokens, ...payload } = session;
  if (session.authenticated || process.env.NODE_ENV !== "production") {
    return payload;
  }

  const { failure, ...publicPayload } = payload;
  void failure;
  return publicPayload;
}

function logUnauthenticatedSessionAttempt(
  request: Request,
  session: Awaited<ReturnType<typeof getAuthSessionResultWithOptions>>,
  sentSessionMaterial: boolean
) {
  if (!session.failure) {
    return;
  }

  if (!sentSessionMaterial && session.failure.reason === "missing_access_token") {
    return;
  }

  console.warn("Auth session rejected", {
    path: new URL(request.url).pathname,
    method: request.method,
    reason: session.failure.reason,
    expectedProjectRef: session.failure.expectedProjectRef ?? null,
    actualProjectRef: session.failure.actualProjectRef ?? null
  });
}

export async function GET(request: Request) {
  const session = await getAuthSessionResultWithOptions(request, { allowTokenRefresh: true });
  const { refreshedTokens } = session;
  const sessionPayload = buildSessionResponsePayload(session);

  if (!session.authenticated) {
    const response = NextResponse.json(sessionPayload, { status: 401 });
    const tokens = extractAuthTokensFromRequest(request);
    const sentSessionMaterial = Boolean(tokens.accessToken || tokens.refreshToken);
    if (process.env.NODE_ENV !== "production" && session.failure?.reason) {
      response.headers.set("x-ava-auth-reason", session.failure.reason);
    }
    logUnauthenticatedSessionAttempt(request, session, sentSessionMaterial);
    return response;
  }

  const response = NextResponse.json(sessionPayload);
  if (refreshedTokens) {
    applyAuthSessionCookies(response, refreshedTokens, request);
  }
  return response;
}
