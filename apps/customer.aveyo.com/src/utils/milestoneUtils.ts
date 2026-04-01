// src/utils/milestoneUtils.ts
import { MilestoneObject } from '@/types';

// Define milestone keys and their customer-friendly display names
export const milestoneDisplayNames: Record<string, string> = {
  // Pre-Approvals
  'site-survey-complete': 'Site Survey',
  'ntp-complete': 'Notice to Proceed approved by financing',
  'engineering-complete': 'Engineering',
  
  // Approvals
  'pre-install-review-complete': 'All city and utility approvals submitted',
  
  // Construction
  'install-appointment': 'Confirmed Install Appointment Date',
  'install-complete': 'Install Substantial Completion',
  'ahj-inspection-complete': 'City and/or Utility Inspections',
  
  // Activation (formerly Energization)
  'pto-received': 'Permission To Operate Received from Utility Company',
  'energize-complete-date': 'System Active and Producing'
};

// Define milestone sequences for each section
export const milestoneSequence = {
  'pre-approvals': [
    { key: 'site-survey-complete', name: 'Site Survey' },
    { key: 'ntp-complete', name: 'Notice to Proceed approved by financing' },
    { key: 'engineering-complete', name: 'Engineering' }
  ],
  'approvals': [
    { key: 'pre-install-review-complete', name: 'All city and utility approvals submitted' }
  ],
  'construction': [
    { key: 'install-appointment', name: 'Confirmed Install Appointment Date' },
    { key: 'install-complete', name: 'Install Substantial Completion' },
    { key: 'ahj-inspection-complete', name: 'City and/or Utility Inspections' }
  ],
  'energization': [
    { key: 'pto-received', name: 'Permission To Operate Received from Utility Company' },
    { key: 'energize-complete-date', name: 'System Active and Producing' }
  ]
};

// Define section order
export const sectionOrder = ['pre-approvals', 'approvals', 'construction', 'energization'];

// Define section display names
export const sectionDisplayNames: Record<string, string> = {
  'pre-approvals': 'Pre-Approvals',
  'approvals': 'Approvals',
  'construction': 'Construction',
  'energization': 'Activation'
};

/**
 * Get the customer-friendly display name for a milestone key
 */
export function getMilestoneDisplayName(milestoneKey: string): string {
  return milestoneDisplayNames[milestoneKey] || milestoneKey;
}

/**
 * Get the next milestone display name based on project data
 */
export function getNextMilestoneDisplayName(nextMilestone: string | undefined | null): string {
  if (!nextMilestone) return 'In Progress';
  
  // Check if the nextMilestone is already a display name
  const allDisplayNames = Object.values(milestoneDisplayNames);
  if (allDisplayNames.includes(nextMilestone)) {
    return nextMilestone;
  }
  
  // Otherwise, try to convert from a milestone key to display name
  return getMilestoneDisplayName(nextMilestone) || nextMilestone;
}
