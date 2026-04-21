import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const redirectUrl = new URL('/login', request.url);
  return NextResponse.redirect(redirectUrl);
}
