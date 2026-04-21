import type { NextResponse } from "next/server";

import type { PlatformSessionPayload } from "./session";

export const CUSTOMER_PORTAL_IMPERSONATION_COOKIE = "aveyo_cp_impersonate_customer";

export function isCustomerPortalCustomerSession(
  payload: PlatformSessionPayload | null | undefined
): boolean {
  if (!payload?.authenticated) {
    return false;
  }
  return payload.role === "customer" || payload.userType === "customer";
}

/**
 * Internal employees with org admin or super-admin access (from `profiles` via platform session).
 * Used for middleware, APIs, and client UI — must match platform `GET /api/auth/session` payload.
 */
export function canAccessCustomerPortalAsAdmin(
  payload: PlatformSessionPayload | null | undefined
): boolean {
  if (!payload?.authenticated || payload.userType !== "employee") {
    return false;
  }
  const access = payload.access;
  return Boolean(access?.isAdmin || access?.isSuperAdmin);
}

/**
 * Cookie values may be URL-encoded once by the framework; older builds also pre-encoded
 * the value, which can double-encode `@` as `%2540`. Decode until stable.
 */
function decodeImpersonationCookieValue(raw: string): string | null {
  let value = raw.trim();
  if (!value) {
    return null;
  }
  for (let i = 0; i < 4; i++) {
    try {
      const next = decodeURIComponent(value);
      if (next === value) {
        break;
      }
      value = next;
    } catch {
      return null;
    }
  }
  const trimmed = value.trim();
  return trimmed || null;
}

export function readImpersonationCustomerEmailFromCookieHeader(
  cookieHeader: string | null | undefined
): string | null {
  if (!cookieHeader) {
    return null;
  }
  const name = `${CUSTOMER_PORTAL_IMPERSONATION_COOKIE}=`;
  const segments = cookieHeader.split(";");
  for (const segment of segments) {
    const part = segment.trim();
    if (!part.startsWith(name)) {
      continue;
    }
    const raw = part.slice(name.length).trim();
    if (!raw) {
      return null;
    }
    return decodeImpersonationCookieValue(raw);
  }
  return null;
}

export function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function emailsMatchForPortal(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) {
    return false;
  }
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

const IMPERSONATION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;

function impersonationCookieBase() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/"
  };
}

export function setCustomerPortalImpersonationCookie(response: NextResponse, customerEmail: string) {
  const trimmed = customerEmail.trim();
  // Do not pre-encode: Next.js encodes cookie values when serializing Set-Cookie; double-encoding
  // breaks isLikelyEmail() after read (e.g. user%2540domain.com).
  response.cookies.set(CUSTOMER_PORTAL_IMPERSONATION_COOKIE, trimmed, {
    ...impersonationCookieBase(),
    maxAge: IMPERSONATION_COOKIE_MAX_AGE_SECONDS
  });
}

export function clearCustomerPortalImpersonationCookie(response: NextResponse) {
  response.cookies.set(CUSTOMER_PORTAL_IMPERSONATION_COOKIE, "", {
    ...impersonationCookieBase(),
    maxAge: 0
  });
}
