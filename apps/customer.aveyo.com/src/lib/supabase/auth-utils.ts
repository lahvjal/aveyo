// src/lib/supabase/auth-utils.ts
import { supabase } from './client';
import { USER_TYPE } from './constants';

/**
 * Check if a user exists in the system
 * @param userId The user ID to check
 * @returns Promise<boolean> True if the user exists
 */
export async function isCustomerPortalUser(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error || !data || !data.user) {
      console.error('Error checking user:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in isCustomerPortalUser:', error);
    return false;
  }
}

/**
 * Get the current authenticated user
 * @returns Promise with the user if authenticated, null otherwise
 */
export async function getCurrentAppUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}
