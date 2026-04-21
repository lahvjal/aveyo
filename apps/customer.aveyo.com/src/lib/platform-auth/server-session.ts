import { NextResponse } from "next/server";
import { getPlatformApiBaseUrl } from "./config";
import {
  canAccessCustomerPortalAsAdmin,
  isCustomerPortalCustomerSession,
  isLikelyEmail,
  readImpersonationCustomerEmailFromCookieHeader
} from "./customer-portal-access";
import type { PlatformSessionPayload } from "./session";

const platformApiBaseUrl = getPlatformApiBaseUrl();

type CookieReadableHeaders = Headers & {
  getSetCookie?: () => string[];
};

export interface PlatformSessionRequestResult {
  ok: boolean;
  status: number;
  payload: PlatformSessionPayload | null;
  setCookieHeaders: string[];
}

function getSetCookieHeaders(headers: Headers) {
  const readableHeaders = headers as CookieReadableHeaders;
  const multiValueCookies = readableHeaders.getSetCookie?.() ?? [];
  if (multiValueCookies.length > 0) {
    return multiValueCookies;
  }

  const singleHeaderCookie = headers.get("set-cookie");
  return singleHeaderCookie ? [singleHeaderCookie] : [];
}

export function applyPlatformSetCookieHeaders(
  response: NextResponse,
  setCookieHeaders: string[]
) {
  for (const cookie of setCookieHeaders) {
    response.headers.append("set-cookie", cookie);
  }
}

export async function fetchPlatformSessionForRequest(
  request: Request
): Promise<PlatformSessionRequestResult> {
  const response = await fetch(`${platformApiBaseUrl}/api/auth/session`, {
    method: "GET",
    headers: {
      cookie: request.headers.get("cookie") ?? ""
    },
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as PlatformSessionPayload | null;
  return {
    ok: response.ok,
    status: response.status,
    payload,
    setCookieHeaders: getSetCookieHeaders(response.headers)
  };
}

export type CustomerPortalDataAccess =
  | { response: NextResponse }
  | {
      session: PlatformSessionRequestResult;
      userEmail: string;
      impersonating: boolean;
      actorEmail: string | null;
      /** Internal admin signed in but no customer impersonation cookie yet — data APIs return empty until a customer is chosen. */
      adminWithoutImpersonation?: boolean;
    };

/**
 * Authorizes customer portal data APIs: real customers, or internal admins
 * with an active HttpOnly impersonation cookie for the target customer email.
 */
export async function requireCustomerPortalDataAccess(request: Request): Promise<CustomerPortalDataAccess> {
  const session = await fetchPlatformSessionForRequest(request);
  const payload = session.payload;

  if (!session.ok || !payload?.authenticated) {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    applyPlatformSetCookieHeaders(response, session.setCookieHeaders);
    return { response };
  }

  if (isCustomerPortalCustomerSession(payload)) {
    const userEmail = payload.user?.email?.trim() ?? null;
    if (!userEmail) {
      const response = NextResponse.json({ error: "User email not found" }, { status: 400 });
      applyPlatformSetCookieHeaders(response, session.setCookieHeaders);
      return { response };
    }

    return {
      session,
      userEmail,
      impersonating: false,
      actorEmail: null
    };
  }

  if (canAccessCustomerPortalAsAdmin(payload)) {
    const impersonationEmail = readImpersonationCustomerEmailFromCookieHeader(
      request.headers.get("cookie")
    );
    if (!impersonationEmail || !isLikelyEmail(impersonationEmail)) {
      return {
        session,
        userEmail: "",
        impersonating: false,
        actorEmail: payload.user?.email ?? null,
        adminWithoutImpersonation: true
      };
    }

    return {
      session,
      userEmail: impersonationEmail,
      impersonating: true,
      actorEmail: payload.user?.email ?? null,
      adminWithoutImpersonation: false
    };
  }

  const response = NextResponse.json({ error: "Forbidden" }, { status: 403 });
  applyPlatformSetCookieHeaders(response, session.setCookieHeaders);
  return { response };
}

