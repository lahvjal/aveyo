import { type NextRequest } from "next/server";

export const ACCESS_TOKEN_COOKIE_NAME = "ava-access-token";
export const REFRESH_TOKEN_COOKIE_NAME = "ava-refresh-token";
const directAccessTokenCookieNames = [ACCESS_TOKEN_COOKIE_NAME, "sb-access-token"];
const directRefreshTokenCookieNames = [REFRESH_TOKEN_COOKIE_NAME, "sb-refresh-token"];
const SUPABASE_ISSUER_REGEX = /^https?:\/\/([a-z0-9-]+)\.supabase\.co\/auth\/v1\/?$/i;

export interface RequestAuthTokens {
  accessToken?: string;
  refreshToken?: string;
}

function resolveCurrentSupabaseProjectRef() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return null;
  }

  try {
    const hostname = new URL(supabaseUrl).hostname;
    const [projectRef] = hostname.split(".");
    return projectRef?.trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  const parts = accessToken.split(".");
  if (parts.length < 2) {
    return null;
  }

  const payloadPart = parts[1];
  const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

  try {
    const decoded = atob(padded);
    const payload = JSON.parse(decoded) as unknown;
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      return payload as Record<string, unknown>;
    }
  } catch {
    // Ignore malformed tokens and let callers decide fallback behavior.
  }

  return null;
}

function resolveProjectRefFromAccessToken(accessToken: string) {
  const payload = decodeJwtPayload(accessToken);
  if (!payload) {
    return null;
  }

  const ref = payload.ref;
  if (typeof ref === "string" && ref.trim()) {
    return ref.trim().toLowerCase();
  }

  const issuer = payload.iss;
  if (typeof issuer === "string") {
    const match = issuer.match(SUPABASE_ISSUER_REGEX);
    if (match?.[1]) {
      return match[1].toLowerCase();
    }
  }

  return null;
}

function isExpectedProjectAccessToken(accessToken: string, expectedProjectRef: string | null) {
  if (!expectedProjectRef) {
    return true;
  }

  return resolveProjectRefFromAccessToken(accessToken) === expectedProjectRef;
}

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  const entries = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const splitIndex = item.indexOf("=");
      if (splitIndex < 0) {
        return [item, ""] as const;
      }
      return [item.slice(0, splitIndex), item.slice(splitIndex + 1)] as const;
    });

  return Object.fromEntries(entries);
}

function decodeSupabaseCookieValue(rawValue: string): string {
  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

function firstCookieValue(cookies: Record<string, string>, names: string[]) {
  for (const name of names) {
    const value = cookies[name];
    if (value) {
      return value;
    }
  }
  return undefined;
}

function tokensFromStructuredCookie(rawValue: string): RequestAuthTokens {
  const decoded = decodeSupabaseCookieValue(rawValue);

  try {
    const parsed = JSON.parse(decoded) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const accessToken = (parsed as Record<string, unknown>).access_token;
      const refreshToken = (parsed as Record<string, unknown>).refresh_token;
      return {
        accessToken: typeof accessToken === "string" ? accessToken : undefined,
        refreshToken: typeof refreshToken === "string" ? refreshToken : undefined
      };
    }
    if (Array.isArray(parsed)) {
      const accessToken = typeof parsed[0] === "string" ? parsed[0] : undefined;
      const refreshToken = typeof parsed[1] === "string" ? parsed[1] : undefined;
      return {
        accessToken,
        refreshToken
      };
    }
  } catch {
    // Continue and handle direct token format below.
  }

  if (decoded.split(".").length >= 3) {
    return {
      accessToken: decoded
    };
  }

  return {};
}

function getTokensFromCookieRecord(cookies: Record<string, string>): RequestAuthTokens {
  const expectedProjectRef = resolveCurrentSupabaseProjectRef();

  for (const cookieName of directAccessTokenCookieNames) {
    const direct = cookies[cookieName];
    if (direct) {
      const decodedAccessToken = decodeSupabaseCookieValue(direct);
      if (!isExpectedProjectAccessToken(decodedAccessToken, expectedProjectRef)) {
        continue;
      }

      const rawRefreshToken = firstCookieValue(cookies, directRefreshTokenCookieNames);
      return {
        accessToken: decodedAccessToken,
        refreshToken: rawRefreshToken ? decodeSupabaseCookieValue(rawRefreshToken) : undefined
      };
    }
  }

  if (!expectedProjectRef) {
    for (const cookieName of directRefreshTokenCookieNames) {
      const refreshToken = cookies[cookieName];
      if (refreshToken) {
        return {
          refreshToken: decodeSupabaseCookieValue(refreshToken)
        };
      }
    }
  }

  const structuredCandidates = Object.entries(cookies).filter(([name]) => name.includes("auth-token"));
  const orderedStructuredCandidates = expectedProjectRef
    ? [
        ...structuredCandidates.filter(([name]) => name.toLowerCase().includes(expectedProjectRef)),
        ...structuredCandidates.filter(([name]) => !name.toLowerCase().includes(expectedProjectRef))
      ]
    : structuredCandidates;

  for (const [, value] of orderedStructuredCandidates) {
    const fromStructured = tokensFromStructuredCookie(value);
    if (!fromStructured.accessToken) {
      continue;
    }

    if (!isExpectedProjectAccessToken(fromStructured.accessToken, expectedProjectRef)) {
      continue;
    }

    return fromStructured;
  }

  if (!expectedProjectRef) {
    for (const [, value] of orderedStructuredCandidates) {
      const fromStructured = tokensFromStructuredCookie(value);
      if (!fromStructured.accessToken && fromStructured.refreshToken) {
        return fromStructured;
      }
    }
  }

  return {};
}

export function extractAuthTokensFromRequest(request: Request): RequestAuthTokens {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  return getTokensFromCookieRecord(cookies);
}

export function extractAuthTokensFromNextRequest(request: NextRequest): RequestAuthTokens {
  const cookieRecord: Record<string, string> = {};
  for (const cookie of request.cookies.getAll()) {
    cookieRecord[cookie.name] = cookie.value;
  }

  return getTokensFromCookieRecord(cookieRecord);
}

export function extractAccessTokenFromRequest(request: Request): string | undefined {
  return extractAuthTokensFromRequest(request).accessToken;
}

export function extractAccessTokenFromNextRequest(request: NextRequest): string | undefined {
  return extractAuthTokensFromNextRequest(request).accessToken;
}
