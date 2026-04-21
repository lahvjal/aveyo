// MySQL Data Service - Replaces Supabase data service for project data
// Uses Prisma Client to fetch data from MySQL and transform to existing interfaces

import { Project, ActionItem, Notification } from '@/types';
import { prisma } from './client';
import type { Prisma } from '@prisma/client';
import {
  mapProjectDataToProject,
  mapVWCToActionItem,
  mapCustomerSowToActionItem,
  checkIfOverdue
} from './field-mapper';

// Type inference for ProjectData from Prisma
type ProjectData = Prisma.ProjectDataGetPayload<{}>;

/**
 * Get all projects for a customer by email
 */
export async function getProjects(email: string): Promise<Project[]> {
  try {
    console.log(`[MySQL] Fetching projects for email: "${email}"`);

    // First, let's check if ANY projects exist for this email (ignoring isDeleted)
    const allProjectsForEmail = await prisma.projectData.findMany({
      where: {
        email: email,
      },
    });
    console.log(`[MySQL] Found ${allProjectsForEmail.length} total projects for this email (including deleted)`);
    
    // Check all projects in database to help debug
    const sampleProjects = await prisma.projectData.findMany({
      take: 5,
      select: {
        itemId: true,
        email: true,
        isDeleted: true,
        customerName: true,
      }
    });
    console.log('[MySQL] Sample projects in database:', sampleProjects);

    // Fetch project data
    const projectsData = await prisma.projectData.findMany({
      where: {
        email: email,
        isDeleted: false,
      },
      orderBy: {
        dataUpdatedTimestamp: 'desc',
      },
    });

    console.log(`Found ${projectsData.length} projects from MySQL`);

    // Manually fetch timeline and customerSow data for each project using projectId
    const projectsWithRelations = await Promise.all(
      projectsData.map(async (project: ProjectData) => {
        const timeline = project.projectId 
          ? await prisma.timeline.findFirst({
              where: {
                projectId: project.projectId,
                isDeleted: false,
              },
            })
          : null;

        const customerSow = await prisma.customerSow.findMany({
          where: {
            itemId: project.itemId,
            isDeleted: false,
          },
        });

        console.log(`[MySQL] Project "${project.projectId}" timeline data:`, {
          itemId: project.itemId.toString(),
          projectId: project.projectId,
          hasTimeline: !!timeline,
          timelineFields: timeline ? {
            siteSurveyComplete: timeline.siteSurveyComplete,
            ntpComplete: timeline.ntpComplete,
            engineeringComplete: timeline.engineeringComplete,
            allPermitsComplete: timeline.allPermitsComplete,
            installAppointment: timeline.installAppointment,
            installComplete: timeline.installComplete,
            ahjInspectionComplete: timeline.ahjInspectionComplete,
            ptoReceived: timeline.ptoReceived,
            energizeCompleteDate: timeline.energizeCompleteDate,
            systemActive: timeline.systemActive
          } : 'NO TIMELINE DATA'
        });

        return {
          ...project,
          timeline,
          customerSow,
        };
      })
    );

    // Map MySQL data to Project interface
    const projects = projectsWithRelations.map(mapProjectDataToProject);
    
    console.log(`Mapped to ${projects.length} Project objects`);

    return projects;
  } catch (error) {
    console.error('Error fetching projects from MySQL:', error);
    return [];
  }
}

/**
 * Get a single project by ID
 */
export async function getProjectById(id: string): Promise<Project | null> {
  try {
    console.log(`Fetching project by ID: ${id}`);

    // Try to find project by itemId (BigInt) or projectId (string)
    const projectData = await prisma.projectData.findFirst({
      where: {
        OR: [
          { itemId: BigInt(id) }, // Convert string to BigInt for itemId comparison
          { projectId: id }, // projectId is already a string
        ],
        isDeleted: false,
      },
    });

    if (!projectData) {
      console.log(`Project not found: ${id}`);
      return null;
    }

    // Manually fetch timeline and customerSow data using projectId
    const timeline = projectData.projectId 
      ? await prisma.timeline.findFirst({
          where: {
            projectId: projectData.projectId,
            isDeleted: false,
          },
        })
      : null;

    const customerSow = await prisma.customerSow.findMany({
      where: {
        itemId: projectData.itemId,
        isDeleted: false,
      },
    });

    console.log(`[MySQL] Found project "${projectData.projectId}" with timeline:`, {
      hasTimeline: !!timeline,
      customerSowCount: customerSow.length
    });

    // Map MySQL data to Project interface
    const project = mapProjectDataToProject({
      ...projectData,
      timeline,
      customerSow,
    });

    return project;
  } catch (error) {
    console.error('Error fetching project by ID from MySQL:', error);
    return null;
  }
}

/**
 * Get action items for a customer
 */
export async function getActionItems(
  email: string,
  projectId?: string
): Promise<ActionItem[]> {
  try {
    console.log(`Fetching action items for email: ${email}`);

    // Build query filter
    const where: any = {
      email: email,
      isDeleted: false,
    };

    if (projectId) {
      where.OR = [
        { itemId: BigInt(projectId) }, // Convert string to BigInt for itemId comparison
        { projectId: projectId }, // projectId is already a string
      ];
    }

    // Fetch projects data
    const projectsData = await prisma.projectData.findMany({
      where,
    });

    const actionItems: ActionItem[] = [];

    // Generate action items from VWC and SOW data
    for (const projectData of projectsData) {
      // Add VWC action item if it exists
      const vwcItem = mapVWCToActionItem(projectData);
      if (vwcItem) {
        actionItems.push(checkIfOverdue(vwcItem));
      }

      // Fetch customerSow data for this project using itemId
      const customerSowData = await prisma.customerSow.findMany({
        where: {
          itemId: projectData.itemId,
          isDeleted: false,
        },
      });

      // Add SOW action items
      for (const sow of customerSowData) {
        const sowItem = mapCustomerSowToActionItem(sow, projectData);
        actionItems.push(checkIfOverdue(sowItem));
      }
    }

    // Sort by due date (earliest first)
    actionItems.sort((a, b) => 
      new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );

    console.log(`Generated ${actionItems.length} action items`);

    return actionItems;
  } catch (error) {
    console.error('Error fetching action items from MySQL:', error);
    return [];
  }
}

/**
 * Get notifications for a customer
 */
export async function getNotifications(email: string): Promise<Notification[]> {
  try {
    console.log(`Generating notifications for email: ${email}`);

    // Get projects to generate notifications from milestones
    const projects = await getProjects(email);
    const notifications: Notification[] = [];

    // Generate notifications for each project based on completed milestones
    for (const project of projects) {
      if (typeof project.milestone !== 'object') {
        continue;
      }

      const milestone = project.milestone;

      // Site Survey completed
      if (milestone['pre-approvals']?.['site-survey-complete']) {
        notifications.push({
          id: `${project.id}-site-survey`,
          title: 'Milestone Completed',
          message: `Site Survey phase has been completed for your project at ${project.address}`,
          type: 'milestone',
          read: false,
          project_id: project.id,
          customer_email: email,
          created_at: milestone['pre-approvals']['site-survey-complete'],
        });
      }

      // Engineering completed
      if (milestone['pre-approvals']?.['engineering-complete']) {
        notifications.push({
          id: `${project.id}-engineering`,
          title: 'Milestone Completed',
          message: `Engineering phase has been completed for your project at ${project.address}`,
          type: 'milestone',
          read: false,
          project_id: project.id,
          customer_email: email,
          created_at: milestone['pre-approvals']['engineering-complete'],
        });
      }

      // Permits completed
      if (milestone.approvals?.['all-permits-complete']) {
        notifications.push({
          id: `${project.id}-permits`,
          title: 'Milestone Completed',
          message: `All permits have been completed for your project at ${project.address}`,
          type: 'milestone',
          read: false,
          project_id: project.id,
          customer_email: email,
          created_at: milestone.approvals['all-permits-complete'],
        });
      }

      // Installation completed
      if (milestone.construction?.['install-complete']) {
        notifications.push({
          id: `${project.id}-installation`,
          title: 'Milestone Completed',
          message: `Installation has been completed for your project at ${project.address}`,
          type: 'milestone',
          read: false,
          project_id: project.id,
          customer_email: email,
          created_at: milestone.construction['install-complete'],
        });
      }

      // Installation scheduled (but not completed)
      if (
        milestone.construction?.['install-appointment'] &&
        !milestone.construction?.['install-complete']
      ) {
        const installDate = new Date(milestone.construction['install-appointment']);
        notifications.push({
          id: `${project.id}-install-scheduled`,
          title: 'Installation Scheduled',
          message: `Your solar installation has been scheduled for ${installDate.toLocaleDateString()}`,
          type: 'status',
          read: false,
          project_id: project.id,
          customer_email: email,
          created_at: new Date().toISOString(),
        });
      }

      // PTO received
      if (milestone.energization?.['pto-received']) {
        notifications.push({
          id: `${project.id}-pto`,
          title: 'Milestone Completed',
          message: `Permission to Operate has been received for your project at ${project.address}`,
          type: 'milestone',
          read: false,
          project_id: project.id,
          customer_email: email,
          created_at: milestone.energization['pto-received'],
        });
      }

      // System energized
      if (milestone.energization?.['energize-complete-date']) {
        notifications.push({
          id: `${project.id}-energized`,
          title: 'System Active!',
          message: `Your solar system is now active and producing energy at ${project.address}`,
          type: 'milestone',
          read: false,
          project_id: project.id,
          customer_email: email,
          created_at: milestone.energization['energize-complete-date'],
        });
      }
    }

    // Sort by date (newest first)
    notifications.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    console.log(`Generated ${notifications.length} notifications`);

    return notifications;
  } catch (error) {
    console.error('Error generating notifications from MySQL:', error);
    return [];
  }
}

/**
 * Mark notification as read (placeholder - notifications are generated dynamically)
 */
export async function markNotificationAsRead(id: string): Promise<boolean> {
  // Since notifications are generated dynamically, we could:
  // 1. Store read status in localStorage (client-side)
  // 2. Create a notifications table in MySQL (future enhancement)
  // 3. Store in Supabase (if keeping some data there)
  
  // For now, return true (frontend can manage read state locally)
  console.log(`Marking notification as read: ${id}`);
  return true;
}

/**
 * Complete action item (placeholder - SOW completion is tracked in customer-sow table)
 */
export async function completeActionItem(id: string): Promise<boolean> {
  // Action item completion is tracked in the source tables:
  // - VWC: project-data.vwc-complete-date
  // - SOW: customer-sow.sow-approved-timestamp
  
  // This would require updating those tables directly
  // For now, return true (actual completion happens in Podio/external systems)
  console.log(`Completing action item: ${id}`);
  return true;
}

export interface PortalCustomerSearchResult {
  email: string;
  label: string;
}

const PORTAL_CUSTOMER_SEARCH_MIN_LEN = 2;
const PORTAL_CUSTOMER_SEARCH_LIMIT = 25;
const PORTAL_CUSTOMER_SEARCH_SCAN = 120;

/**
 * Distinct customer emails from project data for admin portal search (name or email substring).
 */
export async function searchPortalCustomers(rawQuery: string): Promise<PortalCustomerSearchResult[]> {
  const q = rawQuery.trim();
  if (q.length < PORTAL_CUSTOMER_SEARCH_MIN_LEN) {
    return [];
  }

  try {
    const rows = await prisma.projectData.findMany({
      where: {
        isDeleted: false,
        OR: [
          { email: { contains: q } },
          { customerName: { contains: q } },
          { firstName: { contains: q } },
          { lastName: { contains: q } }
        ]
      },
      select: {
        email: true,
        customerName: true,
        firstName: true,
        lastName: true
      },
      orderBy: {
        dataUpdatedTimestamp: 'desc'
      },
      take: PORTAL_CUSTOMER_SEARCH_SCAN
    });

    const seen = new Set<string>();
    const out: PortalCustomerSearchResult[] = [];
    for (const row of rows) {
      const emailTrim = row.email.trim();
      const key = emailTrim.toLowerCase();
      if (!key || seen.has(key)) {
        continue;
      }
      seen.add(key);
      const combinedName = [row.firstName, row.lastName].filter(Boolean).join(' ').trim();
      const name = combinedName || row.customerName?.trim() || '';
      const label = name ? `${name} · ${emailTrim}` : emailTrim;
      out.push({ email: emailTrim, label });
      if (out.length >= PORTAL_CUSTOMER_SEARCH_LIMIT) {
        break;
      }
    }
    return out;
  } catch (error) {
    console.error('[MySQL] searchPortalCustomers failed:', error);
    return [];
  }
}
