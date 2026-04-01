import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedContext } from '@/lib/api-auth';
import { invalidateGoalsCache } from '@/lib/kpi-service';
import { clearKPICache } from '@/lib/cache-utils';
import { getServiceRoleClient } from '@/lib/supabase';

/**
 * Goals API Routes (Supabase Version)
 * 
 * GET /api/goals - Retrieve all goals
 * POST /api/goals - Update goals (requires authentication)
 */

// GET - Retrieve all goals
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedContext(request);
    if (auth.errorResponse || !auth.context) {
      return auth.errorResponse!;
    }
    const supabase = getServiceRoleClient();

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .order('kpi_id', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    // Transform database rows into goals object structure
    const goals: Record<string, Record<string, number>> = {};
    
    data?.forEach((row: any) => {
      if (!goals[row.kpi_id]) {
        goals[row.kpi_id] = {};
      }
      goals[row.kpi_id][row.period] = parseFloat(row.value);
    });
    
    return NextResponse.json({
      success: true,
      goals,
    });
  } catch (error: any) {
    console.error('Error reading goals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read goals', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Update goals (requires authentication)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedContext(request);
    if (auth.errorResponse || !auth.context) {
      return auth.errorResponse!;
    }

    const supabase = getServiceRoleClient();
    const body = await request.json();
    const { goals } = body;
    
    if (!goals || typeof goals !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid goals data' },
        { status: 400 }
      );
    }
    
    // Validate goals structure
    const validKpis = [
      'total_sales',
      'installs_complete',
      'avg_days_pp_to_install',
      'avg_days_install_to_m2',
      'avg_days_pp_to_pto',
      'total_kw_scheduled',
      'total_kw_installed',
    ];
    
    const validPeriods = ['current_week', 'previous_week', 'mtd', 'ytd', 'next_week'];
    
    // Prepare data for upsert
    const upsertData: Array<{ kpi_id: string; period: string; value: number }> = [];
    
    for (const [kpiId, periods] of Object.entries(goals)) {
      if (!validKpis.includes(kpiId)) {
        return NextResponse.json(
          { success: false, error: `Invalid KPI ID: ${kpiId}` },
          { status: 400 }
        );
      }
      
      if (typeof periods !== 'object') {
        return NextResponse.json(
          { success: false, error: `Invalid periods for KPI: ${kpiId}` },
          { status: 400 }
        );
      }
      
      for (const [period, value] of Object.entries(periods as Record<string, any>)) {
        if (!validPeriods.includes(period)) {
          return NextResponse.json(
            { success: false, error: `Invalid period: ${period}` },
            { status: 400 }
          );
        }
        
        if (typeof value !== 'number' || value < 0) {
          return NextResponse.json(
            { success: false, error: `Invalid value for ${kpiId}.${period}: must be a positive number` },
            { status: 400 }
          );
        }
        
        upsertData.push({
          kpi_id: kpiId,
          period,
          value,
        });
      }
    }
    
    // Upsert goals using the authenticated client so RLS policies apply
    const { error: upsertError } = await supabase
      .from('goals')
      .upsert(upsertData, {
        onConflict: 'kpi_id,period',
      });
    
    if (upsertError) {
      throw upsertError;
    }
    
    // Invalidate both caches so updated goals appear right away
    invalidateGoalsCache();
    clearKPICache();
    console.log('Goals saved and all caches invalidated');
    
    return NextResponse.json({
      success: true,
      message: 'Goals updated successfully',
      goals,
    });
    
  } catch (error: any) {
    console.error('Error updating goals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update goals', details: error.message },
      { status: 500 }
    );
  }
}
