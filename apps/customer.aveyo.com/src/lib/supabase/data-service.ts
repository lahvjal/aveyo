import { supabase } from './client';
import { Project, Document, Notification, ActionItem, Milestone, MilestoneObject, UserProfile, PodioData, ProjectStatus } from '@/types';
import { calculateProjectStatus } from '@/utils/projectStatusUtils';

type PayloadData = {
  [key: string]: unknown;
  'pre-approvals'?: string | Record<string, unknown>;
  pre_approvals?: string | Record<string, unknown>;
  approvals?: string | Record<string, unknown>;
  construction?: string | Record<string, unknown>;
  energization?: string | Record<string, unknown>;
  raw_payload?: string | Record<string, unknown>;
};

// Type for milestone data fields with specific properties
type MilestoneFields = {
  //Pre-Approvals
  'site-survey-complete'?: string | boolean;
  'ntp-complete'?: string | boolean;
  'engineering-complete'?: string | boolean;
  //Approvals
  'pre-install-review-complete'?: string | boolean;
  //Construction
  'install-appointment'?: string;
  'install-complete'?: string | boolean;
  'ahj-inspection-complete'?: string | boolean;
  //Energization
  'pto-received'?: string | boolean;
  'energize-complete-date'?: string;
  [key: string]: unknown;
};

// Helper function to parse milestone data from payload
function parseMilestoneData(payload: PayloadData | null | undefined): MilestoneObject {
  // Default empty milestone structure
  const emptyMilestoneObject = {
    'pre-approvals': {},
    approvals: {},
    construction: {},
    energization: {}
  };
  
  if (!payload) {
    // Payload is undefined
    return emptyMilestoneObject;
  }
  
  // Extract raw data from various possible sources
  let rawPreApprovals: Record<string, unknown> = {};
  let rawApprovals: Record<string, unknown> = {};
  let rawConstruction: Record<string, unknown> = {};
  let rawEnergization: Record<string, unknown> = {};
  
  // Parse pre-approvals data
  if (typeof payload?.['pre-approvals'] === 'string' && payload['pre-approvals']) {
    try {
      rawPreApprovals = JSON.parse(payload['pre-approvals']);
    } catch (e) {
      // Error parsing pre-approvals
    }
  } else if (payload?.['pre-approvals'] && typeof payload['pre-approvals'] === 'object') {
    rawPreApprovals = payload['pre-approvals'] as Record<string, unknown>;
  } else if (typeof payload?.pre_approvals === 'string' && payload.pre_approvals) {
    try {
      rawPreApprovals = JSON.parse(payload.pre_approvals);
    } catch (e) {
      // Error parsing pre_approvals
    }
  } else if (payload?.pre_approvals && typeof payload.pre_approvals === 'object') {
    rawPreApprovals = payload.pre_approvals as Record<string, unknown>;
  } else if (payload?.raw_payload && typeof payload.raw_payload === 'object') {
    // Check if pre-approvals might be in a nested structure
    const nestedPayload = payload.raw_payload as Record<string, unknown>;
    if (nestedPayload['pre-approvals'] && typeof nestedPayload['pre-approvals'] === 'object') {
      rawPreApprovals = nestedPayload['pre-approvals'] as Record<string, unknown>;
    } else if (nestedPayload.pre_approvals && typeof nestedPayload.pre_approvals === 'object') {
      rawPreApprovals = nestedPayload.pre_approvals as Record<string, unknown>;
    }
  }
  
  // Parse approvals data
  if (typeof payload?.approvals === 'string' && payload.approvals) {
    try {
      rawApprovals = JSON.parse(payload.approvals);
    } catch (e) {
      // Error parsing approvals
    }
  } else if (payload?.approvals && typeof payload.approvals === 'object') {
    rawApprovals = payload.approvals as Record<string, unknown>;
  } else if (payload?.raw_payload && typeof payload.raw_payload === 'object') {
    // Check nested structure
    const nestedPayload = payload.raw_payload as Record<string, unknown>;
    if (nestedPayload.approvals && typeof nestedPayload.approvals === 'object') {
      rawApprovals = nestedPayload.approvals as Record<string, unknown>;
    }
  }
  
  // Parse construction data
  if (typeof payload?.construction === 'string' && payload.construction) {
    try {
      rawConstruction = JSON.parse(payload.construction);
    } catch (e) {
      // Error parsing construction
    }
  } else if (payload?.construction && typeof payload.construction === 'object') {
    rawConstruction = payload.construction as Record<string, unknown>;
  } else if (payload?.raw_payload && typeof payload.raw_payload === 'object') {
    // Check nested structure
    const nestedPayload = payload.raw_payload as Record<string, unknown>;
    if (nestedPayload.construction && typeof nestedPayload.construction === 'object') {
      rawConstruction = nestedPayload.construction as Record<string, unknown>;
    }
  }
  
  // Parse energization data
  if (typeof payload?.energization === 'string' && payload.energization) {
    try {
      rawEnergization = JSON.parse(payload.energization);
    } catch (e) {
      // Error parsing energization
    }
  } else if (payload?.energization && typeof payload.energization === 'object') {
    rawEnergization = payload.energization as Record<string, unknown>;
  } else if (payload?.raw_payload && typeof payload.raw_payload === 'object') {
    // Check nested structure
    const nestedPayload = payload.raw_payload as Record<string, unknown>;
    if (nestedPayload.energization && typeof nestedPayload.energization === 'object') {
      rawEnergization = nestedPayload.energization as Record<string, unknown>;
    }
  }
  
  // Filter and extract only the specific milestone fields we care about
  // Type cast each field to ensure it matches the expected type
  const preApprovals: MilestoneFields = {
    'site-survey-complete': typeof rawPreApprovals['site-survey-complete'] === 'boolean' || 
                           typeof rawPreApprovals['site-survey-complete'] === 'string' ? 
                           rawPreApprovals['site-survey-complete'] as (string | boolean) : undefined,
    'ntp-complete': typeof rawPreApprovals['ntp-complete'] === 'boolean' || 
                   typeof rawPreApprovals['ntp-complete'] === 'string' ? 
                   rawPreApprovals['ntp-complete'] as (string | boolean) : undefined,
    'engineering-complete': typeof rawPreApprovals['engineering-complete'] === 'boolean' || 
                           typeof rawPreApprovals['engineering-complete'] === 'string' ? 
                           rawPreApprovals['engineering-complete'] as (string | boolean) : undefined
  };
  
  const approvals: MilestoneFields = {
    'pre-install-review-complete': typeof rawApprovals['pre-install-review-complete'] === 'boolean' || 
                                 typeof rawApprovals['pre-install-review-complete'] === 'string' ? 
                                 rawApprovals['pre-install-review-complete'] as (string | boolean) : undefined
  };
  
  const construction: MilestoneFields = {
    'install-appointment': typeof rawConstruction['install-appointment'] === 'string' ? 
                          rawConstruction['install-appointment'] as string : undefined,
    'install-complete': typeof rawConstruction['install-complete'] === 'boolean' || 
                       typeof rawConstruction['install-complete'] === 'string' ? 
                       rawConstruction['install-complete'] as (string | boolean) : undefined,
    'ahj-inspection-complete': typeof rawConstruction['ahj-inspection-complete'] === 'boolean' || 
                              typeof rawConstruction['ahj-inspection-complete'] === 'string' ? 
                              rawConstruction['ahj-inspection-complete'] as (string | boolean) : undefined
  };
  
  const energization: MilestoneFields = {
    'pto-received': typeof rawEnergization['pto-received'] === 'boolean' || 
                   typeof rawEnergization['pto-received'] === 'string' ? 
                   rawEnergization['pto-received'] as (string | boolean) : undefined,
    'energize-complete-date': typeof rawEnergization['energize-complete-date'] === 'string' ? 
                             rawEnergization['energize-complete-date'] as string : undefined
  };
  
  // Create the milestone object structure with only the specified fields
  return {
    'pre-approvals': preApprovals,
    approvals,
    construction,
    energization
  };
}

// Projects
export const getProjects = async (email: string): Promise<Project[]> => {
  try {
    
    // Fetch projects from podio_data table using email
    // The RLS policies will automatically filter based on app_id in user metadata
    const { data, error } = await supabase
      .from('podio_data')
      .select('*')
      .eq('email', email);
    
    
    if (error) {
      // Supabase error
      throw error;
    }
    
    
    // Transform the podio_data into our Project format
    return data?.map(item => {
      // Handle the new structure with raw_payload
      let rawPayload: PodioData['raw_payload'] = undefined;
      try {
        rawPayload = typeof item.raw_payload === 'string' 
          ? JSON.parse(item.raw_payload) 
          : (item.raw_payload as PodioData['raw_payload']);
      } catch (e) {
        // Error parsing raw_payload
      }
      
      // If raw_payload is not available, use the old structure
      const payload = rawPayload || item;
      
      // Parse milestone data using helper function
      const milestone = parseMilestoneData(payload);

      const parsedItem = {
        ...item,
        ...payload,
        // Include the structured milestone object
        milestone,
        // Include customer-actions in the processed project data
        'customer-actions': payload['customer-actions']
      };
      
      // Determine the current milestone based on the data
      // This is a simplified version - the full calculation is done by calculateProjectStatus
      let currentMilestone = 'design';
      let status = 'not_started';
      
      // Pre-Approvals section
      if (milestone['pre-approvals']?.['site-survey-complete']) {
        currentMilestone = 'site_survey';
        status = 'completed';
      }
      
      if (milestone['pre-approvals']?.['ntp-complete']) {
        currentMilestone = 'ntp';
        status = 'completed';
      }
      
      if (milestone['pre-approvals']?.['engineering-complete']) {
        currentMilestone = 'engineering';
        status = 'completed';
      }
      
      // Approvals section
      if (milestone['approvals']?.['pre-install-review-complete']) {
        currentMilestone = 'pre_install_review';
        status = 'completed';
      }
      
      // Construction section
      if (milestone['construction']?.['install-complete']) {
        currentMilestone = 'installation';
        status = 'completed';
      } else if (milestone['construction']?.['install-appointment']) {
        currentMilestone = 'installation';
        status = 'scheduled';
      }
      
      if (milestone['construction']?.['ahj-inspection-complete']) {
        currentMilestone = 'inspection';
        status = 'completed';
      }
      
      // Energization section
      if (milestone['energization']?.['pto-received']) {
        currentMilestone = 'pto';
        status = 'completed';
      }
      
      if (milestone['energization']?.['energize-complete-date']) {
        currentMilestone = 'energization';
        status = 'completed';
      }
      
      // We're no longer creating a processed milestones array
      // Instead, we'll use the raw milestone data directly from Supabase
      
      // Get the customer name, defaulting to email if not available
      const customerName = parsedItem['customer-name'] || item.email.split('@')[0] || 'Customer';
      
      // Get the project ID from either the item-id in raw_payload or the project_id field
      const projectId = (parsedItem['item-id'] || item.project_id || '').toString();
      
      // Format the address
      const address = parsedItem.address 
        ? `${parsedItem.address}, ${parsedItem.city || ''}, ${parsedItem.state || ''} ${parsedItem.zip || ''}` 
        : 'Address not available';
      
      // Parse milestone data using helper function
      const milestoneObj = parseMilestoneData(payload);
      
      // Create a podio_data object that includes customer-actions and other fields
      const podioData = {
        // Include the customer-actions field directly in podio_data
        'customer-actions': payload['customer-actions'],
        // Include other fields as needed
        'welcome-form-status': parsedItem['welcome-form-status'],
        'welcome-form-completed-at': parsedItem['welcome-form-completed-at'],
        'sow-approval-status': parsedItem['sow-approval-status'],
        'sow-approval-completed-at': parsedItem['sow-approval-completed-at'],
        // Include the raw_payload for reference
        raw_payload: rawPayload
      };
      
      // Extract sales rep data
      const salesRepId = parsedItem['sales-rep-id'];
      const salesRepName = parsedItem['sales-rep-name'];
      const salesRepEmail = parsedItem['sales-rep-email'];
      const salesRepPhone = parsedItem['sales-rep-phone'];

      // Create the project object with all necessary fields
      const project: Project = {
        id: projectId,
        name: `Solar Installation - ${customerName}`,
        address: address,
        sales_reps: {
          id: salesRepId,
          name: salesRepName || 'Unknown',
          email: salesRepEmail || '',
          phone: salesRepPhone || ''
        },
        status: status, // This will be overridden by calculatedStatus
        milestone: milestoneObj, // Use the milestone object structure directly
        customer_email: item.email,
        system_size: parsedItem['system-size'],
        estimated_yearly_production: parsedItem['estimated-yearly-production'],
        project_manager: parsedItem['project-manager'],
        // No longer including processed milestones array
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        project_complete: item.project_complete || parsedItem['project-complete'],
        // Include the podio_data object with customer-actions
        podio_data: podioData
      };
      
      // Calculate the project status based on milestone completion
      // This determines the current stage, next milestone, and progress percentage
      project.calculatedStatus = calculateProjectStatus(project);
      
      // Log the calculated status for debugging
      // console.log(`Project ${projectId} calculatedStatus:`, {
      //   currentStage: project.calculatedStatus.currentStage,
      //   nextMilestone: project.calculatedStatus.nextMilestone,
      //   progressPercentage: project.calculatedStatus.progressPercentage,
      //   milestones: project.milestone // Log milestone data to see what's being used for calculation
      // });
      
      return project;
    }) || [];
  } catch (error) {
    // Error fetching projects
    return [];
  }
};

export const getProjectById = async (id: string): Promise<Project | null> => {
  try {
    // Try multiple approaches to find the project
    let projectData = null;
    
    // Approach 1: Try to find by raw_payload->item-id using filter
    try {
      const { data, error } = await supabase
        .from('podio_data')
        .select('*')
        .filter('raw_payload->item-id', 'eq', id);
      
      if (data && data.length > 0) {
        projectData = data[0];
      }
    } catch (e) {
      // Error searching by raw_payload->item-id
    }
    
    // Approach 2: If not found, try project_id
    if (!projectData) {
      try {
        const { data, error } = await supabase
          .from('podio_data')
          .select('*')
          .eq('project_id', id);
        
        if (data && data.length > 0) {
          projectData = data[0];
        }
      } catch (e) {
        // Error searching by project_id
      }
    }
    
    // Approach 3: Try a direct search on the item-id field as a fallback
    if (!projectData) {
      try {
        const { data, error } = await supabase
          .from('podio_data')
          .select('*')
          .eq('item-id', id);
                
        if (data && data.length > 0) {
          projectData = data[0];
        }
      } catch (e) {
        // Error searching by direct item-id
      }
    }
    
    // Approach 4: Try to search in raw_payload as a string
    if (!projectData) {
      try {
        const { data, error } = await supabase
          .from('podio_data')
          .select('*');
        
        if (data && data.length > 0) {
          // Find any entry that contains the ID in raw_payload
          const matchingEntry = data.find(entry => {
            if (typeof entry.raw_payload === 'string') {
              return entry.raw_payload.includes(`"item-id":"${id}"`) || 
                     entry.raw_payload.includes(`"item-id":${id}`);
            } else if (entry.raw_payload && typeof entry.raw_payload === 'object') {
              return entry.raw_payload['item-id'] === id;
            }
            return false;
          });
          
          if (matchingEntry) {
            projectData = matchingEntry;
          }
        }
      } catch (e) {
        // Error searching in all podio_data entries
      }
    }
    
    if (!projectData) {
      return null;
    }
    
    // Handle the new structure with raw_payload
    let rawPayload: PodioData['raw_payload'] = undefined;
    try {
      rawPayload = typeof projectData.raw_payload === 'string' 
        ? JSON.parse(projectData.raw_payload) 
        : (projectData.raw_payload as PodioData['raw_payload']);
    } catch (e) {
      // Error parsing raw_payload
    }
    
    // If raw_payload is not available, use the old structure
    const payload = rawPayload || projectData;
    
    // Parse the JSON fields if they're stored as strings
    const parsedItem: Record<string, any> = {
      ...projectData,
      ...payload
    };
    
    // Safely parse JSON fields if they're stored as strings
    try {
      if (typeof payload.approvals === 'string') {
        parsedItem.approvals = JSON.parse(payload.approvals as string);
      }
    } catch (e) {
      // Error parsing approvals
    }
    
    try {
      if (typeof payload.construction === 'string') {
        parsedItem.construction = JSON.parse(payload.construction as string);
      }
    } catch (e) {
      // Error parsing construction
    }
    
    try {
      if (typeof payload.energization === 'string') {
        parsedItem.energization = JSON.parse(payload.energization as string);
      }
    } catch (e) {
      // Error parsing energization
    }
    
    try {
      if (typeof payload.pre_approvals === 'string') {
        parsedItem.pre_approvals = JSON.parse(payload.pre_approvals as string);
      }
    } catch (e) {
      // Error parsing pre_approvals
    }
    
    // Use the same parseMilestoneData helper function as getProjects
    // This ensures consistent handling of milestone data between the two functions
    const milestone = parseMilestoneData(payload);
    
    // Determine the current milestone based on the data
    // This is a simplified version - the full calculation is done by calculateProjectStatus
    let currentMilestone = 'design';
    let status = 'not_started';
    
    // Pre-Approvals section
    if (milestone['pre-approvals']?.['site-survey-complete']) {
      currentMilestone = 'site_survey';
      status = 'completed';
    }
    
    if (milestone['pre-approvals']?.['ntp-complete']) {
      currentMilestone = 'ntp';
      status = 'completed';
    }
    
    if (milestone['pre-approvals']?.['engineering-complete']) {
      currentMilestone = 'engineering';
      status = 'completed';
    }
    
    // Approvals section
    if (milestone['approvals']?.['pre-install-review-complete']) {
      currentMilestone = 'pre_install_review';
      status = 'completed';
    }
    
    // Construction section
    if (milestone['construction']?.['install-complete']) {
      currentMilestone = 'installation';
      status = 'completed';
    } else if (milestone['construction']?.['install-appointment']) {
      currentMilestone = 'installation';
      status = 'scheduled';
    }
    
    if (milestone['construction']?.['ahj-inspection-complete']) {
      currentMilestone = 'inspection';
      status = 'completed';
    }
    
    // Energization section
    if (milestone['energization']?.['pto-received']) {
      currentMilestone = 'pto';
      status = 'completed';
    }
    
    if (milestone['energization']?.['energize-complete-date']) {
      currentMilestone = 'energization';
      status = 'completed';
    }
    
    // Milestone data is now processed

    
    // Create a sales rep object with available information
    const salesRep = {
      id: '1',
      name: parsedItem['project-manager'] || 'Aveyo Support',
      email: 'support@aveyo.com',
      phone: '+1 800-123-4567'
    };
    
    // Get the customer name, defaulting to email if not available
    const customerName = parsedItem['customer-name'] || (projectData.email ? projectData.email.split('@')[0] : 'Customer');
    
    // Get the project ID from either the item-id in raw_payload or the project_id field
    const projectId = (parsedItem['item-id'] || projectData.project_id || '').toString();
    
    // Format the address
    const address = parsedItem.address 
      ? `${parsedItem.address}, ${parsedItem.city || ''}, ${parsedItem.state || ''} ${parsedItem.zip || ''}` 
      : 'Address not available';
    
    // Create the project object with all necessary fields including podio_data
    const project: Project = {
      id: projectId,
      name: `Solar Installation - ${customerName}`,
      address: address,
      status: status, // This will be overridden by calculatedStatus
      milestone, // Use the milestone object structure directly
      customer_email: projectData.email,
      system_size: parsedItem['system-size'],
      estimated_yearly_production: parsedItem['estimated-yearly-production'],
      project_manager: parsedItem['project-manager'],
      // No longer including processed milestones array
      sales_reps: salesRep,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      project_complete: projectData.project_complete || parsedItem['project-complete'],
      // Include the podio_data field with raw_payload to ensure home-photo-url is available
      // and all milestone data is properly passed to the project details page
      podio_data: {
        raw_payload: projectData.raw_payload
      }
    };
    
    // Calculate the project status based on milestone completion
    // This determines the current stage, next milestone, and progress percentage
    project.calculatedStatus = calculateProjectStatus(project);
    
    // Log the calculated status for debugging
    // console.log(`Project ${projectId} calculatedStatus:`, {
    //   currentStage: project.calculatedStatus.currentStage,
    //   nextMilestone: project.calculatedStatus.nextMilestone,
    //   progressPercentage: project.calculatedStatus.progressPercentage,
    //   milestones: project.milestone // Log milestone data to see what's being used for calculation
    // });
    
    return project;
  } catch (error) {
    // Error fetching project
    return null;
  }
};

// Documents - Using Supabase
export const getDocuments = async (email: string, projectId?: string): Promise<Document[]> => {
  try {
    // Start building the query
    let query = supabase
      .from('documents')
      .select('*');
    
    // Filter by email - this is critical for security
    // The RLS policy will also check app_id in user metadata
    if (email) {
      query = query.eq('email', email);
    } else {
      // If no email provided, return empty array for security
      console.warn('No email provided for document query');
      return [];
    }
    
    // If projectId is provided, filter by project_id
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase error fetching documents:', error);
      throw error;
    }
    
    return data as Document[];
  } catch (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
};

// Notifications - Generate based on project milestones
export async function getNotifications(email: string): Promise<Notification[]> {
  try {
    // Get projects for this user
    const projects = await getProjects(email);
    const notifications: Notification[] = [];
    
    // Generate notifications based on project milestones
    projects.forEach(project => {
      // Get milestone data from the raw milestone object structure
      if (!project.milestone || typeof project.milestone === 'string') {
        return; // Skip if milestone is not available or is a string
      }
      
      const milestone = project.milestone as MilestoneObject;
      const construction = milestone.construction || {};
      const preApprovals = milestone['pre-approvals'] || {};
      const approvals = milestone.approvals || {};
      const energization = milestone.energization || {};
      
      // Create notifications for completed milestones
      // Site Survey completion
      if (preApprovals?.['site-survey-complete']) {
        notifications.push({
          id: `${project.id}-site-survey-notification`,
          title: 'Milestone Completed',
          message: `Site Survey phase has been completed for your project at ${project.address}`,
          type: 'milestone',
          read: false,
          project_id: project.id,
          customer_email: email,
          created_at: preApprovals['site-survey-complete'] || new Date().toISOString()
        });
      }
      
      // Engineering completion
      if (preApprovals?.['engineering-complete']) {
        notifications.push({
          id: `${project.id}-engineering-notification`,
          title: 'Milestone Completed',
          message: `System Design phase has been completed for your project at ${project.address}`,
          type: 'milestone',
          read: false,
          project_id: project.id,
          customer_email: email,
          created_at: preApprovals['engineering-complete'] || new Date().toISOString()
        });
      }
      
      // Permitting completion
      if (approvals?.['all-permits-complete']) {
        notifications.push({
          id: `${project.id}-permits-notification`,
          title: 'Milestone Completed',
          message: `Permitting phase has been completed for your project at ${project.address}`,
          type: 'milestone',
          read: false,
          project_id: project.id,
          customer_email: email,
          created_at: approvals['all-permits-complete'] || new Date().toISOString()
        });
      }
      
      // Installation completion
      if (construction?.['install-complete']) {
        notifications.push({
          id: `${project.id}-installation-notification`,
          title: 'Milestone Completed',
          message: `Installation phase has been completed for your project at ${project.address}`,
          type: 'milestone',
          read: false,
          project_id: project.id,
          customer_email: email,
          created_at: construction['install-complete'] || new Date().toISOString()
        });
      }
      
      // Add a notification for scheduled installation if applicable
      if (construction?.['install-appointment'] && !construction?.['install-complete']) {
        // Format the installation date safely
        let installationDateText = 'soon';
        if (construction['install-appointment']) {
          try {
            installationDateText = new Date(construction['install-appointment']).toLocaleDateString();
          } catch (e) {
            // Error formatting installation date
          }
        }
        
        notifications.push({
          id: `${project.id}-installation-scheduled-notification`,
          title: 'Installation Scheduled',
          message: `Your solar installation has been scheduled for ${installationDateText}`,
          type: 'status',
          read: false,
          project_id: project.id,
          customer_email: email,
          created_at: new Date().toISOString()
        });
      }
    });
    
    // Sort by date (newest first)
    return notifications.sort((a, b) => {
      // Handle potential undefined dates safely
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  } catch (error) {
    // Error generating notifications
    return [];
  }
};

export const markNotificationAsRead = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    // Error marking notification as read
    return false;
  }
};
// User Profile
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    return data as UserProfile;
  } catch (error) {
    // Error fetching user profile
    return null;
  }
};

// Action Items
export const getActionItems = async (email: string, projectId?: string): Promise<ActionItem[]> => {
  try {
    // Helper function to map string status to valid ActionItem status type
    const mapStatusToValidType = (status: string): 'completed' | 'pending' | 'overdue' => {
      // Convert to lowercase for case-insensitive comparison
      const statusLower = status.toLowerCase();
      
      // Check for completed/approved statuses
      if (statusLower === 'completed' || statusLower === 'approved' || statusLower === 'done') {
        return 'completed';
      }
      
      // Check for overdue status
      if (statusLower === 'overdue' || statusLower === 'late') {
        return 'overdue';
      }
      
      // Check for empty status (treat as pending)
      if (!status || status.trim() === '') {
        return 'pending';
      }
      
      // For any other status, log it for debugging
      console.log(`Unmapped status value: "${status}" - defaulting to pending`);
      return 'pending';
    };

    // Get the projects for this user with their podio_data
    let query = supabase
      .from('projects')
      .select('*')
      .eq('customer_email', email);
    
    if (projectId) {
      query = query.eq('id', projectId);
    }
    
    const { data: projects, error: projectsError } = await query;
    

    
    if (projectsError) throw projectsError;
    
    // Generate action items from project data
    let actionItems: ActionItem[] = [];
    const now = new Date();
    
    // Process each project to extract action items from customer-actions
    projects.forEach(project => {
      // Access customer-actions from within the raw_payload field
      const customerActions = project.podio_data?.raw_payload?.['customer-actions'];
      
      if (customerActions) {
        // Add Welcome Form action if it exists
        if (customerActions['welcome-form']) {
          const welcomeForm = customerActions['welcome-form'];
          const formUrl = (welcomeForm as any)['form-url'] || (welcomeForm as any)['action-link'];
          
          // Only show if there's a form URL
          if (!formUrl) {
            console.log('Skipping Welcome Form action without form URL for project:', project.id);
          } else {
            // Use the due date if available, otherwise use current date
            const dueDate = welcomeForm['due-date'] && welcomeForm['due-date'].trim() !== '' 
              ? new Date(welcomeForm['due-date']) 
              : new Date();
            
            actionItems.push({
              id: `welcome-form-${project.id}`,
              title: 'Welcome Form',
              description: welcomeForm.message,
              status: mapStatusToValidType(welcomeForm.status),
              due_date: dueDate.toISOString(),
              project_id: project.id,
              project_name: project.name,
              project_address: project.address,
              customer_email: email,
              created_at: new Date().toISOString(),
              priority: 'high',
              type: 'welcome_form',
              'form-url': (welcomeForm as any)['form-url'] || (welcomeForm as any)['action-link'] || null,
              completed_at: welcomeForm['completed-date'] ? new Date(welcomeForm['completed-date']).toISOString() : undefined
            });
          }
        }
        
        // Add SOW Approval action if it exists
        if (customerActions['customer-sow']) {
          const sowApproval = customerActions['customer-sow'];
          const formUrl = (sowApproval as any)['form-url'] || (sowApproval as any)['action-link'];
          
          // Only show if there's a form URL
          if (!formUrl) {
            console.log('Skipping SOW Approval action without form URL for project:', project.id);
          } else {
            // Use the due date if available, otherwise use current date
            const dueDate = sowApproval['due-date'] && sowApproval['due-date'].trim() !== '' 
              ? new Date(sowApproval['due-date']) 
              : new Date();
            
            actionItems.push({
              id: `sow-approval-${project.id}`,
              title: 'Customer SOW Approval',
              description: sowApproval.message,
              status: mapStatusToValidType(sowApproval.status),
              due_date: dueDate.toISOString(),
              project_id: project.id,
              project_name: project.name,
              project_address: project.address,
              customer_email: email,
              created_at: new Date().toISOString(),
              priority: 'high',
              type: 'sow_approval',
              'form-url': (sowApproval as any)['form-url'] || (sowApproval as any)['action-link'] || null,
              completed_at: sowApproval['completed-date'] ? new Date(sowApproval['completed-date']).toISOString() : undefined
            });
          }
        }
      }
    });
    
    // Check for overdue items
    actionItems = actionItems.map(item => {
      if (item.status === 'pending') {
        const dueDate = new Date(item.due_date);
        if (dueDate < now) {
          return { ...item, status: 'overdue' };
        }
      }
      return item;
    });
    
    return actionItems;
  } catch (error) {
    // Error fetching action items
    if (error instanceof Error) {
      // Error in fetching action items
    }
    return [];
  }
};

export const completeActionItem = async (id: string): Promise<boolean> => {
  try {
    // This function is mainly for local state management
    // The actual completion status is determined by Podio data
    // But we can mark it as completed in the UI for better user experience
    const { error } = await supabase
      .from('action_items')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    // Error completing action item
    return false;
  }
};
