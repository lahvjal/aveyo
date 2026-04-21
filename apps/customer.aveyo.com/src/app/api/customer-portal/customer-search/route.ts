import { NextResponse } from 'next/server';
import { searchPortalCustomers } from '@/lib/data-service';
import { canAccessCustomerPortalAsAdmin } from '@/lib/platform-auth/customer-portal-access';
import {
  applyPlatformSetCookieHeaders,
  fetchPlatformSessionForRequest
} from '@/lib/platform-auth/server-session';

const MAX_QUERY_LEN = 80;

export async function GET(request: Request) {
  const session = await fetchPlatformSessionForRequest(request);
  const payload = session.payload;

  if (!session.ok || !payload?.authenticated) {
    const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    applyPlatformSetCookieHeaders(response, session.setCookieHeaders);
    return response;
  }

  if (!canAccessCustomerPortalAsAdmin(payload)) {
    const response = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    applyPlatformSetCookieHeaders(response, session.setCookieHeaders);
    return response;
  }

  const { searchParams } = new URL(request.url);
  const raw = typeof searchParams.get('q') === 'string' ? searchParams.get('q')! : '';
  const q = raw.trim().slice(0, MAX_QUERY_LEN);

  const customers = await searchPortalCustomers(q);
  const response = NextResponse.json({ customers });
  applyPlatformSetCookieHeaders(response, session.setCookieHeaders);
  return response;
}
