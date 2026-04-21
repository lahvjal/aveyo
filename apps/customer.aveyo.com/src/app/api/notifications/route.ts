import { NextResponse } from 'next/server';
import { getNotifications, markNotificationAsRead } from '@/lib/data-service';
import {
  applyPlatformSetCookieHeaders,
  requireCustomerPortalDataAccess
} from '@/lib/platform-auth/server-session';

// GET - Fetch notifications for the authenticated user
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

    // Use the data service to get notifications (supports both MySQL and Supabase)
    const notifications = await getNotifications(auth.userEmail);

    const response = NextResponse.json(notifications);
    applyPlatformSetCookieHeaders(response, auth.session.setCookieHeaders);
    return response;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Mark a notification as read
export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
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

    // Use the data service to mark notification as read
    const success = await markNotificationAsRead(id);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
    }

    const response = NextResponse.json({ success: true });
    applyPlatformSetCookieHeaders(response, auth.session.setCookieHeaders);
    return response;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

