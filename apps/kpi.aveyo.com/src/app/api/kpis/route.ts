import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedContext } from '@/lib/api-auth';
import { getServiceRoleClient } from '@/lib/supabase';
import { DASHBOARD_SECTIONS } from '@/types/kpi';
import type { CustomKPIRecord } from '@/lib/supabase';

/**
 * KPI Management API
 * 
 * Endpoint: /api/kpis
 * 
 * Manages custom KPI formulas stored in Supabase.
 * Combines built-in KPIs from code with custom KPIs from database.
 */

// GET - Fetch all KPIs (original + custom, including hidden for admin)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedContext(request);
    if (auth.errorResponse || !auth.context) {
      return auth.errorResponse!;
    }
    const supabase = getServiceRoleClient();

    // Get built-in KPIs from code (as fallback for KPIs not yet migrated)
    const builtInFromCode = DASHBOARD_SECTIONS.flatMap(section =>
      section.kpis.map(kpi => ({
        ...kpi,
        section_id: section.id,
        section_title: section.title,
        is_built_in: true,
        is_custom: false,
        is_original: true, // These are original KPIs
        is_hidden: kpi.hidden || false
      }))
    );

    let allKPIs: CustomKPIRecord[] | null = null;
    try {
      const { data, error } = await supabase
        .from('custom_kpis')
        .select('*')
        .eq('is_active', true)
        .order('section_id', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching KPIs from database:', error);
        console.log('Falling back to built-in KPIs only');
        // Don't throw - just use built-in KPIs as fallback
      } else {
        allKPIs = data;
      }
    } catch (dbError) {
      console.error('Database query failed:', dbError);
      console.log('Falling back to built-in KPIs only');
      // Continue without database KPIs
    }

    // Format database KPIs
    const formattedKPIs = (allKPIs || []).map(kpi => ({
      id: kpi.kpi_id,
      kpi_id: kpi.kpi_id, // Include both id and kpi_id for compatibility
      name: kpi.name,
      description: kpi.description || undefined,
      format: kpi.format,
      availablePeriods: kpi.available_periods,
      available_periods: kpi.available_periods,
      section_id: kpi.section_id,
      formula_type: kpi.formula_type,
      formula: kpi.formula,
      field_mappings: kpi.field_mappings,
      is_built_in: kpi.is_original, // For backwards compatibility
      is_custom: !kpi.is_original,  // For backwards compatibility
      is_original: kpi.is_original,
      is_hidden: kpi.is_hidden,
      show_goal: kpi.show_goal,
      display_order: kpi.display_order,
      secondary_formula: kpi.secondary_formula,
      secondary_format: kpi.secondary_format,
      created_at: kpi.created_at,
      updated_at: kpi.updated_at
    }));

    // Separate into original and custom
    const originalKPIs = formattedKPIs.filter(k => k.is_original);
    const customKPIs = formattedKPIs.filter(k => !k.is_original);
    
    const visibleOriginal = originalKPIs;
    const visibleCustom = customKPIs;

    // Add any built-in KPIs from code that aren't in database yet
    const dbKpiIds = new Set(formattedKPIs.map(k => k.id));
    const missingBuiltIns = builtInFromCode
      .filter(k => !dbKpiIds.has(k.id))
      .map(kpi => ({
        id: kpi.id,
        kpi_id: kpi.id,
        name: kpi.name,
        description: kpi.description || undefined,
        format: kpi.format,
        availablePeriods: kpi.availablePeriods,
        available_periods: kpi.availablePeriods,
        section_id: kpi.section_id,
        section_title: kpi.section_title,
        formula: 'Built-in formula (TypeScript)',
        formula_type: 'sql' as const,
        field_mappings: {},
        is_active: true,
        is_built_in: true,
        is_custom: false,
        is_original: true,
        is_hidden: kpi.is_hidden,
        show_goal: kpi.showGoal || false,
        display_order: 0,
        secondary_formula: null,
        secondary_format: null,
        created_by: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
    
    if (missingBuiltIns.length > 0) {
      visibleOriginal.push(...missingBuiltIns);
    }

    return NextResponse.json({
      success: true,
      kpis: {
        builtIn: visibleOriginal, // For backwards compatibility
        custom: visibleCustom,     // For backwards compatibility
        original: visibleOriginal, // New naming
        total: visibleOriginal.length + visibleCustom.length,
        hiddenCount: (originalKPIs.length - visibleOriginal.length) + (customKPIs.length - visibleCustom.length)
      }
    });

  } catch (error: any) {
    console.error('KPI API GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch KPIs', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new custom KPI
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedContext(request);
    if (auth.errorResponse || !auth.context) {
      return auth.errorResponse!;
    }
    const supabase = getServiceRoleClient();
    const { user } = auth.context;

    // Parse request body
    const body = await request.json();
    const {
      kpi_id,
      name,
      description,
      format,
      formula_type,
      formula,
      field_mappings,
      available_periods,
      section_id,
      is_original,
      is_hidden,
      show_goal,
      secondary_formula,
      secondary_format
    } = body;

    // Validate required fields
    if (!kpi_id || !name || !format || !formula_type || !formula || !section_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate format
    if (!['number', 'currency', 'percentage', 'days'].includes(format)) {
      return NextResponse.json(
        { success: false, error: 'Invalid format' },
        { status: 400 }
      );
    }

    // Validate formula_type
    if (!['sql', 'expression'].includes(formula_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid formula_type' },
        { status: 400 }
      );
    }

    // Validate secondary_format if provided
    if (secondary_format && !['count', 'breakdown', 'text'].includes(secondary_format)) {
      return NextResponse.json(
        { success: false, error: 'Invalid secondary_format' },
        { status: 400 }
      );
    }

    // Check if KPI ID already exists
    const { data: existing } = await supabase
      .from('custom_kpis')
      .select('kpi_id')
      .eq('kpi_id', kpi_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'KPI ID already exists' },
        { status: 409 }
      );
    }

    // Calculate next display_order for this section
    const { data: maxOrderKPI } = await supabase
      .from('custom_kpis')
      .select('display_order')
      .eq('section_id', section_id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();
    
    const nextDisplayOrder = maxOrderKPI ? maxOrderKPI.display_order + 1 : 1;

    // Insert new KPI with authenticated client (for RLS)
    // Note: is_original defaults to false (custom KPIs)
    // Only original KPIs seeded from migration should have is_original = true
    const { data: newKPI, error: insertError } = await supabase
      .from('custom_kpis')
      .insert({
        kpi_id,
        name,
        description: description || null,
        format,
        formula_type,
        formula,
        field_mappings: field_mappings || {},
        available_periods: available_periods || ['current_week', 'previous_week', 'mtd', 'ytd'],
        section_id,
        is_active: true,
        is_original: is_original || false, // Explicitly set, defaults to false
        is_hidden: is_hidden || false,
        show_goal: show_goal || false,
        display_order: nextDisplayOrder,
        secondary_formula: secondary_formula || null,
        secondary_format: secondary_format || null,
        created_by: user.id
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating KPI:', insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      kpi: newKPI,
      message: 'KPI created successfully'
    });

  } catch (error: any) {
    console.error('KPI API POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create KPI', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update existing custom KPI
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedContext(request);
    if (auth.errorResponse || !auth.context) {
      return auth.errorResponse!;
    }
    const supabase = getServiceRoleClient();

    // Parse request body
    const body = await request.json();
    const { kpi_id, ...updates } = body;

    if (!kpi_id) {
      return NextResponse.json(
        { success: false, error: 'KPI ID required' },
        { status: 400 }
      );
    }

    // Fetch existing KPI to check if it's original
    const { data: existingKPI, error: fetchError } = await supabase
      .from('custom_kpis')
      .select('*')
      .eq('kpi_id', kpi_id)
      .single();

    if (fetchError || !existingKPI) {
      return NextResponse.json(
        { success: false, error: 'KPI not found' },
        { status: 404 }
      );
    }

    // Prevent changing is_original flag on existing original KPIs
    if (existingKPI.is_original && updates.is_original === false) {
      return NextResponse.json(
        { success: false, error: 'Cannot change original KPI to custom KPI' },
        { status: 403 }
      );
    }

    // Validate format if being updated
    if (updates.format && !['number', 'currency', 'percentage', 'days'].includes(updates.format)) {
      return NextResponse.json(
        { success: false, error: 'Invalid format' },
        { status: 400 }
      );
    }

    // Validate formula_type if being updated
    if (updates.formula_type && !['sql', 'expression'].includes(updates.formula_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid formula_type' },
        { status: 400 }
      );
    }

    // Validate secondary_format if being updated
    if (updates.secondary_format && !['count', 'breakdown', 'text'].includes(updates.secondary_format)) {
      return NextResponse.json(
        { success: false, error: 'Invalid secondary_format' },
        { status: 400 }
      );
    }

    // Update KPI with authenticated client (for RLS)
    const { data: updatedKPI, error: updateError } = await supabase
      .from('custom_kpis')
      .update(updates)
      .eq('kpi_id', kpi_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating KPI:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      kpi: updatedKPI,
      message: 'KPI updated successfully'
    });

  } catch (error: any) {
    console.error('KPI API PUT Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update KPI', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete custom KPI
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedContext(request);
    if (auth.errorResponse || !auth.context) {
      return auth.errorResponse!;
    }
    const supabase = getServiceRoleClient();

    // Get KPI ID from query params
    const searchParams = request.nextUrl.searchParams;
    const kpi_id = searchParams.get('kpi_id');

    if (!kpi_id) {
      return NextResponse.json(
        { success: false, error: 'KPI ID required' },
        { status: 400 }
      );
    }

    // Fetch the KPI to check if it's original
    const { data: kpi, error: fetchError } = await supabase
      .from('custom_kpis')
      .select('is_original')
      .eq('kpi_id', kpi_id)
      .single();

    if (fetchError || !kpi) {
      return NextResponse.json(
        { success: false, error: 'KPI not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of original KPIs
    if (kpi.is_original) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete original KPIs. Set is_active=false to hide instead.' 
        },
        { status: 403 }
      );
    }

    // Soft delete by setting is_active to false (with authenticated client for RLS)
    const { error: deleteError } = await supabase
      .from('custom_kpis')
      .update({ is_active: false })
      .eq('kpi_id', kpi_id);

    if (deleteError) {
      console.error('Error deleting KPI:', deleteError);
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'KPI deleted successfully'
    });

  } catch (error: any) {
    console.error('KPI API DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete KPI', details: error.message },
      { status: 500 }
    );
  }
}
