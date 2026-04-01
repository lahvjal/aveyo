'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentAppUser } from '@/lib/supabase/auth-utils';
import { Project, ActionItem } from '@/types';

interface ProjectsContextType {
  projects: Project[];
  loading: boolean;
  error: string | null;
  actionItems: ActionItem[];
  refreshProjects: () => Promise<void>;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export function useProjects() {
  const context = useContext(ProjectsContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  return context;
}

interface ProjectsProviderProps {
  children: ReactNode;
}

export function ProjectsProvider({ children }: ProjectsProviderProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Helper function to map string status to valid ActionItem status type
  const mapStatusToValidType = (status: string): 'completed' | 'pending' | 'overdue' => {
    // Convert to lowercase for case-insensitive comparison
    const statusLower = (status || '').toLowerCase();
    
    // Check for completed/approved statuses
    if (statusLower === 'completed' || statusLower === 'approved' || statusLower === 'done') {
      return 'completed';
    }
    
    // Check for overdue status
    if (statusLower === 'overdue' || statusLower === 'late') {
      return 'overdue';
    }
    
    // Check for empty status (treat as pending)
    if (!status || status.trim() === '') {
      return 'pending';
    }
    
    // For any other status, log it for debugging
    console.log(`ProjectsContext - Unmapped status value: "${status}" - defaulting to pending`);
    return 'pending';
  };

  // Extract action items from projects
  const extractActionItems = (projects: Project[]): ActionItem[] => {
    const items: ActionItem[] = [];
    const now = new Date();
    
    projects.forEach(project => {
      // First try to access customer-actions directly from the project data
      // This should work after our update to the data-service
      let customerActions = project.podio_data?.['customer-actions'];
      
      // If not found, try the raw_payload path as fallback
      if (!customerActions) {
        customerActions = project.podio_data?.raw_payload?.['customer-actions'];
      }
      
      if (customerActions) {
        // Add Welcome Form action if it exists
        if (customerActions['welcome-form']) {
          const welcomeForm = customerActions['welcome-form'];
          const formUrl = (welcomeForm as any)['form-url'] || (welcomeForm as any)['action-link'];
          
          // Only show if there's a form URL
          if (!formUrl) {
            console.log('Skipping Welcome Form action without form URL for project:', project.id);
          } else {
            // Use the due date if available, otherwise use current date
            const dueDate = welcomeForm['due-date'] && welcomeForm['due-date'].trim() !== '' 
              ? new Date(welcomeForm['due-date']) 
              : new Date();
            
            items.push({
              id: `welcome-form-${project.id}`,
              title: 'Welcome Form',
              description: welcomeForm.message,
              status: mapStatusToValidType(welcomeForm.status),
              due_date: dueDate.toISOString(),
              project_id: project.id,
              project_name: project.name,
              project_address: project.address, // Include project address
              customer_email: userEmail || '',
              created_at: new Date().toISOString(),
              priority: 'high',
              type: 'welcome_form',
              'form-url': (welcomeForm as any)['form-url'] || (welcomeForm as any)['action-link'] || null,
              completed_at: welcomeForm['completed-date'] ? new Date(welcomeForm['completed-date']).toISOString() : undefined
            });
          }
        }
        
        // Add SOW Approval action if it exists
        if (customerActions['customer-sow']) {
          const sowApproval = customerActions['customer-sow'];
          const formUrl = (sowApproval as any)['form-url'] || (sowApproval as any)['action-link'];
          
          // Only show if there's a form URL
          if (!formUrl) {
            console.log('Skipping SOW Approval action without form URL for project:', project.id);
          } else {
            // Use the due date if available, otherwise use current date
            const dueDate = sowApproval['due-date'] && sowApproval['due-date'].trim() !== '' 
              ? new Date(sowApproval['due-date']) 
              : new Date();
            
            items.push({
              id: `sow-approval-${project.id}`,
              title: 'Customer SOW Approval',
              description: sowApproval.message,
              status: mapStatusToValidType(sowApproval.status),
              due_date: dueDate.toISOString(),
              project_id: project.id,
              project_name: project.name,
              project_address: project.address, // Include project address
              customer_email: userEmail || '',
              created_at: new Date().toISOString(),
              priority: 'high',
              type: 'sow_approval',
              'form-url': (sowApproval as any)['form-url'] || (sowApproval as any)['action-link'] || null,
              completed_at: sowApproval['completed-date'] ? new Date(sowApproval['completed-date']).toISOString() : undefined
            });
          }
        }
      }
    });
    
    // Check for overdue items
    return items.map(item => {
      if (item.status === 'pending') {
        const dueDate = new Date(item.due_date);
        if (dueDate < now) {
          return { ...item, status: 'overdue' };
        }
      }
      return item;
    });
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use getCurrentAppUser to ensure user belongs to this app
      const user = await getCurrentAppUser();
      const email = user?.email;
      setUserEmail(email || null);
      
      if (!email) {
        setError('User not authenticated or does not belong to the Customer Portal');
        return;
      }
      
      try {
        // Fetch projects from the API endpoint that includes calculated status
        console.log('=== ProjectsContext: Fetching projects ===');
        const response = await fetch('/api/projects');
        
        console.log('API response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('API error response:', errorData);
          throw new Error(errorData.error || 'Failed to fetch projects');
        }
        
        const projectsData = await response.json();
        console.log('Received projects data from API:', projectsData);
        console.log('Number of projects received:', projectsData.length);
        console.log('Full projects data:', JSON.stringify(projectsData, null, 2));
        
        setProjects(projectsData);
        
        // Extract action items from projects
        const extractedActionItems = extractActionItems(projectsData);
        console.log('Extracted action items:', extractedActionItems);
        setActionItems(extractedActionItems);
        
        console.log('=== ProjectsContext: Fetch complete ===');
      } catch (fetchError) {
        console.error('Error fetching from API:', fetchError);
        throw fetchError; // Re-throw to be caught by the outer catch
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Failed to load projects data');
      
      // No fallback to mock data anymore
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProjects = async () => {
    await fetchProjects();
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const value = {
    projects,
    loading,
    error,
    actionItems,
    refreshProjects
  };

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
}
