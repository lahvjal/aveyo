import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getProjects, getProjectById } from '@/lib/data-service';
import { Project } from '@/types';

export async function GET() {
  try {
    // Properly await the cookies function
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
    
    // Use the new data service which supports both MySQL and Supabase
    console.log('=== API /api/projects GET ===');
    console.log('Authenticated user:', session.user.id);
    console.log('Fetching projects for email:', userEmail);
    console.log('Session details:', {
      userId: session.user.id,
      email: userEmail,
      emailVerified: session.user.email_confirmed_at,
    });
    
    const projects = await getProjects(userEmail);
    
    console.log(`API returning ${projects.length} projects`);
    if (projects.length === 0) {
      console.log('⚠️ WARNING: No projects found for email:', userEmail);
      console.log('Please verify:');
      console.log('1. Email exists in MySQL project-data table');
      console.log('2. isDeleted is false for the project');
      console.log('3. Email spelling matches exactly (case-insensitive)');
    } else {
      console.log('✅ Projects found:', projects.map(p => ({ id: p.id, name: p.name })));
    }
    console.log('=== END API /api/projects GET ===');
    
    return NextResponse.json(projects);
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
    
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Use the new data service which supports both MySQL and Supabase
    const project = await getProjectById(id);
    
    if (!project) {
      console.log('Project not found with ID:', id);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    return NextResponse.json(project);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
