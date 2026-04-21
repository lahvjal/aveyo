import { NextResponse } from 'next/server';
import { getDocuments } from '@/lib/data-service';
import {
  applyPlatformSetCookieHeaders,
  requireCustomerPortalDataAccess
} from '@/lib/platform-auth/server-session';

// GET - Fetch documents for the authenticated user
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
    
    // Use the data service to get documents (always uses Supabase)
    const documents = await getDocuments(auth.userEmail, projectId);

    const response = NextResponse.json(documents);
    applyPlatformSetCookieHeaders(response, auth.session.setCookieHeaders);
    return response;
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

