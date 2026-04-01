import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl, getAuthRedirectUrl } from '@/lib/config';

/**
 * Test endpoint to verify redirect URL generation
 */
export async function GET(request: NextRequest) {
  try {
    // Get environment information
    const baseUrl = getBaseUrl();
    const resetRedirectUrl = getAuthRedirectUrl('/reset-password');
    
    // Collect environment variables (without exposing sensitive values)
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV || 'undefined',
      VERCEL_ENV: process.env.VERCEL_ENV || 'undefined',
      NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV || 'undefined',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'undefined',
      HAS_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      HAS_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      HAS_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      HAS_RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    };
    
    // Return diagnostic information
    return NextResponse.json({
      baseUrl,
      resetRedirectUrl,
      environment: envInfo,
      hostname: request.headers.get('host') || 'unknown',
      protocol: request.headers.get('x-forwarded-proto') || 'http',
    });
  } catch (error) {
    console.error('Error in test-redirect endpoint:', error);
    return NextResponse.json({ error: 'Failed to get redirect information' }, { status: 500 });
  }
}
