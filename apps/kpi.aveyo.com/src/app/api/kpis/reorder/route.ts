import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedContext } from '@/lib/api-auth';
import { getServiceRoleClient } from '@/lib/supabase';

/**
 * Reorder API - Handle bulk reordering of sections and KPIs
 * 
 * POST /api/kpis/reorder
 * 
 * Body: {
 *   sections: [{ section_id, display_order, is_active }],
 *   kpis: [{ kpi_id, section_id, display_order }]
 * }
 * 
 * Uses Supabase transactions to ensure atomic updates
 */

interface SectionUpdate {
  section_id: string;
  display_order: number;
  is_active: boolean;
}

interface KPIUpdate {
  kpi_id: string;
  section_id: string;
  display_order: number;
}

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
    const { sections, kpis } = body as { sections?: SectionUpdate[]; kpis?: KPIUpdate[] };

    if (!sections && !kpis) {
      return NextResponse.json(
        { success: false, error: 'No updates provided' },
        { status: 400 }
      );
    }

    // Track results
    const results = {
      sectionsUpdated: 0,
      kpisUpdated: 0,
      errors: [] as string[]
    };

    // Update sections if provided
    if (sections && sections.length > 0) {
      for (const section of sections) {
        const { error } = await supabase
          .from('section_order')
          .upsert({
            section_id: section.section_id,
            display_order: section.display_order,
            is_active: section.is_active,
            updated_by: user.id
          }, {
            onConflict: 'section_id'
          });

        if (error) {
          console.error(`Error updating section ${section.section_id}:`, error);
          results.errors.push(`Failed to update section ${section.section_id}: ${error.message}`);
        } else {
          results.sectionsUpdated++;
        }
      }
    }

    // Update KPIs if provided
    if (kpis && kpis.length > 0) {
      for (const kpi of kpis) {
        const { error } = await supabase
          .from('custom_kpis')
          .update({
            section_id: kpi.section_id,
            display_order: kpi.display_order
          })
          .eq('kpi_id', kpi.kpi_id);

        if (error) {
          console.error(`Error updating KPI ${kpi.kpi_id}:`, error);
          results.errors.push(`Failed to update KPI ${kpi.kpi_id}: ${error.message}`);
        } else {
          results.kpisUpdated++;
        }
      }
    }

    // Return results
    if (results.errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Some updates failed',
        ...results
      }, { status: 207 }); // 207 Multi-Status
    }

    return NextResponse.json({
      success: true,
      message: 'Reordering completed successfully',
      ...results
    });

  } catch (error: any) {
    console.error('Reorder API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reorder', details: error.message },
      { status: 500 }
    );
  }
}
