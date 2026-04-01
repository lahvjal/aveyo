import { type NextRequest } from "next/server";

export const ACCESS_TOKEN_COOKIE_NAME = "ava-access-token";
export const REFRESH_TOKEN_COOKIE_NAME = "ava-refresh-token";
const directAccessTokenCookieNames = [ACCESS_TOKEN_COOKIE_NAME, "sb-access-token"];
const directRefreshTokenCookieNames = [REFRESH_TOKEN_COOKIE_NAME, "sb-refresh-token"];

export interface RequestAuthTokens {
  accessToken?: string;
  refreshToken?: string;
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
  for (const cookieName of directAccessTokenCookieNames) {
    const direct = cookies[cookieName];
    if (direct) {
      const rawRefreshToken = firstCookieValue(cookies, directRefreshTokenCookieNames);
      return {
        accessToken: decodeSupabaseCookieValue(direct),
        refreshToken: rawRefreshToken ? decodeSupabaseCookieValue(rawRefreshToken) : undefined
      };
    }
  }

  for (const cookieName of directRefreshTokenCookieNames) {
    const refreshToken = cookies[cookieName];
    if (refreshToken) {
      return {
        refreshToken: decodeSupabaseCookieValue(refreshToken)
      };
    }
  }

  for (const [name, value] of Object.entries(cookies)) {
    if (!name.includes("auth-token")) {
      continue;
    }
    const fromStructured = tokensFromStructuredCookie(value);
    if (fromStructured.accessToken || fromStructured.refreshToken) {
      return fromStructured;
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
