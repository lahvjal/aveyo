# Vercel Analytics Implementation

## Overview
This document outlines the comprehensive analytics and tracking implementation for the Aveyo Customer Portal using Vercel Analytics and Speed Insights.

## Packages Installed
- `@vercel/analytics` - Event tracking and user analytics
- `@vercel/speed-insights` - Performance monitoring and Core Web Vitals

## Implementation Details

### 1. Core Setup
- **Location**: `src/app/layout.tsx`
- **Components**: `<Analytics />` and `<SpeedInsights />` added to root layout
- **Automatic Features**:
  - Page view tracking
  - Performance monitoring
  - Core Web Vitals collection

### 2. Custom Analytics Library
- **Location**: `src/lib/analytics.ts`
- **Purpose**: Centralized event tracking with custom events
- **Features**:
  - User authentication events
  - Navigation tracking
  - Project interactions
  - Ava chatbot analytics
  - Error tracking
  - Performance monitoring

### 3. Custom Events Tracked

#### User Authentication
- `user_login` - User successfully logs in
- `user_logout` - User logs out
- `user_registration` - New user registration
- `password_reset` - Password reset attempts

#### Navigation & UI
- `page_view` - Page visits with pathname
- `tab_navigation` - Tab clicks in navigation
- `project_view` - Project detail page visits

#### Ava Chatbot Integration
- `ava_chat_opened` - Chat widget opened (tracks source: banner, support_tab, floating_button)
- `ava_chat_closed` - Chat widget closed
- `ava_chat_error` - Chat widget errors

#### Feature Usage
- `feature_used` - General feature usage tracking
- `document_view` - Document viewing
- `document_download` - Document downloads
- `action_item_view` - Action item interactions

#### Error Tracking
- `error_occurred` - Application errors with context
- `login_failed` - Failed login attempts
- `registration_failed` - Failed registration attempts

### 4. Implementation Locations

#### Dashboard (`src/app/(dashboard)/dashboard/page.tsx`)
- Page view tracking on load
- Project view tracking on project clicks
- Ava chat banner button tracking

#### Authentication Pages
- **Login** (`src/app/(auth)/login/page.tsx`):
  - Successful login tracking
  - Login error tracking
- **Register** (`src/app/(auth)/register/page.tsx`):
  - Registration success tracking
  - Registration error tracking

#### Navigation (`src/components/layout/TabNavigation.tsx`)
- Tab navigation tracking
- Support tab Ava chat tracking

### 5. Analytics Hooks
- **Location**: `src/hooks/useAnalytics.ts`
- **Purpose**: Reusable hooks for consistent tracking
- **Features**:
  - `usePageTracking()` - Automatic page view tracking
  - `useAnalytics()` - Common analytics functions

### 6. Development Tools
- **Location**: `src/components/analytics/AnalyticsDashboard.tsx`
- **Purpose**: Development-only analytics event viewer
- **Features**:
  - Real-time event monitoring
  - Event history display
  - Development environment only

## Event Data Structure

### Standard Event Properties
```typescript
{
  event: string,           // Event name
  timestamp: string,       // ISO timestamp
  page?: string,          // Current page
  user?: string,          // User identifier (anonymized)
  context?: string        // Additional context
}
```

### Privacy Considerations
- User emails are anonymized (only username part tracked)
- No sensitive data in event properties
- Error messages truncated to 100 characters
- Optional parameters have fallback values

## Usage Examples

### Basic Event Tracking
```typescript
import { analytics } from '@/lib/analytics';

// Track a feature usage
analytics.featureUsed('project_export', 'dashboard');

// Track an error
analytics.error('api_error', 'Failed to load projects', 'dashboard');
```

### Page View Tracking
```typescript
import { usePageTracking } from '@/hooks/useAnalytics';

export default function MyPage() {
  usePageTracking(); // Automatically tracks page views
  return <div>My Page Content</div>;
}
```

## Vercel Dashboard Access
- Analytics data available in Vercel project dashboard
- Real-time visitor tracking
- Performance insights and Core Web Vitals
- Custom event analytics with filtering and segmentation

## Benefits
1. **User Behavior Insights**: Understand how customers use the portal
2. **Performance Monitoring**: Track Core Web Vitals and loading times
3. **Feature Adoption**: Monitor which features are most used
4. **Error Tracking**: Identify and resolve issues quickly
5. **Ava Integration Analytics**: Track AI chatbot effectiveness
6. **Conversion Tracking**: Monitor registration and login success rates

## Future Enhancements
- A/B testing integration
- Funnel analysis for user journeys
- Custom dashboard for business metrics
- Integration with customer support tools
- Advanced segmentation by user type or project status
