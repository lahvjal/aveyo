import { track } from '@vercel/analytics';

type UserTrackingContext = {
  role?: string;
  userType?: string;
  impersonationActive?: boolean;
  impersonatedCustomer?: string | null;
};

type UiClickEvent = {
  pathname: string;
  elementType: string;
  target: string;
  label?: string;
  href?: string;
};

function anonymizeEmail(email: string | null | undefined) {
  if (!email) {
    return 'unknown';
  }

  const [username] = email.trim().toLowerCase().split('@');
  return username || 'unknown';
}

// Custom analytics events for the customer portal
export const analytics = {
  // User authentication events
  userLogin: (email: string | null | undefined, context?: UserTrackingContext) => {
    track('user_login', {
      user: anonymizeEmail(email),
      role: context?.role ?? 'unknown',
      userType: context?.userType ?? 'unknown',
      impersonationActive: Boolean(context?.impersonationActive)
    });
  },

  userLogout: (email?: string | null, context?: UserTrackingContext) => {
    track('user_logout', {
      user: anonymizeEmail(email),
      role: context?.role ?? 'unknown',
      userType: context?.userType ?? 'unknown',
      impersonationActive: Boolean(context?.impersonationActive)
    });
  },

  userRegistration: (email: string) => {
    track('user_registration', { user: anonymizeEmail(email) });
  },

  userContext: (userId: string, email: string | null | undefined, context?: UserTrackingContext) => {
    track('user_context', {
      userId,
      user: anonymizeEmail(email),
      role: context?.role ?? 'unknown',
      userType: context?.userType ?? 'unknown',
      impersonationActive: Boolean(context?.impersonationActive),
      impersonatedCustomer: anonymizeEmail(context?.impersonatedCustomer)
    });
  },

  // Navigation events
  pageView: (page: string) => {
    track('page_view', { page });
  },

  tabNavigation: (tab: string) => {
    track('tab_navigation', { tab });
  },

  uiClick: (event: UiClickEvent) => {
    track('ui_click', {
      pathname: event.pathname,
      elementType: event.elementType,
      target: event.target,
      label: event.label ?? 'unknown',
      href: event.href ?? 'none'
    });
  },

  // Project interactions
  projectView: (projectId: string) => {
    track('project_view', { projectId });
  },

  projectPhotoView: (projectId: string, photoType: string) => {
    track('project_photo_view', { projectId, photoType });
  },

  // Ava chatbot interactions
  avaChatOpened: (source: 'banner' | 'support_tab' | 'floating_button') => {
    track('ava_chat_opened', { source });
  },

  avaChatClosed: () => {
    track('ava_chat_closed');
  },

  avaChatError: (error: string) => {
    track('ava_chat_error', { error });
  },

  // Support and help events
  supportAccessed: (method: string) => {
    track('support_accessed', { method });
  },

  // Document interactions
  documentView: (documentType: string) => {
    track('document_view', { documentType });
  },

  documentDownload: (documentType: string) => {
    track('document_download', { documentType });
  },

  // Action items
  actionItemView: (actionType: string) => {
    track('action_item_view', { actionType });
  },

  actionItemCompleted: (actionType: string) => {
    track('action_item_completed', { actionType });
  },

  // Error tracking
  error: (errorType: string, errorMessage: string, page?: string) => {
    track('error_occurred', { 
      errorType, 
      errorMessage: errorMessage.substring(0, 100), // Limit message length
      page: page || 'unknown'
    });
  },

  // Performance events
  pageLoadTime: (page: string, loadTime: number) => {
    track('page_load_time', { page, loadTime });
  },

  // Email events
  emailSent: (emailType: string, success: boolean) => {
    track('email_sent', { emailType, success });
  },

  passwordReset: (success: boolean) => {
    track('password_reset', { success });
  },

  // Feature usage
  featureUsed: (feature: string, context?: string) => {
    track('feature_used', { feature, context: context || 'none' });
  }
};

// Utility function to track page views automatically
export const trackPageView = (pathname: string) => {
  const page = pathname.split('/').filter(Boolean).join('_') || 'home';
  track('page_view', { page, pathname });
};

// Error boundary analytics
export const trackError = (error: Error, errorInfo?: any) => {
  analytics.error(
    'react_error',
    error.message,
    window?.location?.pathname
  );
};
