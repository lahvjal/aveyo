import { Resend } from 'resend';
import { NextResponse } from 'next/server';

// Initialize Resend with API key from environment variables
// Fallback to empty string if not available, which will be handled in the request
const resendApiKey = process.env.RESEND_API_KEY || '';
const resend = new Resend(resendApiKey);

export async function GET() {
  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'lahvjalf@aveyo.com',
      subject: 'Hello World',
      html: '<p>Congrats on sending your <strong>first email</strong>!</p>'
    });

    if (error) {
      return NextResponse.json({ error });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error });
  }
}
