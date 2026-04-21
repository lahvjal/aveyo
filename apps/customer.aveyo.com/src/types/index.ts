// Project Types
export interface Milestone {
  id: string;
  name: string;
  description: string;
  status: 'completed' | 'in_progress' | 'scheduled' | 'pending';
  date?: string | null;
}

export interface MilestoneData {
  [key: string]: any;
}

export interface MilestoneObject {
  'pre-approvals'?: MilestoneData;
  approvals?: MilestoneData;
  construction?: MilestoneData;
  energization?: MilestoneData;
  [key: string]: MilestoneData | undefined;
}

export interface ProjectStatus {
  currentStage: {
    name: string;
    status: string;
  };
  nextMilestone: string;
  progressPercentage: number;
}

export interface Project {
  id: string;
  name: string;
  address: string;
  status: string;
  milestone: string | MilestoneObject; // Can be either a string (milestone name) or the full milestone object
  milestones?: Milestone[]; // Array of processed milestone objects
  customer_email?: string;
  customer_name?: string;
  system_size?: number;
  estimated_yearly_production?: number;
  project_manager?: string;
  updated_at: string;
  created_at?: string;
  project_complete?: string;
  sales_reps?: {
    id?: string;
    name: string;
    email: string;
    phone: string;
  };
  podio_data?: PodioData;
  raw_payload?: any; // Raw payload data from Podio
  calculatedStatus?: ProjectStatus; // Server-calculated status information
}

// Document Types
export interface Document {
  id: string;
  name: string;
  description: string;
  type: string;
  project_id: string;
  project_name: string;
  created_at: string;
  size: string;
  url?: string;
}

// Notification Types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  project_id?: string;
  customer_email?: string;
  created_at?: string;
}

// User Types
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}

// Action Item Types
export interface PodioData {
  'welcome-form-status'?: string;
  'welcome-form-completed-at'?: string;
  'sow-approval-status'?: string;
  'sow-approval-completed-at'?: string;
  // Customer actions can be directly in podio_data after processing
  'customer-actions'?: {
    'welcome-form'?: {
      'status': string;
      'due-date': string;
      'completed-date'?: string;
      'action-link'?: string;
      'message': string;
    };
    'customer-sow'?: {
      'status': string;
      'due-date': string;
      'completed-date'?: string;
      'action-link'?: string;
      'message': string;
    };
  };
  raw_payload?: {
    // Customer actions can also be in raw_payload
    'customer-actions'?: {
      'welcome-form'?: {
        'status': string;
        'due-date': string;
        'completed-date'?: string;
        'action-link'?: string;
        'message': string;
      };
      'customer-sow'?: {
        'status': string;
        'due-date': string;
        'completed-date'?: string;
        'action-link'?: string;
        'message': string;
      };
    };
    // Other milestone data fields at the same level as customer-actions
    'pre-approvals'?: any;
    'approvals'?: any;
    'construction'?: any;
    'energization'?: any;
    [key: string]: any; // Allow for other fields in raw_payload
  };
  [key: string]: any; // Allow for other Podio data fields
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'overdue';
  due_date: string;
  project_id: string;
  project_name?: string;
  project_address?: string;
  customer_email?: string;
  created_at: string;
  completed_at?: string;
  priority: 'high' | 'medium' | 'low';
  type: 'welcome_form' | 'sow_approval' | 'document_upload' | 'form_completion' | 'approval' | 'payment' | 'other';
  'form-url'?: string;
  document_link?: string;
}
