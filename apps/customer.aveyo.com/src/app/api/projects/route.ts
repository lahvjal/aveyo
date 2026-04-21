import { NextResponse } from 'next/server';
import { getProjects, getProjectById } from '@/lib/data-service';
import { emailsMatchForPortal } from '@/lib/platform-auth/customer-portal-access';
import {
  applyPlatformSetCookieHeaders,
  requireCustomerPortalDataAccess
} from '@/lib/platform-auth/server-session';

export async function GET(request: Request) {
  try {
    const auth = await requireCustomerPortalDataAccess(request);
    if ('response' in auth) {
      return auth.response;
    }

    if (auth.adminWithoutImpersonation) {
      console.log(
        '[customer-portal/api/projects] getProjects() skipped — admin with no customer selected (no impersonation cookie); MySQL email would be empty'
      );
      const response = NextResponse.json([]);
      applyPlatformSetCookieHeaders(response, auth.session.setCookieHeaders);
      return response;
    }

    // Use the new data service which supports both MySQL and Supabase
    console.log('=== API /api/projects GET ===');
    console.log(
      '[customer-portal/api/projects] getProjects() customer email (MySQL project-data lookup):',
      auth.userEmail || '(empty)',
      {
        impersonating: auth.impersonating,
        actorEmail: auth.actorEmail ?? null,
        platformUserId: auth.session.payload?.user?.id ?? null,
        role: auth.session.payload?.role ?? 'unknown',
        userType: auth.session.payload?.userType ?? 'unknown'
      }
    );

    const projects = await getProjects(auth.userEmail);
    
    console.log(`API returning ${projects.length} projects`);
    if (projects.length === 0) {
      console.log('⚠️ WARNING: No projects found for email:', auth.userEmail);
      console.log('Please verify:');
      console.log('1. Email exists in MySQL project-data table');
      console.log('2. isDeleted is false for the project');
      console.log('3. Email spelling matches exactly (case-insensitive)');
    } else {
      console.log('✅ Projects found:', projects.map(p => ({ id: p.id, name: p.name })));
    }
    console.log('=== END API /api/projects GET ===');

    const response = NextResponse.json(projects);
    applyPlatformSetCookieHeaders(response, auth.session.setCookieHeaders);
    return response;
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get a single project by ID
export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    console.log('Looking for project with ID:', id);

    const auth = await requireCustomerPortalDataAccess(request);
    if ('response' in auth) {
      return auth.response;
    }

    if (auth.adminWithoutImpersonation) {
      const response = NextResponse.json(
        { error: 'Select a customer from the admin toolbar before opening a project.' },
        { status: 403 }
      );
      applyPlatformSetCookieHeaders(response, auth.session.setCookieHeaders);
      return response;
    }

    // Use the new data service which supports both MySQL and Supabase
    const project = await getProjectById(id);
    
    if (!project) {
      console.log('Project not found with ID:', id);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!emailsMatchForPortal(project.customer_email, auth.userEmail)) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const response = NextResponse.json(project);
    applyPlatformSetCookieHeaders(response, auth.session.setCookieHeaders);
    return response;
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
