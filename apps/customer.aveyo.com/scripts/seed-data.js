// This script can be used to seed initial data into your Supabase database
// Run with: node scripts/seed-data.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Sample data
const salesReps = [
  {
    name: 'John Smith',
    email: 'john.smith@aveyo.com',
    phone: '555-123-4567'
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@aveyo.com',
    phone: '555-987-6543'
  }
];

const projects = [
  {
    name: 'Residential Solar Installation',
    address: '123 Main St, Anytown, CA 90210',
    status: 'in_progress',
    milestone: 'permitting',
    customer_email: 'test@example.com'
  },
  {
    name: 'Home Battery Installation',
    address: '456 Oak Ave, Somewhere, CA 90211',
    status: 'scheduled',
    milestone: 'design',
    customer_email: 'test@example.com'
  }
];

const milestones = [
  {
    name: 'Site Assessment',
    description: 'Initial evaluation of your property',
    status: 'completed',
    date: new Date(2025, 4, 10).toISOString()
  },
  {
    name: 'System Design',
    description: 'Creating custom solar panel layout',
    status: 'completed',
    date: new Date(2025, 4, 15).toISOString()
  },
  {
    name: 'Permitting',
    description: 'Obtaining necessary permits',
    status: 'in_progress',
    date: new Date(2025, 5, 1).toISOString()
  },
  {
    name: 'Installation',
    description: 'Installing solar panels',
    status: 'pending',
    date: new Date(2025, 5, 15).toISOString()
  },
  {
    name: 'Inspection',
    description: 'Final inspection by local authorities',
    status: 'pending',
    date: new Date(2025, 5, 25).toISOString()
  },
  {
    name: 'Activation',
    description: 'System activation and grid connection',
    status: 'pending',
    date: new Date(2025, 6, 1).toISOString()
  }
];

const documents = [
  {
    name: 'Solar Contract',
    description: 'Your signed solar installation agreement',
    type: 'pdf',
    size: '2.4 MB',
    url: 'https://example.com/contract.pdf',
    customer_email: 'test@example.com'
  },
  {
    name: 'System Design',
    description: 'Custom solar panel layout for your home',
    type: 'pdf',
    size: '5.1 MB',
    url: 'https://example.com/design.pdf',
    customer_email: 'test@example.com'
  },
  {
    name: 'Permit Application',
    description: 'Local authority permit application',
    type: 'pdf',
    size: '1.8 MB',
    url: 'https://example.com/permit.pdf',
    customer_email: 'test@example.com'
  },
  {
    name: 'Site Photos',
    description: 'Photos taken during site assessment',
    type: 'image',
    size: '8.3 MB',
    url: 'https://example.com/photos.zip',
    customer_email: 'test@example.com'
  }
];

const notifications = [
  {
    title: 'Milestone Completed',
    message: 'System Design phase has been completed',
    type: 'milestone',
    read: false,
    customer_email: 'test@example.com'
  },
  {
    title: 'New Document Available',
    message: 'Your Solar Contract has been uploaded',
    type: 'document',
    read: true,
    customer_email: 'test@example.com'
  },
  {
    title: 'Status Update',
    message: 'Your project is now in the Permitting phase',
    type: 'status',
    read: false,
    customer_email: 'test@example.com'
  }
];

// Seed data function
async function seedData() {
  try {
    console.log('Starting data seeding...');

    // Insert sales reps
    const { data: salesRepsData, error: salesRepsError } = await supabase
      .from('sales_reps')
      .insert(salesReps)
      .select();

    if (salesRepsError) throw salesRepsError;
    console.log('Sales reps inserted:', salesRepsData.length);

    // Assign sales reps to projects
    const projectsWithSalesReps = projects.map((project, index) => ({
      ...project,
      sales_rep_id: salesRepsData[index % salesRepsData.length].id
    }));

    // Insert projects
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .insert(projectsWithSalesReps)
      .select();

    if (projectsError) throw projectsError;
    console.log('Projects inserted:', projectsData.length);

    // Insert milestones for each project
    const projectMilestones = [];
    projectsData.forEach(project => {
      milestones.forEach(milestone => {
        projectMilestones.push({
          ...milestone,
          project_id: project.id
        });
      });
    });

    const { data: milestonesData, error: milestonesError } = await supabase
      .from('project_milestones')
      .insert(projectMilestones)
      .select();

    if (milestonesError) throw milestonesError;
    console.log('Milestones inserted:', milestonesData.length);

    // Insert documents for each project
    const projectDocuments = [];
    projectsData.forEach(project => {
      documents.forEach(document => {
        projectDocuments.push({
          ...document,
          project_id: project.id
        });
      });
    });

    const { data: documentsData, error: documentsError } = await supabase
      .from('documents')
      .insert(projectDocuments)
      .select();

    if (documentsError) throw documentsError;
    console.log('Documents inserted:', documentsData.length);

    // Insert notifications for each project
    const projectNotifications = [];
    projectsData.forEach(project => {
      notifications.forEach(notification => {
        projectNotifications.push({
          ...notification,
          project_id: project.id
        });
      });
    });

    const { data: notificationsData, error: notificationsError } = await supabase
      .from('notifications')
      .insert(projectNotifications)
      .select();

    if (notificationsError) throw notificationsError;
    console.log('Notifications inserted:', notificationsData.length);

    console.log('Data seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

// Run the seeding function
seedData();
