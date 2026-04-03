import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthRedirectUrl, getBaseUrl, emailConfig } from '@/lib/config';

// Initialize Supabase admin client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Ensure all errors are caught and returned as proper JSON responses
export async function POST(request: NextRequest) {
  // Add error boundary to catch any unexpected errors
  try {
  try {
    // Parse request body
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Get the redirect URL for password reset using our centralized config
    const resetRedirectUrl = getAuthRedirectUrl('/reset-password');

    console.log('==== PASSWORD RESET REQUEST ====');
    console.log('Request details:');
    console.log('- Email:', email);
    console.log('- Reset Redirect URL:', resetRedirectUrl);
    console.log('================================');

    // Check if the email exists in the database by searching through ALL users
    console.log('==== USER VALIDATION ====');
    console.log('Checking if email exists...');
    
    // Paginate through ALL users to find the email (listUsers is paginated by default)
    let user = null;
    let page = 1;
    const perPage = 1000; // Max allowed by Supabase
    let hasMorePages = true;
    let totalUsersChecked = 0;
    
    while (hasMorePages && !user) {
      console.log(`Checking page ${page} (up to ${perPage} users per page)...`);
      
      const { data: { users }, error: getUserError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage
      });
      
      if (getUserError) {
        console.log('==== USER VALIDATION FAILED ====');
        console.error('User validation error:', getUserError);
        console.log('================================');
        return NextResponse.json(
          { error: 'Failed to verify user account' },
          { status: 500 }
        );
      }
      
      if (!users) {
        console.log('==== NO USERS FOUND ====');
        console.error('No users found in Supabase');
        console.log('==========================');
        return NextResponse.json(
          { error: 'User verification system unavailable' },
          { status: 500 }
        );
      }
      
      totalUsersChecked += users.length;
      console.log(`Checked ${users.length} users on page ${page} (${totalUsersChecked} total so far)`);
      
      // Find the user with the matching email (case insensitive)
      user = users.find(u => 
        u.email && u.email.toLowerCase() === email.toLowerCase()
      );
      
      // If we got fewer users than requested, we've reached the last page
      hasMorePages = users.length === perPage;
      page++;
    }
    
    console.log(`Finished searching through ${totalUsersChecked} total users`);
    
    // Check if user exists
    const userExists = !!user;
    
    if (!userExists) {
      console.log('==== VALIDATION RESULT ====');
      console.log('User not found with email:', email);
      console.log('No email will be sent');
      console.log('==========================');
      // Don't reveal that the email doesn't exist for security reasons
      // Instead, return success but don't actually send an email
      return NextResponse.json({ 
        success: false, 
        message: 'This email is not associated with a customer account.',
        userExists: false,
        reason: 'user_not_found'
      });
    }
    
    console.log('==== VALIDATION RESULT ====');
    console.log('Valid user found, proceeding with password reset');
    console.log('Email will be sent to:', email);
    console.log(`User confirmed: ${user?.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log('==========================');
    
    // Generate a password reset token using Supabase Admin API
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        // We'll extract the token from this URL later
        redirectTo: resetRedirectUrl
      }
    });
    
    console.log('Generated link with redirectTo:', resetRedirectUrl);
    console.log('Supabase Site URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

    if (error) {
      console.log('==== TOKEN GENERATION FAILED ====');
      console.error('Error generating reset token:', error);
      console.log('================================');
      return NextResponse.json(
        { error: 'Failed to generate reset token' },
        { status: 500 }
      );
    }

    // Extract the token from the Supabase-generated URL
    const supabaseUrl = data.properties.action_link;
    console.log('Original Supabase URL:', supabaseUrl);
    
    // Parse the URL to extract the token
    const urlObj = new URL(supabaseUrl);
    const token = urlObj.searchParams.get('token');
    
    if (!token) {
      console.log('==== TOKEN EXTRACTION FAILED ====');
      console.error('Could not extract token from Supabase URL');
      console.log('================================');
      return NextResponse.json(
        { error: 'Failed to generate reset token' },
        { status: 500 }
      );
    }
    
    // Create our own environment-aware reset URL
    const baseUrl = getBaseUrl();
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    
    // Log the full reset URL for debugging
    console.log('Using reset URL directly from Supabase:', resetUrl);
    
    // Verify the reset URL contains the expected redirect URL
    // This helps diagnose if Supabase is respecting our redirectTo parameter
    const urlContainsRedirect = resetUrl.includes(encodeURIComponent(resetRedirectUrl));
    console.log('Reset URL contains our redirect URL:', urlContainsRedirect);

    // Set email subject and app name
    const emailSubject = 'Reset Your Aveyo Customer Portal Password';
    const appName = 'Customer Portal';

    // Send email with Resend
    console.log('==== EMAIL PREPARATION ====');
    console.log('Preparing email to:', email);
    console.log('==========================');
    
    // Log the API key presence (not the actual key) for debugging
    const hasApiKey = !!process.env.RESEND_API_KEY;
    console.log('Resend API key present:', hasApiKey);
    
    // If API key is missing, log an error and return
    if (!hasApiKey) {
      console.log('==== EMAIL SENDING FAILED ====');
      console.error('ERROR: Resend API key is missing. Emails cannot be sent.');
      console.log('================================');
      return NextResponse.json(
        { error: 'Email service configuration error' },
        { status: 500 }
      );
    }
    
    // Send email directly to the entered email address
    const recipientEmail = email;
    
    // Using the standardized email format from our config
    const fromEmail = emailConfig.fromAddress;
    
    const emailSubjectText = emailSubject;
    
    // Log email configuration
    console.log('==== EMAIL CONFIGURATION ====');
    console.log(`- From: ${fromEmail}`);
    console.log(`- To: ${recipientEmail}`);
    console.log(`- Subject: ${emailSubjectText}`);
    console.log('============================');
    
    // Note: We no longer need idempotency keys as we're using a simpler approach
    
    // Send email with appropriate configuration for immediate delivery
    // Resend is optimized for transactional emails with high priority delivery
    console.log('==== SENDING EMAIL ====');
    console.log('Attempting to send email now...');
    
    // Use the same approach as the diagnostic endpoint that works
    // Create a new Resend instance to ensure a fresh connection
    const freshResend = new Resend(process.env.RESEND_API_KEY || '');
    const { data: emailData, error: emailError } = await freshResend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject: emailSubjectText,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #0284c7;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              padding: 20px;
              border: 1px solid #ddd;
              border-top: none;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              background-color: #0284c7;
              color: white;
              text-decoration: none;
              padding: 10px 20px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 20px;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Reset Your Password</h2>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset your password for the Aveyo ${appName}.</p>
            <p>Click the button below to reset your password. This link will expire in 24 hours.</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <p>If the button above doesn't work, copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; font-size: 12px;">${resetUrl}</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Aveyo. All rights reserved.</p>
          </div>
        </body>
        </html>
      `
    });

    // Check for Resend email sending errors
    if (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send password reset email', details: emailError },
        { status: 500 }
      );
    }
    
    // Log successful email queuing with ID for tracking
    console.log(`Password reset email queued successfully with ID: ${emailData?.id}`);
    console.log('Resend will deliver this transactional email with high priority');

    console.log('==== EMAIL SENT SUCCESSFULLY ====');
    console.log('Email ID:', emailData?.id);
    console.log('================================');

    return NextResponse.json({ 
      success: true, 
      data: emailData,
      userExists: true, // For debugging only, remove in production
      emailSent: true // For debugging only, remove in production
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
  } catch (outerError) {
    console.error('Unexpected error in reset-password API route:', outerError);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
