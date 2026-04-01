import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { getLocalAppUrl } from '@ava/config/runtime/app-urls';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  
  console.log('Auth callback received:');
  console.log('- Code:', code ? 'present' : 'not present');
  console.log('- Token hash:', token_hash ? 'present' : 'not present');
  console.log('- Type:', type);
  console.log('- Next URL:', next);
  
  // Create a Supabase client for handling the auth callback
  const supabase = createRouteHandlerClient({ cookies });

  if (code) {
    // Exchange the code for a session
    await supabase.auth.exchangeCodeForSession(code);
  }
  
  // Handle token-based verification (email confirmation, password reset, etc.)
  if (token_hash) {
    console.log('Verifying token hash...');
    try {
      // Determine the verification type based on the 'type' parameter
      let verificationType: 'email' | 'signup' | 'recovery' | 'magiclink' = 'email';
      
      if (type === 'signup') {
        verificationType = 'signup';
      } else if (type === 'recovery') {
        verificationType = 'recovery';
      } else if (type === 'magiclink') {
        verificationType = 'magiclink';
      }
      
      console.log('Verification type:', verificationType);
      console.log('Token hash (first 10 chars):', token_hash.substring(0, 10) + '...');
      
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token_hash,
        type: verificationType
      });
      
      if (error) {
        console.error('Token verification error:', error);
        console.error('Error details:', JSON.stringify(error));
      } else {
        console.log('Token verified successfully!');
        console.log('User data:', data?.user?.id ? 'User ID: ' + data.user.id : 'No user data');
      }
    } catch (error) {
      console.error('Exception during token verification:', error);
    }
  }

  // Set default redirect URL to dashboard
  let redirectUrl = '/dashboard';
  
  // If this is an email verification, redirect to the login page with a success message
  if (type === 'email_change' || type === 'signup' || type === 'recovery') {
    // For email verification, redirect to login with a success message
    redirectUrl = `/login?verified=true`;
  }
  
  // Log all query parameters for debugging
  requestUrl.searchParams.forEach((value, key) => {
    console.log(`- ${key}: ${value}`);
  });
  
  // Log the full URL for debugging
  console.log('Full request URL:', request.url);
  
  // Determine if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  
  // Set the base URL based on environment
  const baseUrl = isDevelopment ? getLocalAppUrl('customer') : 'https://goaveyo.com';
  
  // Construct the full redirect URL
  const finalRedirectUrl = `${baseUrl}${redirectUrl}`;
  
  console.log('Final redirect URL:', finalRedirectUrl);
  
  // Redirect the user to the appropriate page
  return NextResponse.redirect(finalRedirectUrl);
}
