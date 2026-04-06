'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import '@/styles/brand-colors.css';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import StatusBadge from '@/components/ui/StatusBadge';
import { Project } from '@/types';
import { getProjectHomePhotoUrl } from '@/utils/projectUtils';
import { getMilestoneDisplayName, getNextMilestoneDisplayName, sectionDisplayNames } from '@/utils/milestoneUtils';
import { useProjects } from '@/context/ProjectsContext';
import { useAuth } from '@/context/AuthContext';
import { analytics } from '@/lib/analytics';

// Declare AvaAuth interface for TypeScript
declare global {
  interface Window {
    AvaAuth: {
      setSession: (sessionData: {
        email: string;
        userId?: string;
        name?: string;
        token?: string;
        customData?: any;
      }) => void;
      clearSession: () => void;
      getSession: () => any;
      open: () => void;
      close: () => void;
      isOpen: () => boolean;
    };
  }
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { projects, loading, error } = useProjects();

  useEffect(() => {
    // Track page view
    analytics.pageView('dashboard');
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

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

  // Helper function to determine milestone status for progress bar
  const getMilestoneProgress = (project: any) => {
    // Import helper functions from InstallationProgress component
    const isCompleted = (date: string | undefined, status: string | undefined) => {
      if (date) {
        return true;
      }
      
      if (status && typeof status === 'string') {
        return status.toLowerCase() === 'complete' || status.toLowerCase() === 'completed';
      }
      
      return false;
    };
    
    // Extract milestone data from project
    const milestone = project.milestone || {};
    const podioData = project.podio_data?.raw_payload || {};
    
    // Extract milestone data from different sources
    const preApprovals = {
      'site-survey-complete': milestone['site-survey-complete'] || podioData['site-survey-complete'],
      'site-survey-status': milestone['site-survey-status'] || podioData['site-survey-status'],
      'ntp-complete': milestone['ntp-complete'] || podioData['ntp-complete'],
      'engineering-complete': milestone['engineering-complete'] || podioData['engineering-complete'],
      'engineering-status': milestone['engineering-status'] || podioData['engineering-status']
    };
    
    const approvals = {
      'pre-install-review-complete': milestone['pre-install-review-complete'] || podioData['pre-install-review-complete']
    };
    
    const construction = {
      'install-appointment': milestone['install-appointment'] || podioData['install-appointment'] || milestone['estimated-install-date'] || podioData['estimated-install-date'],
      'install-complete': milestone['install-complete'] || podioData['install-complete'],
      'ahj-inspection-complete': milestone['ahj-inspection-complete'] || podioData['ahj-inspection-complete']
    };
    
    const energization = {
      'pto-received': milestone['pto-received'] || podioData['pto-received'],
      'pto-status': milestone['pto-status'] || podioData['pto-status'],
      'energize-complete-date': milestone['energize-complete-date'] || podioData['energize-complete-date'],
      'engergize-status': milestone['engergize-status'] || podioData['engergize-status']
    };
    
    // Calculate section statuses
    const getSectionStatus = (section: string) => {
      let status = 'Not Started';
      let allCompleted = false;
      let anyCompleted = false;
      
      if (section === 'pre-approvals') {
        const siteCompleted = isCompleted(preApprovals?.['site-survey-complete'], preApprovals?.['site-survey-status']);
        const ntpCompleted = isCompleted(preApprovals?.['ntp-complete'], undefined);
        const engineeringCompleted = isCompleted(preApprovals?.['engineering-complete'], preApprovals?.['engineering-status']);
        
        allCompleted = siteCompleted && ntpCompleted && engineeringCompleted;
        anyCompleted = siteCompleted || ntpCompleted || engineeringCompleted;
      } else if (section === 'approvals') {
        const reviewCompleted = isCompleted(approvals?.['pre-install-review-complete'], undefined);
        
        allCompleted = reviewCompleted;
        anyCompleted = reviewCompleted;
      } else if (section === 'construction') {
        const appointmentCompleted = isCompleted(construction?.['install-appointment'], undefined);
        const installCompleted = isCompleted(construction?.['install-complete'], undefined);
        const inspectionCompleted = isCompleted(construction?.['ahj-inspection-complete'], undefined);
        
        allCompleted = appointmentCompleted && installCompleted && inspectionCompleted;
        anyCompleted = appointmentCompleted || installCompleted || inspectionCompleted;
      } else if (section === 'energization') {
        const ptoCompleted = isCompleted(energization?.['pto-received'], energization?.['pto-status']);
        const energizeCompleted = isCompleted(energization?.['energize-complete-date'], energization?.['engergize-status']);
        
        allCompleted = ptoCompleted && energizeCompleted;
        anyCompleted = ptoCompleted || energizeCompleted;
      }
      
      if (allCompleted) {
        status = 'Completed';
      } else if (anyCompleted) {
        status = 'In Progress';
      }
      
      return { status };
    };
    
    // Get status for each section
    const preApprovalStatus = getSectionStatus('pre-approvals');
    const approvalsStatus = getSectionStatus('approvals');
    const constructionStatus = getSectionStatus('construction');
    const energizationStatus = getSectionStatus('energization');
    
    // Determine current stage and next milestone
    let currentStage = { name: 'Planning', status: 'Not Started', nextMilestone: 'Site Survey' };
    
    // Calculate progress percentage
    let completedMilestones = 0;
    const totalMilestones = 9;
    
    // Count completed milestones
    if (isCompleted(preApprovals?.['site-survey-complete'], preApprovals?.['site-survey-status'])) completedMilestones++;
    if (isCompleted(preApprovals?.['ntp-complete'], undefined)) completedMilestones++;
    if (isCompleted(preApprovals?.['engineering-complete'], preApprovals?.['engineering-status'])) completedMilestones++;
    if (isCompleted(approvals?.['pre-install-review-complete'], undefined)) completedMilestones++;
    if (isCompleted(construction?.['install-appointment'], undefined)) completedMilestones++;
    if (isCompleted(construction?.['install-complete'], undefined)) completedMilestones++;
    if (isCompleted(construction?.['ahj-inspection-complete'], undefined)) completedMilestones++;
    if (isCompleted(energization?.['pto-received'], energization?.['pto-status'])) completedMilestones++;
    if (isCompleted(energization?.['energize-complete-date'], energization?.['engergize-status'])) completedMilestones++;
    
    // Calculate progress percentage
    const progressPercentage = Math.round((completedMilestones / totalMilestones) * 100);
    
    // Determine current stage
    if (preApprovalStatus.status !== 'Completed') {
      currentStage = { 
        name: 'Pre-Approvals', 
        status: preApprovalStatus.status,
        nextMilestone: isCompleted(preApprovals?.['site-survey-complete'], preApprovals?.['site-survey-status']) ?
          (isCompleted(preApprovals?.['ntp-complete'], undefined) ? 'Engineering Complete' : 'Notice to Proceed') :
          'Site Survey'
      };
    } else if (approvalsStatus.status !== 'Completed') {
      currentStage = { 
        name: 'Approvals', 
        status: approvalsStatus.status,
        nextMilestone: 'Pre-Install Review'
      };
    } else if (constructionStatus.status !== 'Completed') {
      currentStage = { 
        name: 'Construction', 
        status: constructionStatus.status,
        nextMilestone: isCompleted(construction?.['install-appointment'], undefined) ?
          (isCompleted(construction?.['install-complete'], undefined) ? 'Inspection Complete' : 'Installation Complete') :
          'Installation Appointment'
      };
    } else if (energizationStatus.status !== 'Completed') {
      currentStage = { 
        name: 'Activation', 
        status: energizationStatus.status,
        nextMilestone: isCompleted(energization?.['pto-received'], energization?.['pto-status']) ? 'System Energized' : 'Permission to Operate'
      };
    } else if (preApprovalStatus.status === 'Completed' && 
               approvalsStatus.status === 'Completed' && 
               constructionStatus.status === 'Completed' && 
               energizationStatus.status === 'Completed') {
      currentStage = { 
        name: 'Completed', 
        status: 'Completed',
        nextMilestone: 'System Active and Producing'
      };
    }
    
    return { 
      color: 'bg-green-500', 
      width: `${progressPercentage}%`, 
      status: currentStage.name, 
      tag: currentStage.nextMilestone,
      progress: progressPercentage
    };
  };

  // Format date to MM/DD/YYYY
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };
  
  // Get user's first name
  const getFirstName = () => {
    if (!user?.user_metadata?.full_name) return '';
    return user.user_metadata.full_name.split(' ')[0];
  };

  return (
    <>
      <AppShell>
      <div className="py-4 sm:py-6 px-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">
          WELCOME <span className="truncate inline-block max-w-[70%] align-bottom">{user?.email?.toUpperCase()}</span>
        </h1>
        
        <p className="text-base sm:text-lg text-gray-700 mb-6 sm:mb-8">Your solar projects.</p>

        {/* Annual Report Card */}
        <Link href="/annual-report">
          <div className="mb-6 sm:mb-8 bg-white border-2 border-gray-200 rounded-xl shadow-md overflow-hidden hover:shadow-lg hover:border-blue-400 transition-all cursor-pointer">
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between">
              <div className="mb-4 sm:mb-0">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="text-3xl">📊</div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    Your 2026 Solar Value Report
                  </h2>
                </div>
                <p className="text-gray-700 text-sm sm:text-base font-medium">
                  See your annual energy production, environmental impact, and savings
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors">
                  View Report
                  <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {loading ? (
          <LoadingSpinner size="large" className="py-12" />
        ) : (
          <div className="grid gap-4 mb-[100px] sm:gap-6 md:gap-8 md:grid-cols-2">
            {projects.map((project) => {
              // Use the calculatedStatus from the project if available, otherwise fall back to local calculation
              let progress;
              
              if (project.calculatedStatus) {
                // Use the server-calculated status
                progress = {
                  color: 'bg-green-500',
                  width: `${project.calculatedStatus.progressPercentage}%`,
                  status: project.calculatedStatus.currentStage.name,
                  tag: project.calculatedStatus.nextMilestone,
                  progress: project.calculatedStatus.progressPercentage
                };
              } else {
                // Fall back to local calculation if calculatedStatus is not available
                progress = getMilestoneProgress(project);
              }
              
              return (
                <div
                  key={project.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                  <div className="relative h-48 bg-gray-200">
                    <img
                      src={getProjectHomePhotoUrl(project)}
                      alt={`${project.name} - Home`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder-home.jpg';
                      }}
                    />
                  </div>
                  
                  {/* Project details */}
                  <div className="w-full sm:w-2/3 p-3 sm:p-4">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 line-clamp-1">{project.address}</h3>
                    
                    <div className="mt-2 flex flex-col space-y-2">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <span className="text-xs font-medium text-gray-500">Current Stage:</span>
                        <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {sectionDisplayNames[progress.status.toLowerCase().replace(' ', '-')] || progress.status}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <span className="text-xs font-medium text-gray-500">Next Milestone:</span>
                        <span className="px-2 py-1 text-xs font-extrabold rounded-full bg-yellow-50 text-amber-800">
                          {getNextMilestoneDisplayName(project.calculatedStatus?.nextMilestone || progress.tag)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-3 sm:mt-4 w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`${progress.color} h-2.5 rounded-full`} 
                        style={{ width: progress.width }}
                      ></div>
                    </div>
                    
                    <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row justify-between sm:items-center space-y-2 sm:space-y-0">
                      <div className="text-xs sm:text-sm">
                        <span className="text-gray-500">Last Updated: </span>
                        <span className="text-gray-700">{formatDate(project.updated_at)}</span>
                      </div>
                      <Link
                        href={`/dashboard/${project.id}`}
                        className="inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white brand-button"
                        onClick={() => {
                          // Track project view
                          analytics.projectView(project.id);
                        }}
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Ava AI Chatbot CTA Banner */}
        <div className="relative flex justify-center items-center
         rounded-lg shadow-lg p-6 mb-6 sm:mb-8 text-white overflow-hidden h-[300px]" style={{backgroundImage: 'url("/background-color.png")', backgroundSize: 'cover', backgroundPosition: 'center center' }}>
          {/* Ava background image */}
          {/* <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat rounded-lg"
            
          ></div>
          <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg"></div> */}
          
          <div className="relative z-10 flex flex-col items-center sm:items-center justify-center">
            <div className="flex-1">
              <div className="flex flex-col items-center mb-2">
                <div className="mb-2">
                  <img src="/ava-logo2.svg" alt="Ava Logo" className="h-12 w-42" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-center">
                  Meet Ava, Your AI Solar Assistant!
                </h2>
              </div>
              <p className="text-purple-100 mb-4 max-w-[600px] text-center leading-relaxed">
                Get instant answers about your solar project, installation timeline, and more. Ava is here 24/7 to help you navigate your solar journey.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={() => {
                  // Track Ava chat opened from banner
                  analytics.avaChatOpened('banner');
                  
                  if (typeof window !== 'undefined' && window.AvaAuth) {
                    try {
                      window.AvaAuth.open();
                      
                      // Check if widget stays open after a delay
                      setTimeout(() => {
                        if (window.AvaAuth && !window.AvaAuth.isOpen()) {
                          try {
                            window.AvaAuth.open();
                          } catch (retryError) {
                            console.error('Failed to reopen widget:', retryError);
                          }
                        }
                      }, 2000);
                    } catch (error) {
                      console.error('Error calling AvaAuth.open():', error);
                    }
                  }
                }}
                className="inline-flex items-center justify-start gap-2 px-3 sm:px-4 py-1.5 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md bg-white text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <img src="/ava-icon.svg" alt="Ava Icon" className="h-8 w-8" />
                <span>Chat with Ava</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
    </>
  );
}
