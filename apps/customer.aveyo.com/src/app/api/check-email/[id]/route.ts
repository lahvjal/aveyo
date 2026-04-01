import { NextResponse } from 'next/server';

// Temporarily commenting out the check-email API route handler to fix build issues
// Will be properly implemented after successful deployment

export async function GET() {
  return NextResponse.json({ message: 'Email status check temporarily disabled' }, { status: 200 });
}
