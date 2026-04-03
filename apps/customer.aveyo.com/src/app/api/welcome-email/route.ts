import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthRedirectUrl, getBaseUrl, emailConfig } from '@/lib/config';

// Initialize Supabase admin client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Get base URL from centralized config
    const baseUrl = getBaseUrl();
    
    console.log('Using base URL for verification link:', baseUrl);

    console.log('==== WELCOME EMAIL REQUEST ====');
    console.log('Request details:');
    console.log('- Email:', email);
    console.log('- Base URL:', baseUrl);
    console.log('================================');

    // Verify the user exists
    console.log('==== USER VALIDATION ====');
    console.log('Checking if email exists...');
    
    // Get user by email
    const { data: { users }, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (getUserError) {
      console.log('==== USER VALIDATION FAILED ====');
      console.error('User validation error:', getUserError);
      console.log('================================');
      return NextResponse.json(
        { error: 'Failed to verify user account' },
        { status: 500 }
      );
    }
    
    if (!users || users.length === 0) {
      console.log('==== NO USERS FOUND ====');
      console.error('No users found in Supabase');
      console.log('==========================');
      return NextResponse.json(
        { error: 'User verification system unavailable' },
        { status: 500 }
      );
    }
    
    // Find the user with the matching email (case insensitive)
    const user = users.find(user => 
      user.email && user.email.toLowerCase() === email.toLowerCase()
    );
    
    // Check if user exists
    const userExists = !!user;
    
    if (!userExists) {
      console.log('==== VALIDATION RESULT ====');
      console.log('User not found:', email);
      console.log('No email will be sent');
      console.log('==========================');
      return NextResponse.json({ 
        success: false, 
        message: 'This email is not associated with a customer account.',
        userExists: userExists
      });
    }
    
    // Generate email verification link if the user is not confirmed yet
    let verificationUrl = '';
    
    if (!user.email_confirmed_at) {
      console.log('Using redirectDomain for generateLink:', baseUrl);
      
      // Generate a verification link using Supabase Admin API
      // For email confirmation, we need to use the magiclink type
      // This will create a link that will confirm the user's email when clicked
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          // Use centralized config for consistent URL handling
          redirectTo: getAuthRedirectUrl('/auth/callback')
        }
      });
      
      console.log('Generated link with redirectTo:', getAuthRedirectUrl('/auth/callback'));

      if (error) {
        console.log('==== TOKEN GENERATION FAILED ====');
        console.error('Error generating verification token:', error);
        console.log('================================');
        return NextResponse.json(
          { error: 'Failed to generate verification token' },
          { status: 500 }
        );
      }

      // Get the original Supabase verification link - we'll use this directly
      // since we've already set the correct redirectTo when generating the link
      verificationUrl = data.properties.action_link;
      
      console.log('Using verification URL directly from Supabase:', verificationUrl);
      
      // Parse the URL to verify the redirect_to parameter is set correctly
      const verificationUrlObj = new URL(verificationUrl);
      console.log('Verification URL redirect_to parameter:', verificationUrlObj.searchParams.get('redirect_to'));
    } else {
      // User is already confirmed, just create a login link
      verificationUrl = `${baseUrl}/login`;
      console.log('User already verified, using login URL:', verificationUrl);
    }

    // Send welcome email with Resend
    console.log('==== EMAIL PREPARATION ====');
    console.log('Preparing welcome email to:', email);
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
    
    // Send email directly to the user's email address
    const recipientEmail = email;
    
    // Using the standardized email format from our config
    const fromEmail = emailConfig.fromAddress;
    
    const emailSubject = 'Welcome to Aveyo Customer Portal';
    
    // Log email configuration
    console.log('==== EMAIL CONFIGURATION ====');
    console.log(`- From: ${fromEmail}`);
    console.log(`- To: ${recipientEmail}`);
    console.log(`- Subject: ${emailSubject}`);
    console.log('============================')
    
    // Send email with appropriate configuration
    console.log('==== SENDING EMAIL ====');
    console.log('Attempting to send welcome email now...');
    
    // Create a new Resend instance to ensure a fresh connection
    const freshResend = new Resend(process.env.RESEND_API_KEY || '');
    const { data: emailData, error: emailError } = await freshResend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject: emailSubject,
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
            <h2>Welcome to Aveyo Customer Portal</h2>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Thank you for registering with the Aveyo Customer Portal! We're excited to have you on board.</p>
            ${!user.email_confirmed_at ? `
              <p>Please confirm your email address by clicking the button below:</p>
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </p>
              <p>If the button above doesn't work, copy and paste this URL into your browser:</p>
              <p style="word-break: break-all; font-size: 12px;">${verificationUrl}</p>
            ` : `
              <p>Your account is now active. You can access your solar installation progress and important documents through the Customer Portal.</p>
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Go to Customer Portal</a>
              </p>
            `}
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            <p>Best regards,<br>The Aveyo Team</p>
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
      console.error('Failed to send welcome email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send welcome email', details: emailError },
        { status: 500 }
      );
    }
    
    // Log successful email queuing with ID for tracking
    console.log(`Welcome email queued successfully with ID: ${emailData?.id}`);

    console.log('==== EMAIL SENT SUCCESSFULLY ====');
    console.log('Email ID:', emailData?.id);
    console.log('================================');

    return NextResponse.json({ 
      success: true, 
      data: emailData,
      userExists: true,
      emailSent: true
    });
  } catch (error) {
    console.error('Welcome email error:', error);
    return NextResponse.json(
      { error: 'Failed to process welcome email request' },
      { status: 500 }
    );
  }
}
