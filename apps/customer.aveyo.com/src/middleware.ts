import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildAuthLoginUrl, getEmployeeAppUrl } from '@/lib/platform-auth/config';
import {
  canAccessCustomerPortalAsAdmin,
  isCustomerPortalCustomerSession
} from '@/lib/platform-auth/customer-portal-access';
import {
  applyPlatformSetCookieHeaders,
  fetchPlatformSessionForRequest
} from '@/lib/platform-auth/server-session';

const protectedRoutePrefixes = [
  '/dashboard',
  '/documents',
  '/actions',
  '/annual-report',
  '/expectations',
  '/view-as-customer'
];
const publicLocalAccountRoutePrefixes = ['/register', '/forgot-password', '/reset-password'];

function isHostedLoginRoute(pathname: string) {
  return pathname === '/login' || pathname.startsWith('/login/');
}

function isProtectedRoute(pathname: string) {
  return protectedRoutePrefixes.some((prefix) => pathname.startsWith(prefix));
}

function isPublicLocalAccountRoute(pathname: string) {
  return publicLocalAccountRoutePrefixes.some((prefix) => pathname.startsWith(prefix));
}

function withPlatformCookies(response: NextResponse, setCookieHeaders: string[]) {
  applyPlatformSetCookieHeaders(response, setCookieHeaders);
  return response;
}

function buildHostedLoginRedirect(request: NextRequest) {
  const destination =
    request.nextUrl.pathname === '/'
      ? `${request.nextUrl.origin}/dashboard`
      : request.nextUrl.toString();
  return NextResponse.redirect(buildAuthLoginUrl(destination));
}

function buildEmployeeRedirect(request: NextRequest) {
  const employeeAppUrl = getEmployeeAppUrl();
  return NextResponse.redirect(employeeAppUrl || new URL('/', request.url));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/projects') || pathname.startsWith('/support')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isPublicLocalAccountRoute(pathname) || pathname.startsWith('/access-denied')) {
    return NextResponse.next();
  }

  const needsSessionCheck =
    pathname === '/' || isHostedLoginRoute(pathname) || isProtectedRoute(pathname);

  if (!needsSessionCheck) {
    return NextResponse.next();
  }

  try {
    const session = await fetchPlatformSessionForRequest(request);
    const payload = session.payload;
    const isAuthenticated = Boolean(session.ok && payload?.authenticated);
    const isCustomer = isCustomerPortalCustomerSession(payload);
    const isAdminPortalViewer = Boolean(isAuthenticated && canAccessCustomerPortalAsAdmin(payload));
    const isNonCustomerUser = isAuthenticated && !isCustomer && !isAdminPortalViewer;

    if (isHostedLoginRoute(pathname)) {
      if (isCustomer) {
        return withPlatformCookies(
          NextResponse.redirect(new URL('/dashboard', request.url)),
          session.setCookieHeaders
        );
      }

      if (isAdminPortalViewer) {
        return withPlatformCookies(
          NextResponse.redirect(new URL('/dashboard', request.url)),
          session.setCookieHeaders
        );
      }

      if (isNonCustomerUser) {
        return withPlatformCookies(buildEmployeeRedirect(request), session.setCookieHeaders);
      }

      return withPlatformCookies(NextResponse.next(), session.setCookieHeaders);
    }

    if (!isAuthenticated) {
      return withPlatformCookies(buildHostedLoginRedirect(request), session.setCookieHeaders);
    }

    if (isNonCustomerUser) {
      return withPlatformCookies(buildEmployeeRedirect(request), session.setCookieHeaders);
    }

    if (pathname === '/') {
      return withPlatformCookies(
        NextResponse.redirect(new URL('/dashboard', request.url)),
        session.setCookieHeaders
      );
    }

    return withPlatformCookies(NextResponse.next(), session.setCookieHeaders);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|auth/callback).*)']
};
