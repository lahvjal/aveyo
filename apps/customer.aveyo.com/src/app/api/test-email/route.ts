import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';
import { emailConfig } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Resend email service');
    const resendApiKey = process.env.RESEND_API_KEY;
    const hasApiKey = !!resendApiKey;
    console.log('API key present:', hasApiKey);
    if (!hasApiKey) {
      return NextResponse.json(
        { success: false, error: 'Resend API key is missing' },
        { status: 500 }
      );
    }
    const resend = new Resend(resendApiKey!);
    
    // Send a test email using Resend
    // In testing mode, Resend only allows sending to your own verified email
    const { data, error } = await resend.emails.send({
      from: emailConfig.fromAddress,
      to: 'lahvjalf@aveyo.com', // Your verified email in Resend
      subject: 'Test Email from Resend',
      html: '<p>This is a test email from Resend to verify the API key is working correctly.</p>',
    });

    if (error) {
      console.error('Resend test email error:', error);
      return NextResponse.json({ success: false, error }, { status: 500 });
    }

    console.log('Test email sent successfully:', data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Unexpected error sending test email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}
