import { NextResponse } from "next/server";
import { appendSetCookieHeaders, fetchPlatformSessionForRequest } from "@ava/auth";
import { buildAuthLoginUrl, getApiBaseUrl } from "./lib/auth/config";

const protectedRoutePrefixes = ["/onboarding"];

function isHostedLoginRoute(pathname) {
  return pathname === "/login" || pathname.startsWith("/login/");
}

function isProtectedRoute(pathname) {
  return pathname === "/" || protectedRoutePrefixes.some((prefix) => pathname.startsWith(prefix));
}

function withPlatformCookies(response, setCookieHeaders) {
  appendSetCookieHeaders(response, setCookieHeaders);
  return response;
}

function buildHostedLoginRedirect(request, returnTo) {
  const logout = request.nextUrl.searchParams.get("logout") === "1";
  return NextResponse.redirect(buildAuthLoginUrl(returnTo, { logout }));
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  if (!isHostedLoginRoute(pathname) && !isProtectedRoute(pathname)) {
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
