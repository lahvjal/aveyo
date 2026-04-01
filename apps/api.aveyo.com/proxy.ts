import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookieContract } from "@/lib/auth/cookie-contract";
import { extractAccessTokenFromNextRequest } from "@/lib/auth/token";

const publicApiPaths = new Set([
  "/api/health",
  "/api/auth/session",
  "/api/auth/session/bootstrap",
  "/api/auth/session/logout"
]);
const defaultAllowedOrigins = [
  "http://localhost:4001",
  "http://localhost:4002",
  "http://localhost:4003",
  "http://localhost:4004",
  "http://localhost:4005",
  "http://localhost:4006",
  "http://localhost:4007",
  "http://localhost:4008",
  "https://aveyo.com",
  "https://app.aveyo.com",
  "https://auth.aveyo.com",
  "https://ava.aveyo.com",
  "https://customer.aveyo.com"
];

function isAllowedLocalDevOrigin(origin: string) {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.trim().toLowerCase();
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    if (host === "localhost" || host === "0.0.0.0" || host.endsWith(".local")) {
      return true;
    }
    if (/^127(?:\.\d{1,3}){3}$/.test(host)) {
      return true;
    }
    if (/^192\.168(?:\.\d{1,3}){2}$/.test(host)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function isPublicPath(pathname: string) {
  return publicApiPaths.has(pathname);
}

function getAllowedOrigins() {
  const fromEnv = process.env.AVA_ALLOWED_ORIGINS;
  if (!fromEnv) {
    return defaultAllowedOrigins;
  }

  const parsed = fromEnv
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (parsed.length === 0) {
    return defaultAllowedOrigins;
  }

  // Keep defaults to avoid accidental local lockouts when env lists are stale.
  return Array.from(new Set([...defaultAllowedOrigins, ...parsed]));
}

function withCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return response;
  }

  const allowedOrigins = getAllowedOrigins();
  if (!allowedOrigins.includes(origin) && !isAllowedLocalDevOrigin(origin)) {
    return response;
  }

  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Vary", "Origin");
  return response;
}

export function proxy(request: NextRequest) {
  getSessionCookieContract(request);

  const { pathname } = request.nextUrl;

  if (request.method === "OPTIONS") {
    return withCors(request, new NextResponse(null, { status: 204 }));
  }

  if (isPublicPath(pathname)) {
    return withCors(request, NextResponse.next());
  }

  const token = extractAccessTokenFromNextRequest(request);
  if (!token) {
    return withCors(
      request,
      NextResponse.json({ error: "Authentication required." }, { status: 401 })
    );
  }

  return withCors(request, NextResponse.next());
}

export const config = {
  matcher: ["/api/:path*"]
};
