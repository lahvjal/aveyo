import { NextRequest, NextResponse } from 'next/server';
import { executeCustomKPI } from '@/lib/kpi-service';
import type { TimePeriod } from '@/types/kpi';
import { requireAuthenticatedContext } from '@/lib/api-auth';

/**
 * KPI Formula Test API
 * 
 * Endpoint: /api/kpi/test
 * 
 * POST - Test a custom KPI formula without saving it
 * Body:
 * - formula: string (required) - The formula to test
 * - formula_type: 'sql' | 'expression' (required)
 * - format: 'number' | 'currency' | 'percentage' | 'days' (required)
 * - field_mappings: Record<string, any> (required)
 * - period: TimePeriod (required)
 * - secondary_formula?: string (optional)
 */

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedContext(request);
    if (auth.errorResponse || !auth.context) {
      return auth.errorResponse!;
    }

    const body = await request.json();
    const { formula, formula_type, format, field_mappings, period, secondary_formula } = body;
    
    // Validate required fields
    if (!formula) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: formula' },
        { status: 400 }
      );
    }
    
    if (!formula_type || !['sql', 'expression'].includes(formula_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing formula_type. Must be "sql" or "expression"' },
        { status: 400 }
      );
    }
    
    if (!format || !['number', 'currency', 'percentage', 'days'].includes(format)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing format' },
        { status: 400 }
      );
    }
    
    if (!period) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: period' },
        { status: 400 }
      );
    }
    
    // Validate period value
    const validPeriods: TimePeriod[] = ['current_week', 'previous_week', 'mtd', 'ytd', 'next_week'];
    if (!validPeriods.includes(period as TimePeriod)) {
      return NextResponse.json(
        { success: false, error: `Invalid period. Must be one of: ${validPeriods.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Create a temporary KPI definition for testing
    const testKPI = {
      id: 'test_kpi_formula',
      kpi_id: 'test_kpi_formula',
      name: 'Test KPI',
      description: 'Test KPI for formula validation',
      formula,
      formula_type,
      format,
      field_mappings: field_mappings || {},
      section_id: 'test',
      available_periods: [period],
      is_active: true,
      is_original: false,
      is_hidden: true,
      show_goal: false,
      display_order: 0,
      secondary_formula: secondary_formula || null,
      secondary_format: null,
      created_by: 'test',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Execute the custom KPI formula
    const result = await executeCustomKPI(testKPI, period as TimePeriod);
    
    return NextResponse.json({
      success: true,
      result: {
        value: result.value,
        formatted: result.formatted,
        secondaryValue: result.secondaryValue,
        secondaryFormatted: result.secondaryFormatted,
        status: result.status,
        trend: result.trend,
        trendValue: result.trendValue
      },
      message: 'Formula test successful'
    });
    
  } catch (error: any) {
    console.error('KPI Formula Test Error:', error);
    
    // Provide detailed error information for debugging
    return NextResponse.json(
      {
        success: false,
        error: 'Formula test failed',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
