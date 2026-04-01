/**
 * Utility functions for authentication and token handling
 */

import { getBaseUrl } from './config';

/**
 * Extract a token from URL query parameters or hash fragment
 * @param url - The full URL to extract the token from
 * @returns The token if found, null otherwise
 */
export function extractTokenFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // First check query parameters
    const queryToken = urlObj.searchParams.get('token');
    if (queryToken) {
      return queryToken;
    }
    
    // Then check hash fragment
    if (urlObj.hash) {
      const hashParams = new URLSearchParams(urlObj.hash.substring(1));
      const hashToken = hashParams.get('token');
      if (hashToken) {
        return hashToken;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return null;
  }
}

/**
 * Normalize a URL with a token by ensuring the token is in the query parameters
 * @param path - The path to redirect to (e.g., '/reset-password')
 * @param token - The token to include
 * @returns A normalized URL with the token in query parameters
 */
export function normalizeTokenUrl(path: string, token: string): string {
  const baseUrl = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}?token=${encodeURIComponent(token)}`;
}
