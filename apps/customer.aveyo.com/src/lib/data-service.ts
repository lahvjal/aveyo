// Main Data Service - Feature flag to switch between MySQL and Supabase
// This allows easy rollback if needed

import { Project, ActionItem, Notification, Document, UserProfile } from '@/types';

// Feature flag to determine data source
const USE_MYSQL = process.env.NEXT_PUBLIC_USE_MYSQL !== 'false'; // Default to MySQL

// Import both data services
import * as MySQLService from './mysql/data-service';
import * as SupabaseService from './supabase/data-service';

console.log(`📊 Data Source: ${USE_MYSQL ? 'MySQL' : 'Supabase'}`);

// Export functions with feature flag logic
export async function getProjects(email: string): Promise<Project[]> {
  console.log(`[data-service] getProjects called for: ${email}`);
  console.log(`[data-service] USE_MYSQL flag is: ${USE_MYSQL}`);
  console.log(`[data-service] NEXT_PUBLIC_USE_MYSQL env var: ${process.env.NEXT_PUBLIC_USE_MYSQL}`);
  
  if (USE_MYSQL) {
    console.log('[data-service] Using MySQL service');
    const result = await MySQLService.getProjects(email);
    console.log(`[data-service] MySQL returned ${result.length} projects`);
    return result;
  }
  console.log('[data-service] Using Supabase service');
  const result = await SupabaseService.getProjects(email);
  console.log(`[data-service] Supabase returned ${result.length} projects`);
  return result;
}

export async function getProjectById(id: string): Promise<Project | null> {
  if (USE_MYSQL) {
    return MySQLService.getProjectById(id);
  }
  return SupabaseService.getProjectById(id);
}

export async function getActionItems(
  email: string,
  projectId?: string
): Promise<ActionItem[]> {
  if (USE_MYSQL) {
    return MySQLService.getActionItems(email, projectId);
  }
  return SupabaseService.getActionItems(email, projectId);
}

export async function getNotifications(email: string): Promise<Notification[]> {
  if (USE_MYSQL) {
    return MySQLService.getNotifications(email);
  }
  return SupabaseService.getNotifications(email);
}

export async function markNotificationAsRead(id: string): Promise<boolean> {
  if (USE_MYSQL) {
    return MySQLService.markNotificationAsRead(id);
  }
  return SupabaseService.markNotificationAsRead(id);
}

export async function completeActionItem(id: string): Promise<boolean> {
  if (USE_MYSQL) {
    return MySQLService.completeActionItem(id);
  }
  return SupabaseService.completeActionItem(id);
}

// These functions always use Supabase (for documents and user profiles)
export async function getDocuments(
  email: string,
  projectId?: string
): Promise<Document[]> {
  return SupabaseService.getDocuments(email, projectId);
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  return SupabaseService.getUserProfile(userId);
}

