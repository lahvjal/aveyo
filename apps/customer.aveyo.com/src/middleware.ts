import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  
  // Skip session check for password reset flow to reduce auth API calls
  // These pages don't need session validation and will handle their own auth
  if (request.nextUrl.pathname.startsWith('/reset-password') || 
      request.nextUrl.pathname.startsWith('/forgot-password')) {
    return res;
  }
  
  // Workspace has mixed Next.js majors; cast to keep auth helper typing compatible.
  const supabase = createMiddlewareClient({ req: request as never, res: res as never });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Check if the user is authenticated
  const isAuthenticated = !!session;
  
  // Only log in development and limit frequency
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
    console.log('==== AUTH DEBUG ====');
    console.log('Auth Status:', isAuthenticated ? 'Authenticated' : 'Not Authenticated');
    console.log('User Email:', session?.user?.email);
    console.log('==================');
  }
  
  // All users are now considered part of the application
  const isCorrectApp = true;
  
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || 
    request.nextUrl.pathname.startsWith('/register') || 
    request.nextUrl.pathname.startsWith('/forgot-password') || 
    request.nextUrl.pathname.startsWith('/reset-password');
  const isDashboardRoute = 
    request.nextUrl.pathname.startsWith('/dashboard') || 
    request.nextUrl.pathname.startsWith('/documents') || 
    request.nextUrl.pathname.startsWith('/actions');
    
  // Redirect projects page to dashboard (since we're removing the projects page)
  if (request.nextUrl.pathname.startsWith('/projects')) {
    const redirectUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect support page to dashboard (support is now handled by Ava chat)
  if (request.nextUrl.pathname.startsWith('/support')) {
    const redirectUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect unauthenticated users to login page if they try to access protected routes
  if (!isAuthenticated && isDashboardRoute) {
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Redirect authenticated users who don't belong to this app to the access-denied page
  if (isAuthenticated && !isCorrectApp && isDashboardRoute) {
    const redirectUrl = new URL('/access-denied', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users to dashboard if they try to access auth routes
  if (isAuthenticated && isAuthRoute) {
    const redirectUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect root to dashboard or login based on auth status
  if (request.nextUrl.pathname === '/') {
    const redirectUrl = new URL(
      isAuthenticated ? '/dashboard' : '/login',
      request.url
    );
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|auth/callback).*)'],
};
