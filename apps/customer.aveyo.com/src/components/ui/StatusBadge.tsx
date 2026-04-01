import React from 'react';
import { MilestoneObject } from '@/types';

interface StatusBadgeProps {
  status: string | MilestoneObject;
  type?: 'milestone' | 'status';
  className?: string;
}

// Function to determine the current milestone text based on the milestone object
function getCurrentMilestoneText(milestoneObj: MilestoneObject): string {
  if (!milestoneObj) return 'Unknown';
  
  // Check energization (final stage)
  if (milestoneObj.energization?.['pto-received']) {
    return 'Permission to Operate';
  }
  
  // Check construction
  if (milestoneObj.construction?.['install-complete']) {
    return 'Installation Complete';
  }
  if (milestoneObj.construction?.['install-appointment']) {
    return 'Under Construction';
  }
  
  // Check approvals
  if (milestoneObj.approvals?.['all-permits-complete']) {
    return 'Approvals';
  }
  
  // Check pre-approvals
  if (milestoneObj['pre-approvals']?.['ntp-complete']) {
    return 'Pre-Approvals';
  }
  if (milestoneObj['pre-approvals']?.['engineering-complete']) {
    return 'System Design';
  }
  if (milestoneObj['pre-approvals']?.['site-survey-complete']) {
    return 'Site Survey';
  }
  
  return 'Design';
}

export default function StatusBadge({ 
  status, 
  type = 'status',
  className = '' 
}: StatusBadgeProps) {
  // Handle case where status is an object
  const statusText = typeof status === 'string' ? status : getCurrentMilestoneText(status as MilestoneObject);
  
  // Define color schemes based on status and type
  const getColorScheme = () => {
    if (type === 'milestone') {
      // Make sure we have a string before calling toLowerCase
      const statusLower = statusText.toLowerCase();
      
      switch (statusLower) {
        case 'pre-approvals':
          return 'bg-purple-100 text-purple-800';
        case 'approvals':
          return 'bg-blue-100 text-blue-800';
        case 'under construction':
          return 'bg-yellow-100 text-yellow-800';
        case 'pto':
        case 'permission to operate':
          return 'bg-green-100 text-green-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    } else {
      // Make sure we have a string before calling toLowerCase
      const statusLower = typeof statusText === 'string' ? statusText.toLowerCase() : '';
      
      switch (statusLower) {
        case 'completed':
        case 'approved':
          return 'bg-green-100 text-green-800';
        case 'in progress':
        case 'pending':
          return 'bg-blue-100 text-blue-800';
        case 'delayed':
          return 'bg-yellow-100 text-yellow-800';
        case 'cancelled':
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getColorScheme()} ${className}`}>
      {statusText}
    </span>
  );
}
