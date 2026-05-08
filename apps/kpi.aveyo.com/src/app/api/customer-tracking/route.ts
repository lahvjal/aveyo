import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedContext } from '@/lib/api-auth';
import { getCustomerTrackingData } from '@/lib/customer-tracking-service';

/**
 * GET /api/customer-tracking
 *
 * Query params:
 *   dateFrom  – ISO date string (YYYY-MM-DD). Required to get dateRangeCount.
 *   dateTo    – ISO date string (YYYY-MM-DD). Required to get dateRangeCount.
 *
 * Returns:
 *   liveCount          – customers whose last_sign_in_at is within the last 30 minutes
 *   liveWindowMinutes  – the window size (always 30)
 *   dateRangeCount     – customers last active in [dateFrom, dateTo] (null if params absent)
 *   totalCustomers     – total distinct customer emails in project-data
 *   milestoneBreakdown – customer counts per project milestone stage
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedContext(request);
    if (auth.errorResponse || !auth.context) {
      return auth.errorResponse!;
    }

    const { searchParams } = request.nextUrl;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Validate date params if provided
    if (dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
      return NextResponse.json(
        { error: 'Invalid dateFrom format. Expected YYYY-MM-DD.' },
        { status: 400 }
      );
    }
    if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      return NextResponse.json(
        { error: 'Invalid dateTo format. Expected YYYY-MM-DD.' },
        { status: 400 }
      );
    }
    if ((dateFrom && !dateTo) || (!dateFrom && dateTo)) {
      return NextResponse.json(
        { error: 'Both dateFrom and dateTo are required for date range queries.' },
        { status: 400 }
      );
    }

    const data = await getCustomerTrackingData({ dateFrom, dateTo });

    return NextResponse.json({
      ...data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Customer tracking API error:', error);

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: 'Database connection failed.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch customer tracking data.', details: error.message },
      { status: 500 }
    );
  }
}
