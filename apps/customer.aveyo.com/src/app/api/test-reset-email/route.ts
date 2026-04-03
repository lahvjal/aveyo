import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthRedirectUrl } from '@/lib/config';

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin environment configuration');
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();
    
    console.log('==== TEST PASSWORD RESET REQUEST ====');
    console.log('Request details:');
    console.log('- Email:', email);
    console.log('================================');

    // Use our centralized config to get the reset URL for the current environment
    const resetUrl = getAuthRedirectUrl('/reset-password');
    
    console.log('Using reset redirect URL:', resetUrl);
    console.log('Supabase Site URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    // Generate a password reset token using Supabase Admin API
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: resetUrl
      }
    });

    if (error) {
      console.log('==== TOKEN GENERATION FAILED ====');
      console.error('Error generating reset token:', error);
      console.log('================================');
      return NextResponse.json(
        { error: 'Failed to generate reset token' },
        { status: 500 }
      );
    }

    // Get the action_link directly from Supabase
    const resetLink = data.properties.action_link;
    
    console.log('==== TEST RESET LINK GENERATED ====');
    console.log('Reset link:', resetLink);
    console.log('================================');

    return NextResponse.json({ 
      success: true, 
      resetLink: resetLink,
      message: 'Copy this link and use it in your browser to test password reset'
    });
  } catch (error) {
    console.error('Test password reset error:', error);
    return NextResponse.json(
      { error: 'Failed to process test password reset request' },
      { status: 500 }
    );
  }
}
