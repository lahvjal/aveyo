// Utility functions for authentication

// Simple rate limit bypass for development
export const bypassRateLimit = () => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    // Clear any stored rate limit data
    localStorage.removeItem('supabase.auth.token');
    sessionStorage.clear();
    
    // Clear cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    console.log('Development: Cleared auth storage to bypass rate limits');
  }
};

// Check if we're in a rate limit state
export const isRateLimited = (error: Error | { message?: string; status?: number }): boolean => {
  return error?.message?.includes('rate limit') || 
         error?.message?.includes('Too many requests') ||
         ('status' in error && error?.status === 429);
};

// Get a user-friendly rate limit message
export const getRateLimitMessage = (error: Error | { message?: string }): string => {
  if (isRateLimited(error)) {
    return 'Too many login attempts. Please wait 2-3 minutes before trying again. This helps protect your account security.';
  }
  return error?.message || 'An error occurred during authentication';
};
