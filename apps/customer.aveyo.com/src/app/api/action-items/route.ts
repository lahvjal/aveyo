import { NextResponse } from 'next/server';
import { getActionItems, completeActionItem } from '@/lib/data-service';
import {
  applyPlatformSetCookieHeaders,
  requireCustomerPortalDataAccess
} from '@/lib/platform-auth/server-session';

// GET - Fetch action items for the authenticated user
export async function GET(request: Request) {
  try {
    const auth = await requireCustomerPortalDataAccess(request);
    if ('response' in auth) {
      return auth.response;
    }

    if (auth.adminWithoutImpersonation) {
      const response = NextResponse.json([]);
      applyPlatformSetCookieHeaders(response, auth.session.setCookieHeaders);
      return response;
    }

    // Get projectId from query params if provided
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || undefined;
    
    // Use the data service to get action items (supports both MySQL and Supabase)
    const actionItems = await getActionItems(auth.userEmail, projectId);

    const response = NextResponse.json(actionItems);
    applyPlatformSetCookieHeaders(response, auth.session.setCookieHeaders);
    return response;
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

    const auth = await requireCustomerPortalDataAccess(request);
    if ('response' in auth) {
      return auth.response;
    }

    if (auth.adminWithoutImpersonation) {
      const response = NextResponse.json(
        { error: 'Select a customer from the admin toolbar first.' },
        { status: 403 }
      );
      applyPlatformSetCookieHeaders(response, auth.session.setCookieHeaders);
      return response;
    }

    // Use the data service to complete action item
    const success = await completeActionItem(id);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to complete action item' }, { status: 500 });
    }

    const response = NextResponse.json({ success: true });
    applyPlatformSetCookieHeaders(response, auth.session.setCookieHeaders);
    return response;
  } catch (error) {
    console.error('Error completing action item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

