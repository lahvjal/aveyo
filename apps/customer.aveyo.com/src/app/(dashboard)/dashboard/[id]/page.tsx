'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import '@/styles/brand-colors.css';
import { getProjectHomePhotoUrl } from '@/utils/projectUtils';
import { getNextMilestoneDisplayName, sectionDisplayNames } from '@/utils/milestoneUtils';
import { supabase } from '@/lib/supabase/client';
import AppShell from '@/components/layout/AppShell';
import Link from 'next/link';
import InstallationProgress from '@/components/ui/InstallationProgress';
import StatusBadge from '@/components/ui/StatusBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Project, Milestone } from '@/types';

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [currentStage, setCurrentStage] = useState<{ name: string; status: string; nextMilestone: string }>({ 
    name: 'Pre-Approvals', 
    status: 'Not Started',
    nextMilestone: 'Site Survey'
  });
  const [sectionProgress, setSectionProgress] = useState({
    'pre-approvals': 0,
    'approvals': 0,
    'construction': 0,
    'energization': 0
  });

  // Handle progress percentage calculation from InstallationProgress component
  const handleProgressCalculated = (percentage: number) => {
    setProgressPercentage(percentage);
  };

  // Handle current stage calculation from InstallationProgress component
  const handleStageCalculated = (stage: { name: string; status: string; nextMilestone: string }) => {
    setCurrentStage(stage);
  };

  // Calculate section progress percentages
  const calculateSectionProgress = () => {
    if (!project) return;
    
    // Extract milestone data from the project
    const milestoneData = typeof project.milestone === 'object' ? project.milestone : {};
    
    const preApprovals = milestoneData?.['pre-approvals'] || {};
    const approvals = milestoneData?.['approvals'] || {};
    const construction = milestoneData?.['construction'] || {};
    const energization = milestoneData?.['energization'] || {};
    
    // Helper function to check if a milestone is completed
    const isCompleted = (date: string | undefined | null) => {
      return date !== undefined && date !== null && date !== '';
    };
    
    // Calculate completion percentages for each section
    const preApprovalsProgress = [
      isCompleted(preApprovals?.['site-survey-complete']),
      isCompleted(preApprovals?.['ntp-complete']),
      isCompleted(preApprovals?.['engineering-complete'])
    ].filter(Boolean).length / 3 * 100;
    
    const approvalsProgress = [
      isCompleted(approvals?.['pre-install-review-complete'])
    ].filter(Boolean).length / 1 * 100;
    
    const constructionProgress = [
      isCompleted(construction?.['install-appointment']),
      isCompleted(construction?.['install-complete']),
      isCompleted(construction?.['ahj-inspection-complete'])
    ].filter(Boolean).length / 3 * 100;
    
    const energizationProgress = [
      isCompleted(energization?.['pto-received']),
      isCompleted(energization?.['energize-complete-date'])
    ].filter(Boolean).length / 2 * 100;
    
    setSectionProgress({
      'pre-approvals': preApprovalsProgress,
      'approvals': approvalsProgress,
      'construction': constructionProgress,
      'energization': energizationProgress
    });
  };

  // Calculate section progress on component mount
  useEffect(() => {
    calculateSectionProgress();
  }, [project]);

  // Update progress and stage when project data changes
  useEffect(() => {
    if (project?.calculatedStatus) {
      setProgressPercentage(project.calculatedStatus.progressPercentage);
      setCurrentStage({
        name: project.calculatedStatus.currentStage.name,
        status: project.calculatedStatus.currentStage.status,
        nextMilestone: project.calculatedStatus.nextMilestone
      });
    }
  }, [project]);

  // Add authentication check
  useEffect(() => {
    const getUser = async () => {
      try {
        // First try to get the session
        const { data: sessionData } = await supabase.auth.getSession();
        
        // If we have a session, get the user
        if (sessionData?.session) {
          const { data } = await supabase.auth.getUser();
          setUser(data.user);
        } else {
          // No active session found
        }
      } catch (error) {
        console.error('Error retrieving authentication:', error);
      }
    };

    getUser();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string, session: any) => {

        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
      }
    );

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const fetchProjectData = async () => {
      if (!params.id) return;
      
      setLoading(true);
      try {

        
        // Fetch project from the API endpoint that includes calculated status
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: params.id }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch project');
        }
        
        const projectData = await response.json();
        

        
        setProject(projectData);
      } catch (error) {
        // Error handled with error state
        setError('Failed to load project details.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjectData();
  }, [params.id, user]);

  if (loading) {
    return (
      <AppShell>
        <LoadingSpinner size="large" className="py-12" />
      </AppShell>
    );
  }
  
  // Check if user is authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Not authenticated</h2>
          <Link 
            href="/login" 
            className="px-4 py-2 text-white rounded-md brand-button"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (!project && !loading) {
    return (
      <AppShell>
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-600">Project not found</h3>
          {error && (
            <div className="mt-2 p-4 bg-red-50 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
              <p className="text-sm text-gray-600 mt-2">Project ID: {params.id}</p>
            </div>
          )}
          <div className="mt-5">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white brand-button"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // We've already checked that project is not null above, but TypeScript doesn't know that
  // So we'll add this additional check to satisfy TypeScript
  if (!project) {
    return null;
  }
  
  return (
    <AppShell>
      <div className="py-3 sm:py-6">
        {/* Project header with image */}
        <div className="flex flex-col md:flex-row mb-4 sm:mb-6">
          <div className="w-full md:w-1/4 h-48 md:h-100% bg-gray-200 rounded-lg overflow-hidden">
            {/* Debug output */}
            <img 
              src={getProjectHomePhotoUrl(project)} 
              alt={`Satellite view of ${project.name}`} 
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('Satellite image failed to load:', e.currentTarget.src);
                e.currentTarget.src = 'https://via.placeholder.com/600x300?text=Satellite+View+Unavailable';
              }}
            />
          </div>
          <div className="w-full md:w-3/4 mt-4 md:mt-0 md:pl-6">
            <div className="flex flex-col sm:flex-row sm:justify-between">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 mb-3 sm:mb-0">{project.address}</h1>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-medium text-gray-500">Current Stage:</span>
                  <div className={`px-2 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-extrabold bg-blue-100 text-blue-800`}>
                    {project.calculatedStatus?.currentStage?.name ? 
                      (sectionDisplayNames[project.calculatedStatus.currentStage.name.toLowerCase().replace(' ', '-')] || project.calculatedStatus.currentStage.name) : 
                      sectionDisplayNames[currentStage.name.toLowerCase().replace(' ', '-')] || currentStage.name}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-medium text-gray-500">Next Milestone:</span>
                  <div className="px-2 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-extrabold bg-yellow-50 text-amber-800">
                    {getNextMilestoneDisplayName(project.calculatedStatus?.nextMilestone || currentStage.nextMilestone)}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
              <div className="flex">
                <p className="text-xs sm:text-sm text-gray-500 w-24 sm:w-28">System Size:</p>
                <p className="text-xs sm:text-sm font-extrabold text-gray-900">
                  {project.system_size || 
                   (project.raw_payload && project.raw_payload['system-size'] ? 
                    project.raw_payload['system-size'] : 'N/A')}
                  {(project.system_size || (project.raw_payload && project.raw_payload['system-size'])) ? ' kW' : ''}
                </p>
              </div>
              <div className="flex">
                <p className="text-xs sm:text-sm text-gray-500 w-24 sm:w-28">Sales Rep:</p>
                <p className="text-xs sm:text-sm font-extrabold text-gray-900">{project.sales_reps?.name || 'Aveyo Support'}</p>
              </div>
              <div className="flex">
                <p className="text-xs sm:text-sm text-gray-500 w-24 sm:w-28">Support Email:</p>
                <p className="text-xs sm:text-sm font-extrabold text-gray-900">customercare@aveyo.com</p>
              </div>
              <div className="flex">
                <p className="text-xs sm:text-sm text-gray-500 w-24 sm:w-28">Support Phone:</p>
                <p className="text-xs sm:text-sm font-extrabold text-gray-900">(385) 469-3838</p>
              </div>
            </div>
            
            {/* Progress bar - segmented by installation stages */}
            <div className="mt-4 sm:mt-6">
              {/* Progress bar segments */}
              <div className="w-full flex space-x-1 h-2 sm:h-3">
                {/* Pre-Approvals section - show partial completion */}
                <div className="h-full rounded-l-full overflow-hidden relative" style={{ width: '24.25%' }}>
                  <div className="absolute top-0 left-0 h-full w-full bg-gray-300"></div>
                  <div 
                    className={`absolute top-0 left-0 h-full ${currentStage.name === 'Pre-Approvals' && currentStage.status === 'In Progress' ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${sectionProgress['pre-approvals']}%` }}
                  ></div>
                </div>
                
                {/* Approvals section */}
                <div className="h-full overflow-hidden relative" style={{ width: '24.25%' }}>
                  <div className="absolute top-0 left-0 h-full w-full bg-gray-300"></div>
                  <div 
                    className={`absolute top-0 left-0 h-full ${currentStage.name === 'Approvals' && currentStage.status === 'In Progress' ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${sectionProgress['approvals']}%` }}
                  ></div>
                </div>
                
                {/* Construction section */}
                <div className="h-full overflow-hidden relative" style={{ width: '24.25%' }}>
                  <div className="absolute top-0 left-0 h-full w-full bg-gray-300"></div>
                  <div 
                    className={`absolute top-0 left-0 h-full ${currentStage.name === 'Construction' && currentStage.status === 'In Progress' ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${sectionProgress['construction']}%` }}
                  ></div>
                </div>
                
                {/* Energization/Activation section */}
                <div className="h-full rounded-r-full overflow-hidden relative" style={{ width: '24.25%' }}>
                  <div className="absolute top-0 left-0 h-full w-full bg-gray-300"></div>
                  <div 
                    className={`absolute top-0 left-0 h-full ${currentStage.name === 'Energization' && currentStage.status === 'In Progress' ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${sectionProgress['energization']}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Stage labels */}
              <div className="w-full flex mt-1 sm:mt-2 px-1 text-2xs sm:text-xs font-medium">
                <div className="w-1/4 pr-1 text-center">
                  <span className={`${currentStage.name === 'Pre-Approvals' && currentStage.status === 'In Progress' ? 'text-yellow-800' : 
                    (currentStage.name !== 'Pre-Approvals' || currentStage.status === 'Completed') ? 'text-green-800' : 'text-gray-600'}`}>
                    {sectionDisplayNames['pre-approvals']}
                  </span>
                </div>
                <div className="w-1/4 px-1 text-center">
                  <span className={`${currentStage.name === 'Approvals' && currentStage.status === 'In Progress' ? 'text-yellow-800' : 
                    (currentStage.name === 'Approvals' && currentStage.status === 'Completed') || ['Construction', 'Energization'].includes(currentStage.name) ? 'text-green-800' : 'text-gray-600'}`}>
                    {sectionDisplayNames['approvals']}
                  </span>
                </div>
                <div className="w-1/4 px-1 text-center">
                  <span className={`${currentStage.name === 'Construction' && currentStage.status === 'In Progress' ? 'text-yellow-800' : 
                    (currentStage.name === 'Construction' && currentStage.status === 'Completed') || currentStage.name === 'Energization' ? 'text-green-800' : 'text-gray-600'}`}>
                    {sectionDisplayNames['construction']}
                  </span>
                </div>
                <div className="w-1/4 pl-1 text-center">
                  <span className={`${currentStage.name === 'Energization' && currentStage.status === 'In Progress' ? 'text-yellow-800' : 
                    currentStage.name === 'Energization' && currentStage.status === 'Completed' ? 'text-green-800' : 'text-gray-600'}`}>
                    {sectionDisplayNames['energization']}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Installation Progress */}
        <div>
          <InstallationProgress 
            project={project} 
          />
        </div>

        {/* Action buttons - removed as they're not in the design */}
      </div>
    </AppShell>
  );
}
