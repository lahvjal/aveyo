import { NextResponse, type NextRequest } from "next/server";
import { appendSetCookieHeaders, fetchPlatformSessionForRequest } from "@ava/auth";
import { buildAuthLoginUrl, getApiBaseUrl } from "@/lib/auth/config";

function withPlatformCookies(response: NextResponse, setCookieHeaders: string[]) {
  appendSetCookieHeaders(response, setCookieHeaders);
  return response;
}

function buildHostedLoginRedirect(request: NextRequest) {
  return NextResponse.redirect(buildAuthLoginUrl(request.nextUrl.toString()));
}

export async function middleware(request: NextRequest) {
  try {
    const session = await fetchPlatformSessionForRequest({
      request,
      apiBaseUrl: getApiBaseUrl()
    });
    const isAuthenticated = Boolean(session.ok && session.payload?.authenticated);

    if (!isAuthenticated) {
      return withPlatformCookies(buildHostedLoginRedirect(request), session.setCookieHeaders);
    }

    return withPlatformCookies(NextResponse.next(), session.setCookieHeaders);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
