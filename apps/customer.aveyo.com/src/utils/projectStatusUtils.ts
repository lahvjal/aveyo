import { Project, MilestoneObject } from '../types';
import { milestoneSequence, sectionOrder, getMilestoneDisplayName } from './milestoneUtils';
import { extractProjectSections } from './projectMilestoneSections';

export interface ProjectStatus {
  currentStage: {
    name: string;
    status: string;
  };
  nextMilestone: string;
  progressPercentage: number;
}

/**
 * Helper function to check if a date string is valid
 */
export function hasValidDate(date: any): boolean {
  if (!date) return false;
  
  // If it's a string, it could be a date string or a boolean string
  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (trimmed === '') return false;
    
    // Check for common date formats
    if (/\d{4}-\d{2}-\d{2}/.test(trimmed)) return true; // YYYY-MM-DD
    if (/\d{2}\/\d{2}\/\d{4}/.test(trimmed)) return true; // MM/DD/YYYY
    if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(trimmed)) return true; // M/D/YY or M/D/YYYY
    
    // Check for boolean-like strings
    const lower = trimmed.toLowerCase();
    if (lower === 'true' || lower === 'yes' || lower === '1') return true;
    
    // If it's any non-empty string, consider it valid
    return true;
  }
  
  // Boolean or number values
  if (date === true || date === 1) return true;
  
  // Handle date objects
  if (date instanceof Date) return !isNaN(date.getTime());
  
  return false;
}

/**
 * Helper function to check if a status string indicates completion
 */
export function isStatusComplete(status: any): boolean {
  if (!status) return false;
  
  // Handle non-string values
  if (typeof status !== 'string') {
    return status === true || status === 1;
  }
  
  const lowerStatus = status.toLowerCase();
  
  // Check for common completion status terms
  return lowerStatus === 'complete' || 
         lowerStatus === 'completed' || 
         lowerStatus === 'approved' || 
         lowerStatus === 'done' || 
         lowerStatus === 'yes' || 
         lowerStatus === 'true';
}

// Define milestone types for type safety
type MilestoneKey = string;
type StatusKey = string | undefined;
type MilestoneInfo = { key: MilestoneKey; statusKey: StatusKey };
type SectionKey = 'pre-approvals' | 'approvals' | 'construction' | 'energization';

// Define the milestone sequence for each section with status keys
// Note: We're using a separate definition here because we need statusKey which isn't in the shared milestoneSequence
const milestoneStatusMap: Record<SectionKey, MilestoneInfo[]> = {
  'pre-approvals': [
    { key: 'site-survey-complete', statusKey: 'site-survey-status' },
    { key: 'ntp-complete', statusKey: undefined },
    { key: 'engineering-complete', statusKey: 'engineering-status' }
  ],
  'approvals': [
    { key: 'pre-install-review-complete', statusKey: undefined }
  ],
  'construction': [
    { key: 'install-appointment', statusKey: undefined },
    { key: 'install-complete', statusKey: undefined },
    { key: 'ahj-inspection-complete', statusKey: undefined }
  ],
  'energization': [
    { key: 'pto-received', statusKey: 'pto-status' },
    { key: 'energize-complete-date', statusKey: 'engergize-status' },
    { key: 'system-active', statusKey: undefined }
  ]
};

/**
 * Helper function to check if a milestone is directly completed based on date and status
 */
export function isDirectlyCompleted(date: any, status: any): boolean {
  // First check if we have a valid date value (most important indicator of completion)
  const dateValid = hasValidDate(date);
  
  // Then check if the status indicates completion
  const statusValid = isStatusComplete(status);
  
  // A milestone is completed if either condition is met
  return dateValid || statusValid;
}

/**
 * Determines if a milestone is completed based on date, status, or if a later milestone is completed
 * 
 * For our milestone data structure, we primarily check if the milestone has a date value
 * since dates indicate completion. We also check the status as a fallback.
 * 
 * Additionally, we infer completion if any later milestone in the same section or any
 * milestone in a subsequent section is completed.
 * 
 * @param date The milestone date
 * @param status The milestone status
 * @param milestoneKey The key of the milestone being checked
 * @param sectionKey The section the milestone belongs to
 * @param milestones Optional object containing all milestone data to check against
 */
export function isCompleted(date: any, status: any, milestoneKey?: string, sectionKey?: SectionKey, milestones?: any): boolean {
  // First check if the milestone is directly completed
  if (isDirectlyCompleted(date, status)) {
    return true;
  }
  
  // If we don't have milestone key, section key, or milestones data, we can't check for auto-completion
  if (!milestoneKey || !sectionKey || !milestones) {
    return false;
  }
  
  // Extract milestone data for each section
  const preApprovals = milestones.preApprovals || {};
  const approvals = milestones.approvals || {};
  const construction = milestones.construction || {};
  const energization = milestones.energization || {};
  
  // Check if any later milestone in this section is completed
  const section = milestoneStatusMap[sectionKey as keyof typeof milestoneStatusMap];
  const currentIndex = section.findIndex((item: MilestoneInfo) => item.key === milestoneKey);
  
  if (currentIndex >= 0) {
    // Check if any later milestone in this section is completed
    for (let i = currentIndex + 1; i < section.length; i++) {
      const laterMilestone = section[i];
      const laterDate = sectionKey === 'pre-approvals' ? preApprovals[laterMilestone.key] :
                       sectionKey === 'approvals' ? approvals[laterMilestone.key] :
                       sectionKey === 'construction' ? construction[laterMilestone.key] :
                       energization[laterMilestone.key];
      
      const laterStatus = laterMilestone.statusKey ? 
                         (sectionKey === 'pre-approvals' ? preApprovals[laterMilestone.statusKey] :
                          sectionKey === 'approvals' ? approvals[laterMilestone.statusKey] :
                          sectionKey === 'construction' ? construction[laterMilestone.statusKey] :
                          energization[laterMilestone.statusKey]) : undefined;
      
      if (isDirectlyCompleted(laterDate, laterStatus)) {
        return true;
      }
    }
  }
  
  // Check if any milestone in a later section is completed
  const currentSectionIndex = sectionOrder.indexOf(sectionKey);
  
  for (let s = currentSectionIndex + 1; s < sectionOrder.length; s++) {
    const laterSectionKey = sectionOrder[s];
    const laterSection = milestoneStatusMap[laterSectionKey as keyof typeof milestoneStatusMap];
    
    for (const laterMilestone of laterSection) {
      const laterDate = laterSectionKey === 'pre-approvals' ? preApprovals[laterMilestone.key] :
                       laterSectionKey === 'approvals' ? approvals[laterMilestone.key] :
                       laterSectionKey === 'construction' ? construction[laterMilestone.key] :
                       energization[laterMilestone.key];
      
      const laterStatus = laterMilestone.statusKey ? 
                         (laterSectionKey === 'pre-approvals' ? preApprovals[laterMilestone.statusKey] :
                          laterSectionKey === 'approvals' ? approvals[laterMilestone.statusKey] :
                          laterSectionKey === 'construction' ? construction[laterMilestone.statusKey] :
                          energization[laterMilestone.statusKey]) : undefined;
      
      if (isDirectlyCompleted(laterDate, laterStatus)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Calculate the project status including current stage, next milestone, and progress percentage
 */
export function calculateProjectStatus(project: Project): ProjectStatus {
  const sections = extractProjectSections(project);
  const preApprovals = sections['pre-approvals'] as Record<string, unknown>;
  const approvals = sections.approvals as Record<string, unknown>;
  const construction = sections.construction as Record<string, unknown>;
  const energization = sections.energization as Record<string, unknown>;

  // Prepare complete milestones object for auto-completion logic
  const allMilestones = {
    preApprovals,
    approvals,
    construction,
    energization
  };
  
  // Calculate section statuses
  const getSectionStatus = (section: SectionKey): { status: string } => {
    let status = 'Not Started';
    let allCompleted = false;
    let anyCompleted = false;
    
    if (section === 'pre-approvals') {
      const siteCompleted = isCompleted(
        preApprovals['site-survey-complete'],
        preApprovals['site-survey-status'],
        'site-survey-complete',
        section,
        allMilestones
      );
      const ntpCompleted = isCompleted(preApprovals['ntp-complete'], undefined, 'ntp-complete', section, allMilestones);
      const engineeringCompleted = isCompleted(
        preApprovals['engineering-complete'],
        preApprovals['engineering-status'],
        'engineering-complete',
        section,
        allMilestones
      );
      
      // console.log(`Pre-Approvals completion: site=${siteCompleted}, ntp=${ntpCompleted}, engineering=${engineeringCompleted}`);
      
      allCompleted = siteCompleted && ntpCompleted && engineeringCompleted;
      anyCompleted = siteCompleted || ntpCompleted || engineeringCompleted;
    } else if (section === 'approvals') {
      const reviewCompleted = isCompleted(approvals['pre-install-review-complete'], undefined, 'pre-install-review-complete', section, allMilestones);
      
      // console.log(`Approvals completion: review=${reviewCompleted}`);
      
      allCompleted = reviewCompleted;
      anyCompleted = reviewCompleted;
    } else if (section === 'construction') {
      const appointmentCompleted = isCompleted(construction['install-appointment'], undefined, 'install-appointment', section, allMilestones);
      const installCompleted = isCompleted(construction['install-complete'], undefined, 'install-complete', section, allMilestones);
      const inspectionCompleted = isCompleted(construction['ahj-inspection-complete'], undefined, 'ahj-inspection-complete', section, allMilestones);
      
      // console.log(`Construction completion: appointment=${appointmentCompleted}, install=${installCompleted}, inspection=${inspectionCompleted}`);
      
      allCompleted = appointmentCompleted && installCompleted && inspectionCompleted;
      anyCompleted = appointmentCompleted || installCompleted || inspectionCompleted;
    } else if (section === 'energization') {
      const ptoCompleted = isCompleted(
        energization['pto-received'],
        energization['pto-status'],
        'pto-received',
        section,
        allMilestones
      );
      const energizeCompleted = isCompleted(
        energization['energize-complete-date'],
        energization['engergize-status'],
        'energize-complete-date',
        section,
        allMilestones
      );
      const systemActiveCompleted = isCompleted(
        energization['system-active'],
        undefined,
        'system-active',
        section,
        allMilestones
      );

      allCompleted = ptoCompleted && energizeCompleted && systemActiveCompleted;
      anyCompleted = ptoCompleted || energizeCompleted || systemActiveCompleted;
    }

    if (allCompleted) {
      status = 'Completed';
    } else if (anyCompleted) {
      status = 'In Progress';
    }

    // console.log(`${section} status: ${status} (allCompleted=${allCompleted}, anyCompleted=${anyCompleted})`);
    return { status };
  };
  
  // Get status for each section
  const preApprovalStatus = getSectionStatus('pre-approvals');
  const approvalsStatus = getSectionStatus('approvals');
  const constructionStatus = getSectionStatus('construction');
  const energizationStatus = getSectionStatus('energization');
  
  // Calculate progress percentage
  let completedMilestones = 0;
  const totalMilestones = 10; // 3 + 1 + 3 + 3 activation milestones

  // Count completed milestones (must match dashboard stage definitions)
  if (
    isCompleted(
      preApprovals['site-survey-complete'],
      preApprovals['site-survey-status'],
      'site-survey-complete',
      'pre-approvals',
      allMilestones
    )
  ) {
    completedMilestones++;
  }
  if (isCompleted(preApprovals['ntp-complete'], undefined, 'ntp-complete', 'pre-approvals', allMilestones)) {
    completedMilestones++;
  }
  if (
    isCompleted(
      preApprovals['engineering-complete'],
      preApprovals['engineering-status'],
      'engineering-complete',
      'pre-approvals',
      allMilestones
    )
  ) {
    completedMilestones++;
  }
  if (
    isCompleted(
      approvals['pre-install-review-complete'],
      undefined,
      'pre-install-review-complete',
      'approvals',
      allMilestones
    )
  ) {
    completedMilestones++;
  }
  if (
    isCompleted(
      construction['install-appointment'],
      undefined,
      'install-appointment',
      'construction',
      allMilestones
    )
  ) {
    completedMilestones++;
  }
  if (
    isCompleted(construction['install-complete'], undefined, 'install-complete', 'construction', allMilestones)
  ) {
    completedMilestones++;
  }
  if (
    isCompleted(
      construction['ahj-inspection-complete'],
      undefined,
      'ahj-inspection-complete',
      'construction',
      allMilestones
    )
  ) {
    completedMilestones++;
  }
  if (
    isCompleted(energization['pto-received'], energization['pto-status'], 'pto-received', 'energization', allMilestones)
  ) {
    completedMilestones++;
  }
  if (
    isCompleted(
      energization['energize-complete-date'],
      energization['engergize-status'],
      'energize-complete-date',
      'energization',
      allMilestones
    )
  ) {
    completedMilestones++;
  }
  if (
    isCompleted(energization['system-active'], undefined, 'system-active', 'energization', allMilestones)
  ) {
    completedMilestones++;
  }
  
  // Calculate percentage
  const progressPercentage = Math.round((completedMilestones / totalMilestones) * 100);
  
  // Determine current stage and next milestone
  let currentStage = { name: 'Pre-Approvals', status: 'Not Started' };
  let nextMilestone = getMilestoneDisplayName('site-survey-complete');

  // Find the next incomplete milestone
  const findNextMilestone = (): string => {
    if (
      !isCompleted(
        preApprovals['site-survey-complete'],
        preApprovals['site-survey-status'],
        'site-survey-complete',
        'pre-approvals',
        allMilestones
      )
    ) {
      return getMilestoneDisplayName('site-survey-complete');
    }
    if (!isCompleted(preApprovals['ntp-complete'], undefined, 'ntp-complete', 'pre-approvals', allMilestones)) {
      return getMilestoneDisplayName('ntp-complete');
    }
    if (
      !isCompleted(
        preApprovals['engineering-complete'],
        preApprovals['engineering-status'],
        'engineering-complete',
        'pre-approvals',
        allMilestones
      )
    ) {
      return getMilestoneDisplayName('engineering-complete');
    }

    if (
      !isCompleted(
        approvals['pre-install-review-complete'],
        undefined,
        'pre-install-review-complete',
        'approvals',
        allMilestones
      )
    ) {
      return getMilestoneDisplayName('pre-install-review-complete');
    }

    if (
      !isCompleted(
        construction['install-appointment'],
        undefined,
        'install-appointment',
        'construction',
        allMilestones
      )
    ) {
      return getMilestoneDisplayName('install-appointment');
    }
    if (
      !isCompleted(construction['install-complete'], undefined, 'install-complete', 'construction', allMilestones)
    ) {
      return getMilestoneDisplayName('install-complete');
    }
    if (
      !isCompleted(
        construction['ahj-inspection-complete'],
        undefined,
        'ahj-inspection-complete',
        'construction',
        allMilestones
      )
    ) {
      return getMilestoneDisplayName('ahj-inspection-complete');
    }

    if (
      !isCompleted(
        energization['pto-received'],
        energization['pto-status'],
        'pto-received',
        'energization',
        allMilestones
      )
    ) {
      return getMilestoneDisplayName('pto-received');
    }
    if (
      !isCompleted(
        energization['energize-complete-date'],
        energization['engergize-status'],
        'energize-complete-date',
        'energization',
        allMilestones
      )
    ) {
      return getMilestoneDisplayName('energize-complete-date');
    }
    if (
      !isCompleted(energization['system-active'], undefined, 'system-active', 'energization', allMilestones)
    ) {
      return getMilestoneDisplayName('system-active');
    }

    return 'Project Complete';
  };
  
  // Determine the current stage based on section statuses
  if (energizationStatus.status === 'Completed') {
    // All sections are completed
    currentStage = { name: 'Completed', status: 'completed' };
    nextMilestone = 'Project Complete';
  } else if (energizationStatus.status === 'In Progress') {
    // Energization is in progress
    currentStage = { name: 'Energization', status: 'in_progress' };
    nextMilestone = findNextMilestone();
  } else if (constructionStatus.status === 'Completed') {
    // Construction is completed, energization is next and automatically in progress
    currentStage = { name: 'Energization', status: 'in_progress' };
    nextMilestone = getMilestoneDisplayName('pto-received');
  } else if (constructionStatus.status === 'In Progress') {
    // Construction is in progress
    currentStage = { name: 'Construction', status: 'in_progress' };
    nextMilestone = findNextMilestone();
  } else if (approvalsStatus.status === 'Completed') {
    // Approvals are completed, construction is next and automatically in progress
    currentStage = { name: 'Construction', status: 'in_progress' };
    nextMilestone = getMilestoneDisplayName('install-appointment');
  } else if (approvalsStatus.status === 'In Progress') {
    // Approvals are in progress
    currentStage = { name: 'Approvals', status: 'in_progress' };
    nextMilestone = getMilestoneDisplayName('pre-install-review-complete');
  } else if (preApprovalStatus.status === 'Completed') {
    // Pre-approvals are completed, approvals are next and automatically in progress
    currentStage = { name: 'Approvals', status: 'in_progress' };
    nextMilestone = getMilestoneDisplayName('pre-install-review-complete');
  } else if (preApprovalStatus.status === 'In Progress') {
    // Pre-approvals are in progress
    currentStage = { name: 'Pre-Approvals', status: 'in_progress' };
    nextMilestone = findNextMilestone();
  } else {
    // Default case - project is in pre-approvals
    currentStage = { name: 'Pre-Approvals', status: 'not_started' };
    nextMilestone = getMilestoneDisplayName('site-survey-complete');
  }

  // Direct check for construction milestones to override the sequential logic if needed
  const hasConstructionActivity =
    isCompleted(
      construction['install-appointment'],
      undefined,
      'install-appointment',
      'construction',
      allMilestones
    ) ||
    isCompleted(construction['install-complete'], undefined, 'install-complete', 'construction', allMilestones) ||
    isCompleted(
      construction['ahj-inspection-complete'],
      undefined,
      'ahj-inspection-complete',
      'construction',
      allMilestones
    );
  
  // console.log(`Has construction activity: ${hasConstructionActivity}`);
  
  if (hasConstructionActivity && currentStage.name !== 'Energization' && currentStage.name !== 'Completed') {
    // console.log(`Overriding current stage to Construction due to construction activity`);
    currentStage = { name: 'Construction', status: constructionStatus.status === 'Completed' ? 'completed' : 'in_progress' };
    nextMilestone = findNextMilestone();
  }
  
  // Ensure that the current stage is always in_progress, even if none of its milestones
  // have been completed yet (unless it's explicitly completed or not_started)
  if (currentStage.status === 'not_started' && currentStage.name !== 'Completed') {
    // If we're showing a stage as the current stage, it should be in_progress
    // console.log(`Setting current stage ${currentStage.name} to in_progress as it's the active stage`);
    currentStage.status = 'in_progress';
  }
  
  // Normalize status values to match the Project interface
  if (currentStage.status === 'Not Started') currentStage.status = 'not_started';
  if (currentStage.status === 'In Progress') currentStage.status = 'in_progress';
  if (currentStage.status === 'Completed') currentStage.status = 'completed';
  
  // console.log('Final calculated status:', {
  //   currentStage,
  //   nextMilestone,
  //   progressPercentage,
  //   milestoneData
  // });
  
  return {
    currentStage,
    nextMilestone,
    progressPercentage
  };
}
