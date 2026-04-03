import { Resend } from 'resend';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ error: 'Resend API key is missing' }, { status: 500 });
    }
    const resend = new Resend(resendApiKey);
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
