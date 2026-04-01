import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedContext } from '@/lib/api-auth';
import { getServiceRoleClient } from '@/lib/supabase';

/**
 * Section Order API
 * 
 * GET - Fetch section order
 * POST - Update section order
 */

// GET - Fetch section order
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedContext(request);
    if (auth.errorResponse || !auth.context) {
      return auth.errorResponse!;
    }
    const supabase = getServiceRoleClient();

    const { data: sections, error } = await supabase
      .from('section_order')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching section order:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sections: sections || []
    });

  } catch (error: any) {
    console.error('Section Order API GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch section order', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Update section order
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
    const { sections } = body;

    if (!sections || !Array.isArray(sections)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: sections array required' },
        { status: 400 }
      );
    }

    // Update each section's display order
    const updates = sections.map((section, index) => ({
      section_id: section.section_id,
      display_order: index + 1,
      is_active: section.is_active !== undefined ? section.is_active : true,
      updated_by: user.id
    }));

    // Use upsert to insert or update
    const { error: upsertError } = await supabase
      .from('section_order')
      .upsert(updates, { 
        onConflict: 'section_id',
        ignoreDuplicates: false 
      });

    if (upsertError) {
      console.error('Error updating section order:', upsertError);
      return NextResponse.json(
        { success: false, error: upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Section order updated successfully'
    });

  } catch (error: any) {
    console.error('Section Order API POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update section order', details: error.message },
      { status: 500 }
    );
  }
}
