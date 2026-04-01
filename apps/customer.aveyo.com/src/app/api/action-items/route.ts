import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getActionItems, completeActionItem } from '@/lib/data-service';

// GET - Fetch action items for the authenticated user
export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userEmail = session.user.email;
    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }
    
    // Get projectId from query params if provided
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || undefined;
    
    // Use the data service to get action items (supports both MySQL and Supabase)
    const actionItems = await getActionItems(userEmail, projectId);
    
    return NextResponse.json(actionItems);
  } catch (error) {
    console.error('Error fetching action items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Complete an action item
export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Action item ID is required' }, { status: 400 });
    }
    
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Use the data service to complete action item
    const success = await completeActionItem(id);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to complete action item' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error completing action item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

