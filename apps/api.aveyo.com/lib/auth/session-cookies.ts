import { type NextResponse } from "next/server";
import { getSessionCookieContract } from "@/lib/auth/cookie-contract";
import { ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME } from "@/lib/auth/token";
import { type AuthSessionRefreshTokens } from "@/lib/auth/types";

const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const ACCESS_TOKEN_FALLBACK_MAX_AGE_SECONDS = 60 * 45;

function decodeJwtPayload(accessToken: string) {
  const parts = accessToken.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    const decoded = Buffer.from(payload, "base64").toString("utf8");
    return JSON.parse(decoded) as { exp?: number } | null;
  } catch {
    return null;
  }
}

function resolveAccessTokenMaxAgeSeconds(accessToken: string) {
  const payload = decodeJwtPayload(accessToken);
  if (!payload?.exp || !Number.isFinite(payload.exp)) {
    return ACCESS_TOKEN_FALLBACK_MAX_AGE_SECONDS;
  }

  const expiresAtMs = payload.exp * 1000;
  const remainingSeconds = Math.floor((expiresAtMs - Date.now()) / 1000);
  if (remainingSeconds <= 0) {
    return 1;
  }

  return remainingSeconds;
}

function getCookieBaseOptions(contract: ReturnType<typeof getSessionCookieContract>) {
  const base = {
    path: "/",
    sameSite: contract.sameSite,
    secure: contract.secure,
    httpOnly: contract.httpOnly
  } as const;

  if (!contract.domain) {
    return base;
  }

  return {
    ...base,
    domain: contract.domain
  } as const;
}

export function applyAuthSessionCookies(
  response: NextResponse,
  tokens: AuthSessionRefreshTokens,
  request: Request
) {
  const contract = getSessionCookieContract(request);
  const baseOptions = getCookieBaseOptions(contract);

  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE_NAME,
    value: tokens.accessToken,
    ...baseOptions,
    maxAge: resolveAccessTokenMaxAgeSeconds(tokens.accessToken)
  });

  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE_NAME,
    value: tokens.refreshToken,
    ...baseOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS
  });
}

export function clearAuthSessionCookies(response: NextResponse, request: Request) {
  const contract = getSessionCookieContract(request);
  const baseOptions = getCookieBaseOptions(contract);

  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE_NAME,
    value: "",
    ...baseOptions,
    maxAge: 0
  });

  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE_NAME,
    value: "",
    ...baseOptions,
    maxAge: 0
  });
}
