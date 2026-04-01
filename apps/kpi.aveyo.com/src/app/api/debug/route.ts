import { NextRequest, NextResponse } from 'next/server';
import { getPoolStats } from '@/lib/db';
import { requireAuthenticatedContext } from '@/lib/api-auth';

/**
 * Debug endpoint to help diagnose data discrepancies
 * GET /api/debug
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedContext(request);
    if (auth.errorResponse || !auth.context) {
      return auth.errorResponse!;
    }

    const poolStats = await getPoolStats();
    
    return NextResponse.json({
      environment: {
        nodeEnv: process.env.NODE_ENV,
        dbHost: process.env.DB_HOST ? `${process.env.DB_HOST}:${process.env.DB_PORT}` : 'Not set',
        dbName: process.env.DB_NAME || 'Not set',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        serverTime: new Date().toISOString(),
        serverTimeLocal: new Date().toString(),
      },
      database: {
        poolStats,
      },
      cache: {
        duration: '15 minutes',
        type: 'In-memory (per instance)',
        note: 'Each server instance has its own cache',
      },
      instructions: {
        syncData: 'To ensure both staging and localhost show the same data:',
        steps: [
          '1. Verify both environments use the same DB_HOST and DB_NAME',
          '2. Click "Refresh Data" button to clear server-side cache and refetch',
          '3. Compare serverTime - if times are >15 minutes apart, caches may be out of sync',
          '4. Check if staging is on the same git commit as localhost',
        ],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch debug info', details: error.message },
      { status: 500 }
    );
  }
}

