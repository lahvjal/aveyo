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
  "/api/marketing/news/posts"
]);
const publicApiPathPrefixes = ["/api/marketing/news/posts/slug/"];
function isPublicPath(pathname: string) {
  return publicApiPaths.has(pathname) || publicApiPathPrefixes.some((prefix) => pathname.startsWith(prefix));
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
