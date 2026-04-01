// Field Mapper - Transforms MySQL data to existing TypeScript interfaces
// This mapper ensures zero frontend changes by converting MySQL schema to expected format

import { Project, MilestoneObject, ActionItem } from '@/types';
import { ProjectData, Timeline, CustomerSow } from '@prisma/client';
import { calculateProjectStatus } from '@/utils/projectStatusUtils';

/**
 * Maps MySQL ProjectData + Timeline to our Project interface
 */
export function mapProjectDataToProject(
  projectData: ProjectData & { timeline?: Timeline | null; customerSow?: CustomerSow[] }
): Project {
  console.log('[field-mapper] Mapping project data:', {
    itemId: projectData.itemId.toString(),
    email: projectData.email,
    projectStatus: projectData.projectStatus,
    hasTimeline: !!projectData.timeline,
    hasCustomerSow: !!projectData.customerSow && projectData.customerSow.length > 0
  });
  
  // Format address
  const address = projectData.fullAddress ||
    `${projectData.address || ''}, ${projectData.city || ''}, ${projectData.state || ''} ${projectData.zip || ''}`.trim();

  // Format project name
  const customerName = projectData.customerName ||
    projectData.email.split('@')[0] ||
    'Customer';
  const projectName = `Solar Installation - ${customerName}`;

  // Map milestone data from timeline table
  const milestone: MilestoneObject = mapTimelineToMilestone(projectData.timeline);

  // Create sales rep object
  const salesReps = {
    id: projectData.salesRepId || '',
    name: projectData.salesRepName || 'Unknown',
    email: projectData.salesRepEmail || '',
    phone: '' // Not available in current schema
  };

  // Create Project object
  const project: Project = {
    id: projectData.itemId.toString(), // Convert BigInt to string
    name: projectName,
    address: address,
    status: projectData.projectStatus || 'not_started',
    milestone: milestone,
    customer_email: projectData.email,
    system_size: projectData.systemSize || undefined,
    estimated_yearly_production: projectData.estimatedYearlyProduction || undefined,
    project_manager: projectData.projectManager || undefined,
    sales_reps: salesReps,
    updated_at: projectData.dataUpdatedTimestamp?.toISOString() || new Date().toISOString(),
    created_at: projectData.sentToSupabaseDate?.toISOString() || new Date().toISOString(),
    project_complete: projectData.timeline?.projectComplete?.toISOString() || undefined,
    // Store original data for compatibility
    podio_data: {
      raw_payload: {
        'item-id': projectData.itemId.toString(), // Convert BigInt to string
        'home-photo-url': undefined, // Not in MySQL schema yet
        address: projectData.address,
        city: projectData.city,
        state: projectData.state,
        zip: projectData.zip,
        'system-size': projectData.systemSize,
        'estimated-yearly-production': projectData.estimatedYearlyProduction,
        'project-manager': projectData.projectManager,
        'sales-rep-name': projectData.salesRepName,
        'sales-rep-email': projectData.salesRepEmail,
      }
    }
  };

  // Calculate project status
  project.calculatedStatus = calculateProjectStatus(project);
  
  console.log('[field-mapper] Mapped project:', {
    id: project.id,
    name: project.name,
    status: project.status,
    calculatedStatus: project.calculatedStatus,
    address: project.address
  });

  return project;
}

/**
 * Maps Timeline table to Milestone object structure
 */
export function mapTimelineToMilestone(timeline: Timeline | null | undefined): MilestoneObject {
  if (!timeline) {
    console.log('[field-mapper] No timeline data found for project');
    return {
      'pre-approvals': {},
      approvals: {},
      construction: {},
      energization: {}
    };
  }

  console.log('[field-mapper] Mapping timeline data to milestones:', {
    siteSurveyComplete: timeline.siteSurveyComplete,
    ntpComplete: timeline.ntpComplete,
    engineeringComplete: timeline.engineeringComplete,
    allPermitsComplete: timeline.allPermitsComplete,
    installComplete: timeline.installComplete,
    ptoReceived: timeline.ptoReceived,
    energizeCompleteDate: timeline.energizeCompleteDate
  });

  const milestoneObject = {
    'pre-approvals': {
      'site-survey-complete': timeline.siteSurveyComplete?.toISOString() || undefined,
      'site-survey-status': timeline.siteSurveyStatus || undefined,
      'ntp-complete': timeline.ntpComplete?.toISOString() || undefined,
      'engineering-complete': timeline.engineeringComplete?.toISOString() || undefined,
      'engineering-status': undefined, // Not in timeline table
    },
    approvals: {
      'pre-install-review-complete': timeline.allPermitsComplete?.toISOString() || undefined,
      'all-permits-complete': timeline.allPermitsComplete?.toISOString() || undefined,
    },
    construction: {
      'install-appointment': timeline.installAppointment?.toISOString() || undefined,
      'install-complete': timeline.installComplete?.toISOString() || undefined,
      'ahj-inspection-complete': timeline.ahjInspectionComplete?.toISOString() || undefined,
    },
    energization: {
      'pto-received': timeline.ptoReceived?.toISOString() || undefined,
      'pto-status': timeline.ptoStatus || undefined,
      'energize-complete-date': timeline.energizeCompleteDate?.toISOString() || undefined,
      'engergize-status': timeline.energizeStatus || undefined, // Note: typo in original schema
      'system-active': timeline.systemActive?.toISOString() || undefined,
    }
  };

  console.log('[field-mapper] Created milestone object from timeline:', JSON.stringify(milestoneObject, null, 2));
  
  return milestoneObject;
}

/**
 * Maps VWC data from ProjectData to ActionItem
 */
export function mapVWCToActionItem(projectData: ProjectData): ActionItem | null {
  // Only create action item if VWC form URL exists
  if (!projectData.vwcFormUrl) {
    return null;
  }

  const status = mapStatusToValidType(projectData.vwcStatus || 'pending');
  const dueDate = new Date(); // Default to today if no due date
  const completedAt = projectData.vwcCompleteDate?.toISOString();

  return {
    id: `vwc-${projectData.itemId.toString()}`,
    title: 'Welcome Form',
    description: 'Please complete your virtual welcome call form to get started with your project.',
    status: status,
    due_date: dueDate.toISOString(),
    project_id: projectData.itemId.toString(), // Convert BigInt to string
    project_name: `Solar Installation - ${projectData.customerName || 'Customer'}`,
    project_address: projectData.fullAddress || `${projectData.address}, ${projectData.city}, ${projectData.state}`,
    customer_email: projectData.email,
    created_at: projectData.sentToSupabaseDate?.toISOString() || new Date().toISOString(),
    completed_at: completedAt,
    priority: 'high',
    type: 'welcome_form',
    'form-url': projectData.vwcFormUrl,
  };
}

/**
 * Maps customer-sow table to ActionItem
 */
export function mapCustomerSowToActionItem(
  sow: CustomerSow,
  projectData: ProjectData
): ActionItem {
  const status = mapStatusToValidType(sow.customerPortalSowStatus || 'pending');
  const dueDate = sow.customerSowDueDate || new Date();
  const completedAt = sow.sowApprovedTimestamp?.toISOString();

  return {
    id: `sow-${sow.itemId.toString()}`,
    title: 'Customer SOW Approval',
    description: sow.title || 'Review and approve your Statement of Work',
    status: status,
    due_date: dueDate.toISOString(),
    project_id: projectData.itemId.toString(), // Convert BigInt to string
    project_name: `Solar Installation - ${projectData.customerName || 'Customer'}`,
    project_address: projectData.fullAddress || `${projectData.address}, ${projectData.city}, ${projectData.state}`,
    customer_email: projectData.email,
    created_at: sow.createdDate?.toISOString() || new Date().toISOString(),
    completed_at: completedAt,
    priority: 'high',
    type: 'sow_approval',
    'form-url': sow.linkToScopeApprovalForm || undefined,
  };
}

/**
 * Helper to map status strings to valid ActionItem status
 */
function mapStatusToValidType(status: string): 'completed' | 'pending' | 'overdue' {
  const statusLower = status.toLowerCase();

  // Completed statuses
  if (['completed', 'approved', 'done', 'complete'].includes(statusLower)) {
    return 'completed';
  }

  // Overdue statuses  
  if (['overdue', 'late'].includes(statusLower)) {
    return 'overdue';
  }

  // Default to pending
  return 'pending';
}

/**
 * Check if action item is overdue
 */
export function checkIfOverdue(item: ActionItem): ActionItem {
  if (item.status === 'pending') {
    const dueDate = new Date(item.due_date);
    const now = new Date();

    if (dueDate < now) {
      return { ...item, status: 'overdue' };
    }
  }

  return item;
}

