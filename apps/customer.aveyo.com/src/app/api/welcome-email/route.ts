import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Customer welcome-email verification has been retired. Use the secure email sign-in flow on /login.'
    },
    { status: 410 }
  );
}
