# Aveyo Customer Portal - Expo Mobile App Build Prompt

## Project Overview

Build a native mobile application using Expo/React Native for the Aveyo Customer Portal. This app allows solar installation customers to track their project progress, view milestones, complete action items, and get support through an AI chatbot.

## Tech Stack Requirements

- **Framework**: Expo (latest SDK)
- **Language**: TypeScript
- **Navigation**: React Navigation (Stack + Tab Navigation)
- **State Management**: React Context API
- **Backend**: Supabase (Authentication + Database)
- **Analytics**: Custom analytics implementation
- **UI Components**: React Native Paper or Native Base (or custom with React Native core components)
- **Fonts**: PP Telegraf (custom font family - Regular, Bold, UltraBold, Oblique)

## Brand Colors

```javascript
const brandColors = {
  dark: '#212121',
  white: '#FFFFFF',
  lightBlue: '#D9E8F6',
  blue: '#0F62DE',
  purple: '#8B5CF6', // For Ava AI assistant
};
```

## App Features & Screens

### 1. Authentication Flow

#### Login Screen
- Email and password fields
- "Forgot Password" link
- "Register" link
- Rate limiting (3 attempts, 10-second cooldown)
- Error handling with user-friendly messages
- Logo at top center
- Clean, modern UI with brand colors

#### Register Screen
- Full name field
- Email field
- Password field (with strength indicator)
- Confirm password field
- Terms & conditions checkbox
- Submit button
- Link back to login

#### Forgot Password Screen
- Email input
- Send reset link button
- Success/error messaging
- Back to login link

#### Reset Password Screen
- New password field
- Confirm password field
- Submit button
- Password strength validation

### 2. Welcome Modal

**Trigger**: Show on first login of each new session (use AsyncStorage to track)

**Content**:
```
Title: "Welcome to the Aveyo Family!"

Body: "We're thrilled to have you join the Aveyo community! Our goal is to make your installation experience smooth, efficient, and stress-free. Below you'll find a few helpful reminders and expectations to ensure everything goes perfectly on installation day.

If you have any questions or special requests, please don't hesitate to reach out — we're always happy to help!"

Contact Box (highlighted in light blue):
- Customer Care: (385) 469-3838 (clickable - opens dialer)
- Hours: Monday – Friday, 8:00 AM – 4:00 PM CST

Three Action Buttons:
1. "Installation Expectations" → Navigate to Expectations screen, scroll to #installation-expectations
2. "Delivery & Site Prep" → Navigate to Expectations screen, scroll to #delivery-site-prep
3. "Need Help?" → Navigate to Expectations screen, scroll to #need-help
```

**Modal Behavior**:
- Can be dismissed by tapping outside, pressing back button, or close (X) button
- Does not show again during same session
- Clears on logout

### 3. Main App (Post-Authentication)

#### Tab Navigation Structure
```
Dashboard | Actions | Expectations | Support
```

#### Dashboard Screen (Home)

**Header**:
- Aveyo logo (top left)
- Notification bell icon (top right) with badge count
- User avatar/menu (top right)

**Content**:
- Welcome message: "WELCOME [USER_EMAIL]"
- Subtitle: "Your solar projects"
- Project cards (scrollable list/grid):

**Project Card Design**:
```
┌─────────────────────────────┐
│ [Home Photo - 200px height] │
├─────────────────────────────┤
│ Address Line                │
│                             │
│ Current Stage: [Badge]      │
│ Next Milestone: [Badge]     │
│                             │
│ [Progress Bar] 45%          │
│                             │
│ Last Updated: MM/DD/YYYY    │
│ [View Details Button]       │
└─────────────────────────────┘
```

**Progress Calculation**:
- Track 9 total milestones across 4 stages:
  1. Pre-Approvals: Site Survey, Notice to Proceed, Engineering Complete
  2. Approvals: Pre-Install Review
  3. Construction: Install Appointment, Install Complete, Inspection Complete
  4. Activation: PTO Received, System Energized

**Ava AI Banner** (at bottom of dashboard):
- Purple gradient background
- Ava logo
- Title: "Meet Ava, Your AI Solar Assistant!"
- Subtitle: "Get instant answers about your solar project, installation timeline, and more. Ava is here 24/7 to help you navigate your solar journey."
- "Chat with Ava" button → Opens Ava chat interface

#### Project Detail Screen

**Header**:
- Back button
- Project address as title
- Share icon (optional)

**Content Sections**:

1. **Hero Image Section**
   - Large home photo
   - Overlay with project status badge

2. **Project Overview Card**
   - Address
   - System Size (kW)
   - Estimated Yearly Production (kWh)
   - Project Manager name & contact
   - Current Stage badge
   - Next Milestone badge

3. **Progress Timeline** (expandable accordion or tabs)
   - Pre-Approvals Section
     * Site Survey Complete (date/status)
     * Notice to Proceed (date/status)
     * Engineering Complete (date/status)
   - Approvals Section
     * Pre-Install Review (date/status)
   - Construction Section
     * Install Appointment (date/status)
     * Install Complete (date/status)
     * AHJ Inspection Complete (date/status)
   - Activation Section
     * PTO Received (date/status)
     * System Energized (date/status)

4. **Visual Progress Indicator**
   - Circular or linear progress bar showing overall completion percentage
   - Color coding: Gray (not started), Yellow (in progress), Green (completed)

5. **Action Items Section** (if any pending)
   - List of customer action items with due dates
   - Priority badges (High/Medium/Low)
   - Quick action buttons

#### Actions Screen

**Header**: "Action Items"

**Filter Tabs**:
- All | Pending | Completed | Overdue

**Action Item Card**:
```
┌─────────────────────────────────────┐
│ [Priority Badge] Title              │
│ Project: [Address]                  │
│ Due: MM/DD/YYYY [Status Badge]      │
│ Description text...                 │
│ [Primary Action Button]             │
└─────────────────────────────────────┘
```

**Action Types**:
- Welcome Form
- SOW (Statement of Work) Approval
- Document Upload
- Form Completion
- Payment
- Other

**Features**:
- Swipe to complete
- Badge count for pending/overdue items
- Sort by due date, priority, or project
- Empty state when no actions

#### Expectations Screen

**Header**: "Aveyo Install Customer Expectations"

**Content** (scrollable, with anchor links from welcome modal):

**Section 1: Installation Expectations** (id: installation-expectations)
```
🏡 Before and During Installation

• Be Home for Day 1 Walkthrough
  - Homeowner is required to be home upon crew arrival on day 1 for walk through with the installer to ensure accurate expectations and game plan for installation.

• Access to Key Areas
  - The crew will need access to attic and main service panel.

• Temporary Power Outage
  - Homeowner will be without power for approximately 2-4 hours if any electrical upgrades are required OR if we are doing a whole home battery backup.

• Private Lines
  - Any private lines must be marked by the homeowner prior to installation. 811 does not mark private lines.
  [Warning Box] If you have private lines that are not marked, please call Aveyo customer care at (385) 469-3838
```

**Section 2: Delivery and Site Preparation** (id: delivery-site-prep)
```
📦 Delivery and Site Preparation

• Equipment Delivery
  - Equipment will be dropped off 1-2 business day(s) prior to installation.
  [Info Box] If you have any special requests on where you want the equipment delivered, please call Aveyo customer care at (385) 469-3838

• Electrical Panel Labeling
  - The main service electrical panel should be labeled prior to the installer doing work. This is to ensure we are backing up the right circuits for your new battery.

• Clear Work Areas
  - The main service electrical panel and utility meter area must be cleared of any debris to ensure a clean and safe working environment.

• Placards
  - In the event that placards and/or labels are delivered to you, please ensure that they are available for crew on the day of installation.
```

**Section 3: Need Help?** (id: need-help)
```
💬 Need Help?

We're here for you every step of the way!

[Contact Card - Blue Gradient Background]
📞 Aveyo Customer Care: (385) 469-3838
⏰ Hours: Monday – Friday, 8:00 AM – 4:00 PM CST

If you have any questions before or during installation, don't hesitate to reach out. We can't wait to bring clean, reliable energy to your home — thank you for choosing Aveyo!
```

#### Support Tab

**Action**: Opens Ava AI Chatbot interface

**Ava Chat Interface**:
- Full-screen chat view
- Ava avatar/icon in header
- Message bubbles (user messages on right, Ava on left)
- Input field at bottom
- Send button
- Session persistence
- User authentication passed to Ava backend

**Ava Session Data**:
```javascript
{
  email: user.email,
  userId: user.id,
  name: user.full_name || user.email.split('@')[0],
  token: session.access_token,
  customData: {
    loginTime: new Date().toISOString(),
    userType: 'customer',
    supabaseUserId: user.id,
    platform: 'mobile-app'
  }
}
```

### 4. User Menu (Profile Dropdown/Screen)

**Options**:
- User name and email (display only)
- Settings (optional future feature)
- Sign Out

### 5. Notifications

**Notification Types**:
- Project updates
- Milestone completions
- Action item reminders
- System announcements

**Notification Dropdown/Screen**:
- List of notifications (recent at top)
- Mark as read functionality
- Tap to navigate to related project/action
- Badge count on bell icon

## Data Models

### User Profile
```typescript
interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}
```

### Project
```typescript
interface Project {
  id: string;
  name: string;
  address: string;
  status: string;
  milestone: MilestoneObject | string;
  customer_email?: string;
  system_size?: number;
  estimated_yearly_production?: number;
  project_manager?: string;
  updated_at: string;
  created_at?: string;
  sales_reps?: {
    name: string;
    email: string;
    phone: string;
  };
  podio_data?: PodioData;
  calculatedStatus?: ProjectStatus;
}

interface ProjectStatus {
  currentStage: {
    name: string;
    status: string;
  };
  nextMilestone: string;
  progressPercentage: number;
}

interface MilestoneObject {
  'pre-approvals'?: MilestoneData;
  approvals?: MilestoneData;
  construction?: MilestoneData;
  energization?: MilestoneData;
}
```

### Action Item
```typescript
interface ActionItem {
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
```

### Notification
```typescript
interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  project_id?: string;
  customer_email?: string;
  created_at?: string;
}
```

## Supabase Integration

### Environment Variables
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Authentication Setup
```typescript
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
```

### Database Tables
- `user_profiles` - User profile information
- `projects` - Solar installation projects
- `action_items` - Customer action items
- `notifications` - System notifications
- `documents` - Project documents (optional)

### Row Level Security (RLS)
- Users can only see their own projects (filtered by customer_email)
- Users can only see their own action items
- Users can only see their own notifications

## Context Providers

### AuthContext
```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  showWelcomeModal: boolean;
  dismissWelcomeModal: () => void;
}
```

### ProjectsContext
```typescript
interface ProjectsContextType {
  projects: Project[];
  loading: boolean;
  error: Error | null;
  actionItems: ActionItem[];
  refetch: () => Promise<void>;
}
```

## Analytics Events to Track

```typescript
const analytics = {
  pageView: (screenName: string) => {},
  userLogin: (email: string) => {},
  projectView: (projectId: string) => {},
  tabNavigation: (tabName: string) => {},
  avaChatOpened: (source: string) => {},
  actionItemCompleted: (actionId: string, type: string) => {},
  error: (errorType: string, errorMessage: string, location: string) => {},
};
```

## Key Features & Behaviors

### Session Management
- Use AsyncStorage to persist authentication state
- Track welcome modal shown state per session
- Clear modal flag on logout
- Auto-refresh tokens via Supabase

### Offline Support (Optional Enhancement)
- Cache project data locally
- Queue action item completions when offline
- Show offline indicator
- Sync when connection restored

### Push Notifications (Optional Enhancement)
- Milestone completion notifications
- Action item reminders (1 day before due date)
- Project update notifications
- Implement using Expo Notifications

### Deep Linking (Optional Enhancement)
- Support links to specific projects: `aveyo://project/:id`
- Support links to action items: `aveyo://actions/:id`
- Support navigation from push notifications

## UI/UX Guidelines

### Design Principles
- Clean, modern interface
- Brand-consistent color scheme
- Easy navigation with clear hierarchy
- Mobile-first responsive design
- Loading states for all async operations
- Error states with retry options
- Empty states with helpful guidance

### Accessibility
- Screen reader support
- Sufficient color contrast ratios
- Touch targets minimum 44x44 points
- Descriptive labels for all interactive elements

### Loading States
- Skeleton screens for project cards
- Spinner for full-page loads
- Pull-to-refresh on list screens
- Optimistic UI updates where appropriate

### Error Handling
- User-friendly error messages
- Retry mechanisms
- Offline detection and messaging
- Form validation feedback

## Development Phases

### Phase 1: Core Authentication & Navigation
1. Set up Expo project with TypeScript
2. Install and configure Supabase
3. Implement authentication screens (Login, Register, Forgot Password)
4. Set up navigation structure (Stack + Tab Navigation)
5. Implement AuthContext

### Phase 2: Dashboard & Projects
1. Create Dashboard screen with project list
2. Implement ProjectsContext
3. Build Project Detail screen
4. Create progress calculation logic
5. Implement milestone timeline UI

### Phase 3: Actions & Expectations
1. Build Actions screen with filtering
2. Create action item cards and interactions
3. Build Expectations screen with all three sections
4. Implement anchor link navigation

### Phase 4: Welcome Modal & Notifications
1. Create Welcome Modal component
2. Implement session-based modal display logic
3. Build Notifications screen/dropdown
4. Add notification badge counts

### Phase 5: Ava Integration & Polish
1. Integrate Ava AI chatbot
2. Set up Ava session authentication
3. Implement Support tab chat interface
4. Add Ava banner to dashboard
5. Polish UI, fix bugs, add loading states

### Phase 6: Testing & Launch Prep
1. Test all authentication flows
2. Test offline scenarios
3. Verify RLS policies
4. Performance optimization
5. Build for iOS and Android
6. Prepare for App Store/Play Store submission

## Testing Checklist

- [ ] Login/logout flows
- [ ] Registration with validation
- [ ] Password reset flow
- [ ] Welcome modal shows on first login only
- [ ] Project list loads correctly
- [ ] Project details display accurate information
- [ ] Progress calculation is correct
- [ ] Action items filter and sort properly
- [ ] Notifications mark as read
- [ ] Ava chat opens and functions
- [ ] All links and navigation work
- [ ] Phone number links open dialer
- [ ] Responsive on various screen sizes
- [ ] Works on both iOS and Android
- [ ] Handles poor network conditions gracefully

## Assets Needed

### Images
- `/aveyo-logo.svg` - Main logo
- `/ava-logo2.svg` - Ava AI logo
- `/ava-icon.svg` - Ava chat icon
- `/user-icon.svg` - User profile icon
- `/background-color.png` - Ava banner background
- Placeholder home image for projects without photos

### Fonts
- PP Telegraf Regular
- PP Telegraf Bold
- PP Telegraf UltraBold
- PP Telegraf Regular Oblique

## External Services & APIs

### Ava AI Chatbot
- Endpoint: `https://ava-ai-chatbot.vercel.app`
- Requires authenticated session with user data
- Maintains conversation history per user
- Provides solar installation information and support

### Supabase Services Used
- Authentication (Email/Password)
- Database (PostgreSQL)
- Real-time subscriptions (optional for live updates)
- Row Level Security

## Notes for AI Developer

1. **Prioritize UX**: The app should feel smooth and responsive. Use skeleton screens, optimistic updates, and clear loading indicators.

2. **Error Handling**: Be defensive in data fetching. Handle missing data gracefully with fallbacks and user-friendly error messages.

3. **Type Safety**: Use TypeScript strictly. Define all data models and API responses.

4. **Performance**: Lazy load images, memoize expensive calculations (like progress percentages), and use FlatList for scrollable lists.

5. **Navigation**: Use React Navigation's best practices. Ensure proper screen transitions and back button behavior.

6. **Testing**: Test on both iOS and Android simulators/devices. Pay attention to platform-specific behaviors (especially for modals, keyboards, and safe areas).

7. **Styling**: Use StyleSheet.create() for performance. Consider using a UI library (React Native Paper or Native Base) for consistent components.

8. **State Management**: Keep Context API usage minimal. Only lift state that truly needs to be global. Use local state when possible.

9. **Security**: Never log sensitive data. Always use HTTPS. Validate all user inputs. Follow Supabase security best practices.

10. **Future Enhancements**: Structure code to easily add:
    - Push notifications
    - Document viewing/downloading
    - Photo uploads
    - Calendar integration for appointments
    - Multi-language support

## Success Criteria

The app is successful when:
- Users can log in securely and view their projects
- Project progress is accurately calculated and displayed
- Action items are clearly presented and actionable
- Welcome modal enhances onboarding experience
- Ava chat provides helpful support
- App feels fast and responsive
- UI matches Aveyo brand guidelines
- Works reliably on both iOS and Android

## Support & Documentation

Refer to the original web app codebase for:
- Milestone calculation logic (`/src/utils/milestoneUtils.ts`)
- Project utilities (`/src/utils/projectUtils.ts`)
- Supabase setup (`/src/lib/supabase/`)
- Type definitions (`/src/types/index.ts`)

Good luck building the Aveyo Customer Portal mobile app! 🚀☀️

