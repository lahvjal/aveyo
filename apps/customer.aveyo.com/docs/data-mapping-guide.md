# Aveyo Customer Portal - Data Mapping Guide

## Overview

This document provides comprehensive data mapping information for the Aveyo Customer Portal mobile app. It details how data flows from Supabase to the application, including field mappings, data transformations, and calculation logic.

---

## Table of Contents

1. [Database Schema](#database-schema)
2. [Data Flow Architecture](#data-flow-architecture)
3. [Field Mappings](#field-mappings)
4. [Milestone Data Structure](#milestone-data-structure)
5. [Progress Calculation Logic](#progress-calculation-logic)
6. [Action Items Mapping](#action-items-mapping)
7. [Notifications Generation](#notifications-generation)
8. [Data Transformation Examples](#data-transformation-examples)

---

## Database Schema

### Supabase Tables

#### 1. `podio_data` Table
Primary table for project information.

| Column Name | Type | Description | Nullable |
|------------|------|-------------|----------|
| `id` | UUID | Primary key | No |
| `email` | TEXT | Customer email (filter key) | No |
| `project_id` | TEXT | Project identifier | Yes |
| `raw_payload` | JSONB | Complete project data from Podio | Yes |
| `created_at` | TIMESTAMP | Record creation time | No |
| `updated_at` | TIMESTAMP | Last update time | No |
| `project_complete` | TEXT | Project completion date | Yes |

**RLS Policy**: Users can only access records where `email` matches their authenticated email.

#### 2. `user_profiles` Table
User profile information.

| Column Name | Type | Description | Nullable |
|------------|------|-------------|----------|
| `id` | UUID | Primary key (matches auth.users.id) | No |
| `email` | TEXT | User email | No |
| `full_name` | TEXT | User's full name | Yes |
| `phone` | TEXT | Phone number | Yes |
| `avatar_url` | TEXT | Profile picture URL | Yes |
| `created_at` | TIMESTAMP | Account creation time | No |
| `updated_at` | TIMESTAMP | Last profile update | No |

**RLS Policy**: Users can only access their own profile.

#### 3. `documents` Table
Project documents (optional feature).

| Column Name | Type | Description | Nullable |
|------------|------|-------------|----------|
| `id` | UUID | Primary key | No |
| `email` | TEXT | Customer email | No |
| `project_id` | TEXT | Associated project ID | No |
| `name` | TEXT | Document name | No |
| `type` | TEXT | Document type | No |
| `url` | TEXT | Document URL | Yes |
| `created_at` | TIMESTAMP | Upload time | No |

**RLS Policy**: Users can only access documents for their email.

#### 4. `notifications` Table
System notifications (currently generated dynamically).

| Column Name | Type | Description | Nullable |
|------------|------|-------------|----------|
| `id` | UUID | Primary key | No |
| `customer_email` | TEXT | Target customer | No |
| `project_id` | TEXT | Related project | Yes |
| `title` | TEXT | Notification title | No |
| `message` | TEXT | Notification content | No |
| `type` | TEXT | Notification type | No |
| `read` | BOOLEAN | Read status | No |
| `created_at` | TIMESTAMP | Creation time | No |

---

## Data Flow Architecture

```
┌─────────────────┐
│  Podio (CRM)    │
│  Project Data   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Supabase DB   │
│  podio_data     │
│  raw_payload    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Data Service   │
│  Parsing &      │
│  Transformation │
└────────┬────────┘
         │
         ├──────────────┬──────────────┬──────────────┐
         ▼              ▼              ▼              ▼
    ┌─────────┐   ┌──────────┐  ┌───────────┐  ┌────────────┐
    │Projects │   │Milestones│  │ Action    │  │Notifications│
    │  List   │   │ Timeline │  │  Items    │  │   Feed     │
    └─────────┘   └──────────┘  └───────────┘  └────────────┘
         │              │              │              │
         └──────────────┴──────────────┴──────────────┘
                         │
                         ▼
                  ┌─────────────┐
                  │  Mobile App │
                  │  UI Display │
                  └─────────────┘
```

---

## Field Mappings

### Project Object Mapping

#### From `podio_data.raw_payload` → `Project` Interface

| Podio Field | Project Field | Type | Transformation |
|------------|---------------|------|----------------|
| `item-id` | `id` | string | Convert to string |
| `email` | `customer_email` | string | Direct map |
| `address` | `address` (partial) | string | Combine address, city, state, zip |
| `city` | `address` (partial) | string | Part of full address |
| `state` | `address` (partial) | string | Part of full address |
| `zip` | `address` (partial) | string | Part of full address |
| `customer-name` | `name` (partial) | string | Used in project name |
| `system-size` | `system_size` | number | Direct map |
| `estimated-yearly-production` | `estimated_yearly_production` | number | Direct map |
| `project-manager` | `project_manager` | string | Direct map |
| `sales-rep-id` | `sales_reps.id` | string | Map to sales_reps object |
| `sales-rep-name` | `sales_reps.name` | string | Map to sales_reps object |
| `sales-rep-email` | `sales_reps.email` | string | Map to sales_reps object |
| `sales-rep-phone` | `sales_reps.phone` | string | Map to sales_reps object |
| `home-photo-url` | (display) | string | Used for project images |
| `pre-approvals` | `milestone.pre-approvals` | object | Parse and structure |
| `approvals` | `milestone.approvals` | object | Parse and structure |
| `construction` | `milestone.construction` | object | Parse and structure |
| `energization` | `milestone.energization` | object | Parse and structure |
| `customer-actions` | `podio_data.customer-actions` | object | Map to action items |

#### Address Formatting Logic

```typescript
const formatAddress = (data: any): string => {
  const address = data.address || '';
  const city = data.city || '';
  const state = data.state || '';
  const zip = data.zip || '';
  
  if (!address) return 'Address not available';
  
  return `${address}, ${city}, ${state} ${zip}`.trim();
};
```

#### Project Name Generation

```typescript
const generateProjectName = (data: any): string => {
  const customerName = data['customer-name'] || 
                      data.email?.split('@')[0] || 
                      'Customer';
  return `Solar Installation - ${customerName}`;
};
```

---

## Milestone Data Structure

### Raw Podio Structure

The `raw_payload` field contains milestone data in nested JSON structure:

```json
{
  "item-id": "12345",
  "email": "customer@example.com",
  "address": "123 Solar St",
  "raw_payload": {
    "pre-approvals": {
      "site-survey-complete": "2024-01-15",
      "site-survey-status": "complete",
      "ntp-complete": "2024-01-20",
      "engineering-complete": "2024-02-01",
      "engineering-status": "complete"
    },
    "approvals": {
      "pre-install-review-complete": "2024-02-15"
    },
    "construction": {
      "install-appointment": "2024-03-10",
      "install-complete": "2024-03-12",
      "ahj-inspection-complete": "2024-03-15"
    },
    "energization": {
      "pto-received": "2024-04-01",
      "pto-status": "approved",
      "energize-complete-date": "2024-04-05",
      "engergize-status": "complete"
    },
    "customer-actions": {
      "welcome-form": {
        "status": "pending",
        "due-date": "2024-01-10",
        "message": "Please complete your welcome form",
        "form-url": "https://example.com/form/123"
      },
      "customer-sow": {
        "status": "completed",
        "due-date": "2024-01-25",
        "completed-date": "2024-01-23",
        "message": "Review and approve your Statement of Work",
        "form-url": "https://example.com/sow/123"
      }
    }
  }
}
```

### Parsed Milestone Structure

After parsing by `parseMilestoneData()` function:

```typescript
interface MilestoneObject {
  'pre-approvals': {
    'site-survey-complete'?: string | boolean;
    'site-survey-status'?: string;
    'ntp-complete'?: string | boolean;
    'engineering-complete'?: string | boolean;
    'engineering-status'?: string;
  };
  approvals: {
    'pre-install-review-complete'?: string | boolean;
  };
  construction: {
    'install-appointment'?: string;
    'install-complete'?: string | boolean;
    'ahj-inspection-complete'?: string | boolean;
  };
  energization: {
    'pto-received'?: string | boolean;
    'pto-status'?: string;
    'energize-complete-date'?: string;
    'engergize-status'?: string;
  };
}
```

### Milestone Field Types

Milestone fields can have multiple value types:

| Value Type | Interpretation | Example |
|-----------|----------------|---------|
| Date string | Completed on that date | `"2024-01-15"` |
| Boolean `true` | Completed | `true` |
| String "complete" | Completed | `"complete"` |
| String "approved" | Completed | `"approved"` |
| String "done" | Completed | `"done"` |
| `null` / `undefined` / `""` | Not completed | `null` |
| Any other string | Not completed | `"pending"` |

### Milestone Parsing Logic

```typescript
// Check if milestone is completed
function isCompleted(date: any, status: any): boolean {
  // Check date field
  if (date) {
    if (typeof date === 'string' && date.trim() !== '') {
      // Has a date string = completed
      return true;
    }
    if (date === true) {
      return true;
    }
  }
  
  // Check status field
  if (status) {
    const lowerStatus = String(status).toLowerCase();
    return ['complete', 'completed', 'approved', 'done', 'yes', 'true'].includes(lowerStatus);
  }
  
  return false;
}
```

---

## Progress Calculation Logic

### Total Milestones: 9

The project progress is calculated based on 9 key milestones across 4 stages:

#### Pre-Approvals (3 milestones)
1. Site Survey Complete
2. Notice to Proceed (NTP) Complete
3. Engineering Complete

#### Approvals (1 milestone)
4. Pre-Install Review Complete

#### Construction (3 milestones)
5. Install Appointment Scheduled
6. Installation Complete
7. AHJ Inspection Complete

#### Activation/Energization (2 milestones)
8. PTO (Permission to Operate) Received
9. System Energized/Active

### Progress Percentage Formula

```typescript
progressPercentage = (completedMilestones / 9) * 100
```

### Current Stage Determination

The current stage is determined by which section has incomplete milestones:

```typescript
function determineCurrentStage(milestones: MilestoneObject): string {
  // Check Pre-Approvals
  if (!allPreApprovalsComplete) {
    return 'Pre-Approvals';
  }
  
  // Check Approvals
  if (!allApprovalsComplete) {
    return 'Approvals';
  }
  
  // Check Construction
  if (!allConstructionComplete) {
    return 'Construction';
  }
  
  // Check Energization
  if (!allEnergizationComplete) {
    return 'Activation';
  }
  
  // All complete
  return 'Completed';
}
```

### Next Milestone Logic

The next milestone is the first incomplete milestone in sequence:

```typescript
const milestoneSequence = [
  { key: 'site-survey-complete', name: 'Site Survey' },
  { key: 'ntp-complete', name: 'Notice to Proceed' },
  { key: 'engineering-complete', name: 'Engineering' },
  { key: 'pre-install-review-complete', name: 'Pre-Install Review' },
  { key: 'install-appointment', name: 'Installation Appointment' },
  { key: 'install-complete', name: 'Installation Complete' },
  { key: 'ahj-inspection-complete', name: 'Inspection Complete' },
  { key: 'pto-received', name: 'PTO Received' },
  { key: 'energize-complete-date', name: 'System Energized' }
];

function findNextMilestone(milestones: MilestoneObject): string {
  for (const milestone of milestoneSequence) {
    if (!isCompleted(milestones[milestone.key])) {
      return milestone.name;
    }
  }
  return 'Project Complete';
}
```

### Calculated Status Object

```typescript
interface ProjectStatus {
  currentStage: {
    name: 'Pre-Approvals' | 'Approvals' | 'Construction' | 'Activation' | 'Completed';
    status: 'not_started' | 'in_progress' | 'completed';
  };
  nextMilestone: string;
  progressPercentage: number; // 0-100
}
```

### Example Calculations

#### Example 1: Early Stage Project
```json
{
  "pre-approvals": {
    "site-survey-complete": "2024-01-15",
    "ntp-complete": null,
    "engineering-complete": null
  },
  "approvals": {},
  "construction": {},
  "energization": {}
}
```
**Result:**
- Completed: 1/9 = 11%
- Current Stage: Pre-Approvals (in_progress)
- Next Milestone: Notice to Proceed

#### Example 2: Mid-Stage Project
```json
{
  "pre-approvals": {
    "site-survey-complete": "2024-01-15",
    "ntp-complete": "2024-01-20",
    "engineering-complete": "2024-02-01"
  },
  "approvals": {
    "pre-install-review-complete": "2024-02-15"
  },
  "construction": {
    "install-appointment": "2024-03-10",
    "install-complete": null,
    "ahj-inspection-complete": null
  },
  "energization": {}
}
```
**Result:**
- Completed: 5/9 = 56%
- Current Stage: Construction (in_progress)
- Next Milestone: Installation Complete

#### Example 3: Nearly Complete Project
```json
{
  "pre-approvals": { /* all complete */ },
  "approvals": { /* all complete */ },
  "construction": { /* all complete */ },
  "energization": {
    "pto-received": "2024-04-01",
    "energize-complete-date": null
  }
}
```
**Result:**
- Completed: 8/9 = 89%
- Current Stage: Activation (in_progress)
- Next Milestone: System Energized

---

## Action Items Mapping

### Source: `customer-actions` in `raw_payload`

Action items are extracted from the `customer-actions` object within the project's `raw_payload`.

### Action Item Types

Currently supported action types:

1. **Welcome Form** - Initial customer intake form
2. **Customer SOW** - Statement of Work approval

### Field Mapping

#### Welcome Form Action

| Podio Field | ActionItem Field | Type | Notes |
|------------|------------------|------|-------|
| `customer-actions.welcome-form.status` | `status` | string | Mapped to: pending/completed/overdue |
| `customer-actions.welcome-form.due-date` | `due_date` | string (ISO) | Converted to ISO date |
| `customer-actions.welcome-form.message` | `description` | string | Direct map |
| `customer-actions.welcome-form.form-url` | `form-url` | string | Action link |
| `customer-actions.welcome-form.completed-date` | `completed_at` | string (ISO) | If completed |
| (generated) | `title` | string | "Welcome Form" |
| (generated) | `type` | string | "welcome_form" |
| (generated) | `priority` | string | "high" |

#### SOW Approval Action

| Podio Field | ActionItem Field | Type | Notes |
|------------|------------------|------|-------|
| `customer-actions.customer-sow.status` | `status` | string | Mapped to: pending/completed/overdue |
| `customer-actions.customer-sow.due-date` | `due_date` | string (ISO) | Converted to ISO date |
| `customer-actions.customer-sow.message` | `description` | string | Direct map |
| `customer-actions.customer-sow.form-url` | `form-url` | string | Action link |
| `customer-actions.customer-sow.completed-date` | `completed_at` | string (ISO) | If completed |
| (generated) | `title` | string | "Customer SOW Approval" |
| (generated) | `type` | string | "sow_approval" |
| (generated) | `priority` | string | "high" |

### Status Mapping Logic

```typescript
function mapStatusToValidType(status: string): 'completed' | 'pending' | 'overdue' {
  const statusLower = status.toLowerCase();
  
  // Completed statuses
  if (['completed', 'approved', 'done'].includes(statusLower)) {
    return 'completed';
  }
  
  // Overdue statuses
  if (['overdue', 'late'].includes(statusLower)) {
    return 'overdue';
  }
  
  // Default to pending
  return 'pending';
}
```

### Overdue Calculation

Action items are marked as overdue if:
- Status is `'pending'`
- AND `due_date` < current date

```typescript
function checkOverdue(item: ActionItem): ActionItem {
  if (item.status === 'pending') {
    const dueDate = new Date(item.due_date);
    const now = new Date();
    
    if (dueDate < now) {
      return { ...item, status: 'overdue' };
    }
  }
  
  return item;
}
```

### ActionItem Interface

```typescript
interface ActionItem {
  id: string;                    // Generated: "welcome-form-{projectId}"
  title: string;                 // "Welcome Form" or "Customer SOW Approval"
  description: string;           // From message field
  status: 'pending' | 'completed' | 'overdue';
  due_date: string;             // ISO date string
  project_id: string;           // Associated project ID
  project_name?: string;        // Project name for display
  project_address?: string;     // Project address for display
  customer_email?: string;      // Customer email
  created_at: string;           // ISO date string
  completed_at?: string;        // ISO date string (if completed)
  priority: 'high' | 'medium' | 'low';
  type: 'welcome_form' | 'sow_approval' | 'document_upload' | 
        'form_completion' | 'approval' | 'payment' | 'other';
  'form-url'?: string;          // Link to external form
  document_link?: string;       // Link to document (optional)
}
```

### Example Action Item Generation

**Input from Podio:**
```json
{
  "customer-actions": {
    "welcome-form": {
      "status": "pending",
      "due-date": "2024-01-10",
      "message": "Please complete your welcome form to help us get started with your project.",
      "form-url": "https://forms.aveyo.com/welcome/abc123"
    }
  }
}
```

**Output ActionItem:**
```json
{
  "id": "welcome-form-12345",
  "title": "Welcome Form",
  "description": "Please complete your welcome form to help us get started with your project.",
  "status": "pending",
  "due_date": "2024-01-10T00:00:00.000Z",
  "project_id": "12345",
  "project_name": "Solar Installation - John Smith",
  "project_address": "123 Solar St, Phoenix, AZ 85001",
  "customer_email": "john.smith@example.com",
  "created_at": "2024-01-05T10:30:00.000Z",
  "priority": "high",
  "type": "welcome_form",
  "form-url": "https://forms.aveyo.com/welcome/abc123"
}
```

---

## Notifications Generation

Notifications are currently generated dynamically from project milestone data (not stored in database).

### Notification Types

1. **Milestone Completed** - When a major milestone is completed
2. **Installation Scheduled** - When installation appointment is set
3. **Status Update** - General project status changes

### Notification Generation Logic

```typescript
function generateNotifications(projects: Project[]): Notification[] {
  const notifications: Notification[] = [];
  
  projects.forEach(project => {
    const milestone = project.milestone as MilestoneObject;
    
    // Site Survey Completed
    if (milestone['pre-approvals']?.['site-survey-complete']) {
      notifications.push({
        id: `${project.id}-site-survey`,
        title: 'Milestone Completed',
        message: `Site Survey phase has been completed for your project at ${project.address}`,
        type: 'milestone',
        read: false,
        project_id: project.id,
        customer_email: project.customer_email,
        created_at: milestone['pre-approvals']['site-survey-complete']
      });
    }
    
    // Installation Scheduled (but not completed)
    if (milestone.construction?.['install-appointment'] && 
        !milestone.construction?.['install-complete']) {
      const installDate = new Date(milestone.construction['install-appointment']);
      notifications.push({
        id: `${project.id}-install-scheduled`,
        title: 'Installation Scheduled',
        message: `Your solar installation has been scheduled for ${installDate.toLocaleDateString()}`,
        type: 'status',
        read: false,
        project_id: project.id,
        customer_email: project.customer_email,
        created_at: new Date().toISOString()
      });
    }
    
    // Add more notification types as needed...
  });
  
  // Sort by date (newest first)
  return notifications.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
```

### Notification Interface

```typescript
interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'milestone' | 'status' | 'action' | 'announcement';
  read: boolean;
  project_id?: string;
  customer_email?: string;
  created_at?: string;
}
```

---

## Data Transformation Examples

### Complete Data Flow Example

#### 1. Raw Supabase Query Result

```json
{
  "id": "uuid-123",
  "email": "customer@example.com",
  "project_id": "12345",
  "raw_payload": {
    "item-id": "12345",
    "customer-name": "John Smith",
    "address": "123 Solar St",
    "city": "Phoenix",
    "state": "AZ",
    "zip": "85001",
    "system-size": 8.5,
    "estimated-yearly-production": 12500,
    "project-manager": "Jane Doe",
    "sales-rep-name": "Bob Johnson",
    "sales-rep-email": "bob@aveyo.com",
    "sales-rep-phone": "(555) 123-4567",
    "home-photo-url": "https://photos.aveyo.com/12345.jpg",
    "pre-approvals": {
      "site-survey-complete": "2024-01-15",
      "ntp-complete": "2024-01-20",
      "engineering-complete": "2024-02-01"
    },
    "approvals": {
      "pre-install-review-complete": "2024-02-15"
    },
    "construction": {
      "install-appointment": "2024-03-10",
      "install-complete": null,
      "ahj-inspection-complete": null
    },
    "energization": {},
    "customer-actions": {
      "welcome-form": {
        "status": "completed",
        "due-date": "2024-01-10",
        "completed-date": "2024-01-08",
        "message": "Complete your welcome form",
        "form-url": "https://forms.aveyo.com/welcome/12345"
      },
      "customer-sow": {
        "status": "pending",
        "due-date": "2024-01-25",
        "message": "Review and approve your Statement of Work",
        "form-url": "https://forms.aveyo.com/sow/12345"
      }
    }
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-03-01T12:00:00Z"
}
```

#### 2. Transformed Project Object

```typescript
{
  id: "12345",
  name: "Solar Installation - John Smith",
  address: "123 Solar St, Phoenix, AZ 85001",
  status: "in_progress",
  milestone: {
    'pre-approvals': {
      'site-survey-complete': "2024-01-15",
      'ntp-complete': "2024-01-20",
      'engineering-complete': "2024-02-01"
    },
    approvals: {
      'pre-install-review-complete': "2024-02-15"
    },
    construction: {
      'install-appointment': "2024-03-10",
      'install-complete': null,
      'ahj-inspection-complete': null
    },
    energization: {}
  },
  customer_email: "customer@example.com",
  system_size: 8.5,
  estimated_yearly_production: 12500,
  project_manager: "Jane Doe",
  sales_reps: {
    name: "Bob Johnson",
    email: "bob@aveyo.com",
    phone: "(555) 123-4567"
  },
  updated_at: "2024-03-01T12:00:00Z",
  created_at: "2024-01-01T00:00:00Z",
  podio_data: {
    'customer-actions': { /* ... */ },
    raw_payload: { /* ... */ }
  },
  calculatedStatus: {
    currentStage: {
      name: "Construction",
      status: "in_progress"
    },
    nextMilestone: "Installation Complete",
    progressPercentage: 56  // 5 out of 9 milestones complete
  }
}
```

#### 3. Generated Action Items

```typescript
[
  {
    id: "welcome-form-12345",
    title: "Welcome Form",
    description: "Complete your welcome form",
    status: "completed",
    due_date: "2024-01-10T00:00:00.000Z",
    project_id: "12345",
    project_name: "Solar Installation - John Smith",
    project_address: "123 Solar St, Phoenix, AZ 85001",
    customer_email: "customer@example.com",
    created_at: "2024-01-01T00:00:00.000Z",
    completed_at: "2024-01-08T00:00:00.000Z",
    priority: "high",
    type: "welcome_form",
    'form-url': "https://forms.aveyo.com/welcome/12345"
  },
  {
    id: "sow-approval-12345",
    title: "Customer SOW Approval",
    description: "Review and approve your Statement of Work",
    status: "pending",
    due_date: "2024-01-25T00:00:00.000Z",
    project_id: "12345",
    project_name: "Solar Installation - John Smith",
    project_address: "123 Solar St, Phoenix, AZ 85001",
    customer_email: "customer@example.com",
    created_at: "2024-01-01T00:00:00.000Z",
    priority: "high",
    type: "sow_approval",
    'form-url': "https://forms.aveyo.com/sow/12345"
  }
]
```

#### 4. Generated Notifications

```typescript
[
  {
    id: "12345-site-survey-notification",
    title: "Milestone Completed",
    message: "Site Survey phase has been completed for your project at 123 Solar St, Phoenix, AZ 85001",
    type: "milestone",
    read: false,
    project_id: "12345",
    customer_email: "customer@example.com",
    created_at: "2024-01-15T00:00:00.000Z"
  },
  {
    id: "12345-engineering-notification",
    title: "Milestone Completed",
    message: "System Design phase has been completed for your project at 123 Solar St, Phoenix, AZ 85001",
    type: "milestone",
    read: false,
    project_id: "12345",
    customer_email: "customer@example.com",
    created_at: "2024-02-01T00:00:00.000Z"
  },
  {
    id: "12345-installation-scheduled-notification",
    title: "Installation Scheduled",
    message: "Your solar installation has been scheduled for 3/10/2024",
    type: "status",
    read: false,
    project_id: "12345",
    customer_email: "customer@example.com",
    created_at: "2024-03-01T12:00:00.000Z"
  }
]
```

---

## Key Data Service Functions

### 1. `getProjects(email: string): Promise<Project[]>`

Fetches all projects for a customer.

**Steps:**
1. Query `podio_data` table filtered by email
2. Parse `raw_payload` field (JSON)
3. Extract and structure milestone data
4. Calculate project status
5. Return array of Project objects

### 2. `getProjectById(id: string): Promise<Project | null>`

Fetches a single project by ID.

**Steps:**
1. Query `podio_data` with multiple fallback strategies:
   - Search by `raw_payload->item-id`
   - Search by `project_id` field
   - Search by `item-id` field
2. Parse and transform data (same as getProjects)
3. Return single Project object or null

### 3. `getActionItems(email: string, projectId?: string): Promise<ActionItem[]>`

Generates action items from project data.

**Steps:**
1. Fetch projects for email (optionally filtered by projectId)
2. Extract `customer-actions` from each project's `raw_payload`
3. Transform welcome-form and customer-sow into ActionItem objects
4. Check for overdue items
5. Return array of ActionItem objects

### 4. `getNotifications(email: string): Promise<Notification[]>`

Generates notifications from milestone completions.

**Steps:**
1. Fetch all projects for email
2. Check each project's milestones
3. Generate notification for each completed milestone
4. Sort by date (newest first)
5. Return array of Notification objects

### 5. `parseMilestoneData(payload: any): MilestoneObject`

Parses raw payload into structured milestone object.

**Steps:**
1. Handle different payload formats (string vs object)
2. Extract each section: pre-approvals, approvals, construction, energization
3. Parse JSON strings if necessary
4. Return structured MilestoneObject

### 6. `calculateProjectStatus(project: Project): ProjectStatus`

Calculates current stage, next milestone, and progress percentage.

**Steps:**
1. Extract milestone data from project
2. Check completion status of each milestone
3. Count completed milestones (out of 9 total)
4. Determine current stage based on which section has incomplete items
5. Find next incomplete milestone in sequence
6. Return ProjectStatus object

---

## Environment Variables

### Required for Mobile App

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Ava AI Chatbot (optional)
EXPO_PUBLIC_AVA_ENDPOINT=https://ava-ai-chatbot.vercel.app

# Analytics (optional)
EXPO_PUBLIC_ANALYTICS_ENABLED=true
```

---

## Error Handling & Fallbacks

### Missing Data Handling

1. **Missing Address**: Display "Address not available"
2. **Missing Customer Name**: Use email prefix
3. **Missing System Size**: Hide or show "N/A"
4. **Missing Milestone Data**: Treat as incomplete
5. **Missing Sales Rep**: Show "Aveyo Support" with default contact

### Data Parsing Errors

```typescript
try {
  const parsed = JSON.parse(rawPayload);
  return parsed;
} catch (error) {
  console.error('Failed to parse payload:', error);
  return {}; // Return empty object as fallback
}
```

### Null/Undefined Checks

Always check for null/undefined before accessing nested properties:

```typescript
const milestone = project.milestone?.['pre-approvals']?.['site-survey-complete'];
```

---

## Testing Data Scenarios

### Test Case 1: New Project (No Milestones)

```json
{
  "milestone": {
    "pre-approvals": {},
    "approvals": {},
    "construction": {},
    "energization": {}
  }
}
```
**Expected Result:**
- Progress: 0%
- Current Stage: Pre-Approvals (not_started)
- Next Milestone: Site Survey

### Test Case 2: Project with Only Date Values

```json
{
  "milestone": {
    "pre-approvals": {
      "site-survey-complete": "2024-01-15"
    }
  }
}
```
**Expected Result:**
- Progress: 11% (1/9)
- Current Stage: Pre-Approvals (in_progress)
- Next Milestone: Notice to Proceed

### Test Case 3: Project with Status Strings

```json
{
  "milestone": {
    "pre-approvals": {
      "site-survey-complete": "",
      "site-survey-status": "complete"
    }
  }
}
```
**Expected Result:**
- Milestone should be marked as complete based on status
- Progress: 11% (1/9)

### Test Case 4: Completed Project

```json
{
  "milestone": {
    "pre-approvals": { /* all dates filled */ },
    "approvals": { /* all dates filled */ },
    "construction": { /* all dates filled */ },
    "energization": { /* all dates filled */ }
  }
}
```
**Expected Result:**
- Progress: 100%
- Current Stage: Completed
- Next Milestone: Project Complete

---

## Performance Considerations

### Optimization Tips

1. **Cache Parsed Data**: Parse raw_payload once and cache the result
2. **Batch Queries**: Fetch multiple projects in a single query
3. **Lazy Load Images**: Load project photos on demand
4. **Memoize Calculations**: Cache progress calculations until data changes
5. **Use Indexes**: Ensure `email` and `project_id` are indexed in Supabase

### Data Size Estimates

- Typical `raw_payload` size: 5-15 KB
- Average project object (transformed): 8-20 KB
- 10 projects: ~100-200 KB total
- Recommended pagination: 20 projects per page

---

## Summary Checklist

When implementing data mapping in the mobile app:

- [ ] Set up Supabase client with proper auth storage
- [ ] Implement RLS policies for security
- [ ] Create data service layer to fetch and transform data
- [ ] Parse milestone data from raw_payload correctly
- [ ] Calculate project status and progress accurately
- [ ] Extract action items from customer-actions
- [ ] Generate notifications from milestone completions
- [ ] Handle missing/null data gracefully
- [ ] Implement error handling and fallbacks
- [ ] Test with various data scenarios
- [ ] Optimize for performance (caching, memoization)
- [ ] Add loading states and error states in UI

---

## Additional Resources

- **Supabase Docs**: https://supabase.com/docs
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **React Native Best Practices**: https://reactnative.dev/docs/

---

**Document Version**: 1.0  
**Last Updated**: November 2024  
**Maintained By**: Aveyo Development Team

