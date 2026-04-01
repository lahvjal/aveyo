import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl, emailConfig, isDevelopment } from '@/lib/config';

// Initialize Resend with API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY || '');

export async function GET(request: NextRequest) {
  try {
    // Check if API key is present
    const hasApiKey = !!process.env.RESEND_API_KEY;
    
    // Get environment information from centralized config
    const baseUrl = getBaseUrl();
    
    // Diagnostic information
    const diagnosticInfo = {
      hasResendApiKey: hasApiKey,
      environment: process.env.NODE_ENV || 'undefined',
      baseUrl,
      resendApiKeyLength: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.length : 0,
      fromDomain: 'send.goaveyo.com',
      isDevelopmentMode: isDevelopment,
      timestamp: new Date().toISOString()
    };
    
    // If no API key, return diagnostic info only
    if (!hasApiKey) {
      console.error('ERROR: Resend API key is missing. Emails cannot be sent.');
      return NextResponse.json({ 
        success: false, 
        error: 'Resend API key is missing',
        diagnosticInfo 
      }, { status: 500 });
    }
    
    // Test sending an email using the standardized email format from our config
    const fromEmail = emailConfig.fromAddress;
    const recipientEmail = isDevelopment ? 'lahvjalf@aveyo.com' : 'lahvjalf@aveyo.com';
    
    console.log('Attempting to send diagnostic test email...');
    console.log(`From: ${fromEmail}`);
    console.log(`To: ${recipientEmail}`);
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject: `Email Diagnostic Test - ${new Date().toLocaleTimeString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h2>Email Diagnostic Test</h2>
          <p>This is a diagnostic test email from the Aveyo Customer Portal.</p>
          <p>If you're receiving this email, it means the email sending functionality is working correctly.</p>
          <h3>Diagnostic Information:</h3>
          <pre>${JSON.stringify(diagnosticInfo, null, 2)}</pre>
          <p>Timestamp: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending diagnostic email:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      return NextResponse.json({
        success: false,
        error: 'Failed to send diagnostic email',
        errorDetails: error,
        diagnosticInfo
      }, { status: 500 });
    }

    console.log('Diagnostic email sent successfully:', data?.id);
    
    return NextResponse.json({
      success: true,
      message: 'Diagnostic email sent successfully',
      emailId: data?.id,
      diagnosticInfo
    });
  } catch (error) {
    console.error('Unexpected error in email diagnostic:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Unexpected error in email diagnostic',
      errorDetails: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
