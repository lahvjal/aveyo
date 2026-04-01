import { track } from '@vercel/analytics';

// Custom analytics events for the customer portal
export const analytics = {
  // User authentication events
  userLogin: (email: string) => {
    track('user_login', { email: email.split('@')[0] }); // Only track username part for privacy
  },

  userLogout: () => {
    track('user_logout');
  },

  userRegistration: (email: string) => {
    track('user_registration', { email: email.split('@')[0] });
  },

  // Navigation events
  pageView: (page: string) => {
    track('page_view', { page });
  },

  tabNavigation: (tab: string) => {
    track('tab_navigation', { tab });
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
  analytics.pageView(page);
};

// Error boundary analytics
export const trackError = (error: Error, errorInfo?: any) => {
  analytics.error(
    'react_error',
    error.message,
    window?.location?.pathname
  );
};
