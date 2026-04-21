import { NextResponse } from "next/server";

import {
  canAccessCustomerPortalAsAdmin,
  clearCustomerPortalImpersonationCookie,
  isCustomerPortalCustomerSession,
  isLikelyEmail,
  readImpersonationCustomerEmailFromCookieHeader,
  setCustomerPortalImpersonationCookie
} from "@/lib/platform-auth/customer-portal-access";
import {
  applyPlatformSetCookieHeaders,
  fetchPlatformSessionForRequest
} from "@/lib/platform-auth/server-session";

export async function POST(request: Request) {
  const session = await fetchPlatformSessionForRequest(request);
  if (!session.ok || !session.payload?.authenticated) {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    applyPlatformSetCookieHeaders(response, session.setCookieHeaders);
    return response;
  }

  if (!canAccessCustomerPortalAsAdmin(session.payload)) {
    const response = NextResponse.json({ error: "Forbidden" }, { status: 403 });
    applyPlatformSetCookieHeaders(response, session.setCookieHeaders);
    return response;
  }

  const body = (await request.json().catch(() => null)) as { customerEmail?: unknown } | null;
  const raw = typeof body?.customerEmail === "string" ? body.customerEmail : "";
  const customerEmail = raw.trim();
  if (!isLikelyEmail(customerEmail)) {
    const response = NextResponse.json({ error: "A valid customerEmail is required" }, { status: 400 });
    applyPlatformSetCookieHeaders(response, session.setCookieHeaders);
    return response;
  }

  const response = NextResponse.json({ ok: true });
  applyPlatformSetCookieHeaders(response, session.setCookieHeaders);
  setCustomerPortalImpersonationCookie(response, customerEmail);
  console.log("[customer-portal/api/impersonation] POST set impersonation cookie for:", customerEmail);
  return response;
}

export async function DELETE(request: Request) {
  const session = await fetchPlatformSessionForRequest(request);
  if (!session.ok || !session.payload?.authenticated) {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    applyPlatformSetCookieHeaders(response, session.setCookieHeaders);
    return response;
  }

  if (!canAccessCustomerPortalAsAdmin(session.payload)) {
    const response = NextResponse.json({ error: "Forbidden" }, { status: 403 });
    applyPlatformSetCookieHeaders(response, session.setCookieHeaders);
    return response;
  }

  const response = NextResponse.json({ ok: true });
  clearCustomerPortalImpersonationCookie(response);
  applyPlatformSetCookieHeaders(response, session.setCookieHeaders);
  return response;
}

export async function GET(request: Request) {
  const session = await fetchPlatformSessionForRequest(request);
  if (!session.ok || !session.payload?.authenticated) {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    applyPlatformSetCookieHeaders(response, session.setCookieHeaders);
    return response;
  }

  const payload = session.payload;
  const viewerEmail = payload.user?.email ?? null;

  if (isCustomerPortalCustomerSession(payload)) {
    const effective = viewerEmail?.trim() ?? null;
    const body = {
      viewerEmail,
      canImpersonate: false,
      impersonationActive: false,
      effectiveCustomerEmail: effective
    };
    const response = NextResponse.json(body);
    applyPlatformSetCookieHeaders(response, session.setCookieHeaders);
    return response;
  }

  if (!canAccessCustomerPortalAsAdmin(payload)) {
    const response = NextResponse.json({ error: "Forbidden" }, { status: 403 });
    applyPlatformSetCookieHeaders(response, session.setCookieHeaders);
    return response;
  }

  const fromCookie = readImpersonationCustomerEmailFromCookieHeader(request.headers.get("cookie"));
  const impersonationActive = Boolean(fromCookie && isLikelyEmail(fromCookie));

  const response = NextResponse.json({
    viewerEmail,
    canImpersonate: true,
    impersonationActive,
    effectiveCustomerEmail: impersonationActive ? fromCookie : null
  });
  applyPlatformSetCookieHeaders(response, session.setCookieHeaders);
  return response;
}
