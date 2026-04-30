import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookieContract } from "@/lib/auth/cookie-contract";
import { getAllowedOrigins, isAllowedLocalDevOrigin } from "@/lib/auth/origins";
import { extractAccessTokenFromNextRequest } from "@/lib/auth/token";

const publicApiPaths = new Set([
  "/api/health",
  "/api/auth/login/start",
  "/api/auth/session",
  "/api/auth/session/bootstrap",
  "/api/auth/session/logout",
  "/api/public/ava/guest-reply",
  "/api/marketing/news/posts"
]);
const publicApiPathPrefixes = ["/api/marketing/news/posts/slug/"];
function isPublicPath(pathname: string) {
  return publicApiPaths.has(pathname) || publicApiPathPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function appendVary(response: NextResponse, value: string) {
  const current = response.headers.get("Vary");
  if (!current) {
    response.headers.set("Vary", value);
    return;
  }

  const entries = current
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (!entries.includes(value.toLowerCase())) {
    response.headers.set("Vary", `${current}, ${value}`);
  }
}

function isOriginAllowed(origin: string) {
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin) || isAllowedLocalDevOrigin(origin);
}

function withCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return response;
  }

  if (!isOriginAllowed(origin)) {
    appendVary(response, "Origin");
    return response;
  }

  const requestedHeaders = request.headers.get("access-control-request-headers");
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    requestedHeaders && requestedHeaders.trim() ? requestedHeaders : "Content-Type, Authorization"
  );
  appendVary(response, "Origin");
  return response;
}

export function proxy(request: NextRequest) {
  getSessionCookieContract(request);

  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");
  const disallowedOrigin = Boolean(origin) && !isOriginAllowed(origin);

  if (request.method === "OPTIONS") {
    if (disallowedOrigin) {
      const response = NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
      appendVary(response, "Origin");
      return response;
    }
    return withCors(request, new NextResponse(null, { status: 204 }));
  }

  if (disallowedOrigin) {
    const response = NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
    appendVary(response, "Origin");
    return response;
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
