import { NextResponse, type NextRequest } from "next/server";
import { appendSetCookieHeaders, fetchPlatformSessionForRequest } from "@ava/auth";
import { buildAuthLoginUrl, getApiBaseUrl } from "@/lib/config";

const protectedRoutePrefixes = ["/manager", "/resolved", "/settings", "/handoff"];
const publicRoutePrefixes = ["/embed", "/widget"];

function isHostedLoginRoute(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/login/");
}

function isProtectedRoute(pathname: string) {
  return pathname === "/" || protectedRoutePrefixes.some((prefix) => pathname.startsWith(prefix));
}

function isPublicRoute(pathname: string) {
  return publicRoutePrefixes.some((prefix) => pathname.startsWith(prefix));
}

function withPlatformCookies(response: NextResponse, setCookieHeaders: string[]) {
  appendSetCookieHeaders(response, setCookieHeaders);
  return response;
}

function buildHostedLoginRedirect(request: NextRequest, returnTo: string) {
  const logout = request.nextUrl.searchParams.get("logout") === "1";
  return NextResponse.redirect(buildAuthLoginUrl(returnTo, { logout }));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicRoute(pathname) || (!isHostedLoginRoute(pathname) && !isProtectedRoute(pathname))) {
    return NextResponse.next();
  }

  try {
    const session = await fetchPlatformSessionForRequest({
      request,
      apiBaseUrl: getApiBaseUrl()
    });
    const isAuthenticated = Boolean(session.ok && session.payload?.authenticated);
    const isLogoutRoute = request.nextUrl.searchParams.get("logout") === "1";

    if (isHostedLoginRoute(pathname)) {
      if (isAuthenticated && !isLogoutRoute) {
        return withPlatformCookies(NextResponse.redirect(new URL("/", request.url)), session.setCookieHeaders);
      }

      return withPlatformCookies(
        buildHostedLoginRedirect(request, `${request.nextUrl.origin}/`),
        session.setCookieHeaders
      );
    }

    if (!isAuthenticated) {
      return withPlatformCookies(
        buildHostedLoginRedirect(request, request.nextUrl.toString()),
        session.setCookieHeaders
      );
    }

    return withPlatformCookies(NextResponse.next(), session.setCookieHeaders);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
