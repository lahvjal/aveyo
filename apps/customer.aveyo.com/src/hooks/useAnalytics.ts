import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { analytics, trackPageView } from '@/lib/analytics';

// Hook to automatically track page views
export const usePageTracking = () => {
  const pathname = usePathname();

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);
};

// Hook to track user interactions
export const useAnalytics = () => {
  return {
    trackProjectView: (projectId: string) => analytics.projectView(projectId),
    trackFeatureUsed: (feature: string, context?: string) => analytics.featureUsed(feature, context),
    trackError: (errorType: string, errorMessage: string, page?: string) => analytics.error(errorType, errorMessage, page),
    trackDocumentView: (documentType: string) => analytics.documentView(documentType),
    trackDocumentDownload: (documentType: string) => analytics.documentDownload(documentType),
  };
};
