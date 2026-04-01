import { NextRequest, NextResponse } from 'next/server';
import { getKPIValue } from '@/lib/kpi-service';
import { testConnection } from '@/lib/db';
import { TimePeriod, KPIValue } from '@/types/kpi';
import { getCachedValue, setCachedValue } from '@/lib/cache-utils';
import { requireAuthenticatedContext } from '@/lib/api-auth';

/**
 * KPI API Route
 * 
 * Endpoint: /api/kpi
 * 
 * Query params:
 * - kpiId: string (required) - The KPI identifier
 * - period: TimePeriod (required) - The time period for the KPI
 * 
 * Example: /api/kpi?kpiId=total_sales&period=current_week
 */

// GET /api/kpi?kpiId=xxx&period=xxx
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedContext(request);
    if (auth.errorResponse || !auth.context) {
      return auth.errorResponse!;
    }

    const searchParams = request.nextUrl.searchParams;
    const kpiId = searchParams.get('kpiId');
    const period = searchParams.get('period') as TimePeriod;
    
    // Validate required parameters
    if (!kpiId) {
      return NextResponse.json(
        { error: 'Missing required parameter: kpiId' },
        { status: 400 }
      );
    }
    
    if (!period) {
      return NextResponse.json(
        { error: 'Missing required parameter: period' },
        { status: 400 }
      );
    }
    
    // Validate period value
    const validPeriods: TimePeriod[] = ['current_week', 'previous_week', 'mtd', 'ytd', 'next_week'];
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        { error: `Invalid period. Must be one of: ${validPeriods.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Check cache first
    const cached = getCachedValue(kpiId, period);
    if (cached) {
      return NextResponse.json({
        kpiId,
        period,
        data: cached,
        cached: true,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Fetch from database
    const data = await getKPIValue(kpiId, period);
    
    // Cache the result
    setCachedValue(kpiId, period, data);
    
    return NextResponse.json({
      kpiId,
      period,
      data,
      cached: false,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('KPI API Error:', error);
    
    // Handle specific error types
    if (error.message?.includes('Unknown KPI ID')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    
    // Database connection errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: 'Database connection failed. Please check your connection settings.' },
        { status: 503 }
      );
    }
    
    // Generic error response
    return NextResponse.json(
      { error: 'An error occurred while fetching KPI data', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/kpi/batch - Fetch multiple KPIs at once
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedContext(request);
    if (auth.errorResponse || !auth.context) {
      return auth.errorResponse!;
    }

    const body = await request.json();
    const { kpis } = body;
    
    if (!kpis || !Array.isArray(kpis)) {
      return NextResponse.json(
        { error: 'Request body must contain a "kpis" array' },
        { status: 400 }
      );
    }
    
    // Validate each KPI request
    for (const kpi of kpis) {
      if (!kpi.kpiId || !kpi.period) {
        return NextResponse.json(
          { error: 'Each KPI must have kpiId and period' },
          { status: 400 }
        );
      }
    }
    
    // Fetch all KPIs in parallel
    const results = await Promise.allSettled(
      kpis.map(async ({ kpiId, period }: { kpiId: string; period: TimePeriod }) => {
        // Check cache first
        const cached = getCachedValue(kpiId, period);
        if (cached) {
          return { kpiId, period, data: cached, cached: true };
        }
        
        // Fetch from database
        const data = await getKPIValue(kpiId, period);
        setCachedValue(kpiId, period, data);
        
        return { kpiId, period, data, cached: false };
      })
    );
    
    // Separate successful and failed requests
    const successful = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<any>).value);
    
    const failed = results
      .map((r, i) => ({ result: r, index: i }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ result, index }) => ({
        kpiId: kpis[index].kpiId,
        period: kpis[index].period,
        error: (result as PromiseRejectedResult).reason?.message || 'Unknown error',
      }));
    
    return NextResponse.json({
      successful,
      failed,
      total: kpis.length,
      successCount: successful.length,
      failureCount: failed.length,
    });
    
  } catch (error: any) {
    console.error('KPI Batch API Error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing batch KPI request', details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/kpi/health - Health check endpoint
export async function HEAD(request: NextRequest) {
  try {
    const isConnected = await testConnection();
    
    if (isConnected) {
      return new NextResponse(null, { status: 200 });
    } else {
      return new NextResponse(null, { status: 503 });
    }
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}
