import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl, getAuthRedirectUrl, emailConfig } from '@/lib/config';
import { prisma } from '@/lib/mysql/client';

// Initialize Supabase admin client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { email, password, user_type = 'customer' } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    console.log('==== USER REGISTRATION REQUEST ====');
    console.log('Request details:');
    console.log('- Email:', email);
    console.log('================================');

    // Check if email exists in MySQL project-data table
    console.log('Checking if email exists in MySQL project-data table...');
    
    try {
      // MySQL comparison is case-insensitive by default for string columns
      const projectData = await prisma.projectData.findFirst({
        where: {
          email: email,
          isDeleted: false, // Only check non-deleted projects
        },
        select: {
          email: true,
          projectTitle: true,
        },
      });

      // If no records found, email is not associated with any projects
      if (!projectData) {
        console.log('Email not found in project-data table:', email);
        return NextResponse.json(
          { error: 'This email address is not in our system. Please check that you spelled your email correctly or try another email. If you believe this is an error, please contact our support team.' },
          { status: 400 }
        );
      }

      console.log('Email found in project-data table, proceeding with registration...');
      console.log('Associated project:', projectData.projectTitle || 'N/A');
    } catch (dbError) {
      console.error('Error checking project-data table:', dbError);
      return NextResponse.json(
        { error: 'Error validating email' },
        { status: 500 }
      );
    }

    // Create the user using admin API
    // This bypasses the automatic email confirmation process
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Don't mark email as confirmed yet
      user_metadata: {
        user_type
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      );
    }

    console.log('User created successfully:', userData.user.id);

    // Get the base URL from our centralized config
    const baseUrl = getBaseUrl();
    
    console.log('Using base URL for verification link:', baseUrl);
    
    // Use our centralized config for auth redirect URL
    const redirectUrl = getAuthRedirectUrl('/auth/callback');
    
    console.log('Redirect URL for verification:', redirectUrl);
    // Using centralized config for URLs
    
    // Generate email verification link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        redirectTo: redirectUrl
      }
    });

    if (linkError) {
      console.error('Error generating verification link:', linkError);
      return NextResponse.json(
        { error: 'Failed to generate verification link' },
        { status: 500 }
      );
    }

    // Extract the token from the Supabase verification link
    const supabaseVerificationUrl = linkData.properties.action_link;
    console.log('Original Supabase verification URL:', supabaseVerificationUrl);
    
    // Parse the Supabase URL to extract the token
    // Note: Supabase's generateLink returns 'token' parameter, which we use as 'token_hash' in verifyOtp
    const supabaseUrlObj = new URL(supabaseVerificationUrl);
    const token = supabaseUrlObj.searchParams.get('token');
    const type = supabaseUrlObj.searchParams.get('type');
    
    console.log('Extracted token:', token ? 'present' : 'missing');
    console.log('Extracted type:', type);
    
    if (!token) {
      console.error('Could not extract token from Supabase verification URL');
      return NextResponse.json(
        { error: 'Failed to generate verification link' },
        { status: 500 }
      );
    }
    
    // Create a custom verification URL using your domain
    // We pass the token as 'token_hash' because that's what Supabase expects in the callback
    const verificationUrl = `${baseUrl}/auth/callback?token_hash=${token}&type=${type}&redirect_to=${encodeURIComponent(redirectUrl)}`;
    
    console.log('Using custom verification URL with your domain:', verificationUrl);
    // Using centralized config for redirect URL

    // Send welcome email with verification link
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
    console.log('============================');
    
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
            <p>Please confirm your email address by clicking the button below:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>
            <p>If the button above doesn't work, copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; font-size: 12px;">${verificationUrl}</p>
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
      user: {
        id: userData.user.id,
        email: userData.user.email,
        user_type
      },
      emailSent: true
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process registration request' },
      { status: 500 }
    );
  }
}
