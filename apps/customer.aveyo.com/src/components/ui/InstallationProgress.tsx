import React, { useState } from 'react';
import { Project, MilestoneObject } from '@/types';
import { milestoneSequence, sectionOrder, sectionDisplayNames, getMilestoneDisplayName } from '@/utils/milestoneUtils';

// Tooltip component for milestones
interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Handle both touch and mouse events for better mobile experience
  const showTooltip = () => setIsVisible(true);
  const hideTooltip = () => setIsVisible(false);
  
  return (
    <div className="inline-block relative"
      ref={tooltipContainerRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onTouchStart={showTooltip}
      onTouchEnd={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && (
        <div 
          className="absolute z-[100] w-52 sm:w-64 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-normal text-white bg-gray-800 rounded-lg shadow-md"
          style={{
            bottom: 'calc(100% + 10px)', // Position above the trigger element with smaller gap on mobile
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: 'calc(100vw - 20px)' // Prevent overflow on small screens
          }}
        >
          {content}
          {/* Arrow pointing down to the milestone */}
          <div className="absolute w-3 h-3 sm:w-4 sm:h-4 rotate-45 bg-gray-800 bottom-[-1.5px] sm:bottom-[-2px] left-1/2 -ml-1.5 sm:-ml-2"></div>
        </div>
      )}
    </div>
  );
};

interface InstallationProgressProps {
  project: Project;
  className?: string;
  onProgressCalculated?: (percentage: number) => void;
  onStageCalculated?: (stage: { name: string; status: string; nextMilestone: string }) => void;
}

export default function InstallationProgress({ project, className = '', onProgressCalculated, onStageCalculated }: InstallationProgressProps) {
  
  // Log the props received by the component
  console.log('[InstallationProgress] Project data:', {
    id: project.id,
    name: project.name,
    hasCalculatedStatus: !!project.calculatedStatus,
    calculatedStatus: project.calculatedStatus,
    hasMilestone: !!project.milestone,
    milestoneType: typeof project.milestone
  });
  
  // Log the milestone data structure
  // if (typeof project.milestone === 'object' && project.milestone !== null) {
  //   console.log('Project milestone object:', project.milestone);
  // }
  
  // Log the podio data if available
  // if (project.podio_data?.raw_payload) {
  //   console.log('Podio raw_payload:', 
  //     typeof project.podio_data.raw_payload === 'string' ? 
  //       'String (needs parsing)' : 
  //       'Object');
  // }
  
  // Extract the milestone data from the project's milestone object or podio_data
  // First, check if milestone is an object with the milestone data structure
  const milestoneObj = typeof project.milestone === 'object' ? project.milestone as MilestoneObject : null;
  
  
  // Get the raw payload if it exists
  const rawPayload = project.podio_data?.raw_payload ? 
    (typeof project.podio_data.raw_payload === 'string' ? 
      JSON.parse(project.podio_data.raw_payload) : 
      project.podio_data.raw_payload) : 
    null;
  
  // Try to find pre-approvals data from all possible locations
  let preApprovals: any = milestoneObj?.['pre-approvals'] || 
                           (rawPayload && rawPayload['pre-approvals']) || 
                           (rawPayload && rawPayload.pre_approvals) || 
                           {};
  
  let approvals: any = milestoneObj?.approvals || 
                       (rawPayload && rawPayload.approvals) || 
                       {};
  
  let construction: any = milestoneObj?.construction || 
                          (rawPayload && rawPayload.construction) || 
                          {};
  
  let energization: any = milestoneObj?.energization || 
                           (rawPayload && rawPayload.energization) || 
                           {};
  
  // Log the extracted milestone data for each section
  console.log('[InstallationProgress] Extracted milestone data:', {
    preApprovals,
    approvals,
    construction,
    energization
  });
  

  // Helper function to format dates
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  // Helper function to check if a date string is valid
  const hasValidDate = (date: string | undefined | null): boolean => {
    return !!date && date.trim() !== '';
  };

  // Helper function to check if a status string indicates completion
  const isStatusComplete = (status?: string | any): boolean => {
    if (!status) return false;
    // Make sure status is a string before calling toLowerCase
    if (typeof status !== 'string') return false;
    const lowerStatus = status.toLowerCase();
    return lowerStatus === 'complete' || lowerStatus === 'completed' || lowerStatus === 'approved';
  };

  // Using milestone sequences and section order from shared utility

  // Helper function to check if a milestone is directly completed based on date
  const isDirectlyCompleted = (date: string | undefined | null): boolean => {
    return hasValidDate(date);
  };

  // Helper function to check if a milestone is completed based on date and auto-completion logic
  const isCompleted = (date: string | undefined | null, milestoneKey?: string, sectionKey?: string): boolean => {
    // First check if the milestone is directly completed by having a date
    if (isDirectlyCompleted(date)) {
      return true;
    }
    
    // If we don't have milestone key or section key, we can't check for auto-completion
    if (!milestoneKey || !sectionKey) {
      return false;
    }
    
    // Check if any later milestone in this section is completed
    const section = milestoneSequence[sectionKey as keyof typeof milestoneSequence];
    if (!section) return false;
    
    const currentIndex = section.findIndex(item => item.key === milestoneKey);
    if (currentIndex >= 0) {
      // Check if any later milestone in this section is completed
      for (let i = currentIndex + 1; i < section.length; i++) {
        const laterMilestone = section[i];
        const laterDate = sectionKey === 'pre-approvals' ? preApprovals[laterMilestone.key] :
                         sectionKey === 'approvals' ? approvals[laterMilestone.key] :
                         sectionKey === 'construction' ? construction[laterMilestone.key] :
                         energization[laterMilestone.key];
        
        if (isDirectlyCompleted(laterDate)) {
          return true;
        }
      }
    }
    
    // Check if any milestone in a later section is completed
    const currentSectionIndex = sectionOrder.indexOf(sectionKey);
    for (let s = currentSectionIndex + 1; s < sectionOrder.length; s++) {
      const laterSectionKey = sectionOrder[s];
      const laterSection = milestoneSequence[laterSectionKey as keyof typeof milestoneSequence];
      
      for (const laterMilestone of laterSection) {
        const laterDate = laterSectionKey === 'pre-approvals' ? preApprovals[laterMilestone.key] :
                         laterSectionKey === 'approvals' ? approvals[laterMilestone.key] :
                         laterSectionKey === 'construction' ? construction[laterMilestone.key] :
                         energization[laterMilestone.key];
        
        if (isDirectlyCompleted(laterDate)) {
          return true;
        }
      }
    }
    
    return false;
  };

  // Helper function to check if a milestone is in progress
  const isInProgress = (status?: string): boolean => {
    return status === 'In Progress' || status === 'in_progress';
  };
  
  // Helper function to get section status based on milestone completion
  const getSectionStatus = (section: string): { status: string, color: string, textColor: string } => {
    let status = 'Not Started';
    let color = 'bg-gray-300';
    let textColor = 'text-gray-800';
    let allCompleted = false;
    let anyCompleted = false;

    if (section === 'pre-approvals') {
      const siteCompleted = isCompleted(preApprovals?.['site-survey-complete'], 'site-survey-complete', 'pre-approvals');
      const ntpCompleted = isCompleted(preApprovals?.['ntp-complete'], 'ntp-complete', 'pre-approvals');
      const engineeringCompleted = isCompleted(preApprovals?.['engineering-complete'], 'engineering-complete', 'pre-approvals');
      
      allCompleted = siteCompleted && ntpCompleted && engineeringCompleted;
      anyCompleted = siteCompleted || ntpCompleted || engineeringCompleted;
    } else if (section === 'approvals') {
      const reviewCompleted = isCompleted(approvals?.['pre-install-review-complete'], 'pre-install-review-complete', 'approvals');
      
      allCompleted = reviewCompleted;
      anyCompleted = reviewCompleted;
    } else if (section === 'construction') {
      const appointmentCompleted = isCompleted(construction?.['install-appointment'], 'install-appointment', 'construction');
      const installCompleted = isCompleted(construction?.['install-complete'], 'install-complete', 'construction');
      const inspectionCompleted = isCompleted(construction?.['ahj-inspection-complete'], 'ahj-inspection-complete', 'construction');
      
      allCompleted = appointmentCompleted && installCompleted && inspectionCompleted;
      anyCompleted = appointmentCompleted || installCompleted || inspectionCompleted;
    } else if (section === 'energization') {
      const ptoCompleted = isCompleted(energization?.['pto-received'], 'pto-received', 'energization');
      const energizeCompleted = isCompleted(energization?.['energize-complete-date'], 'energize-complete-date', 'energization');
      
      allCompleted = ptoCompleted && energizeCompleted;
      anyCompleted = ptoCompleted || energizeCompleted;
    }

    if (allCompleted) {
      status = 'Completed';
      color = 'bg-green-500';
      textColor = 'text-green-800';
    } else if (anyCompleted) {
      status = 'In Progress';
      color = 'bg-yellow-500';
      textColor = 'text-yellow-800';
    }

    return { status, color, textColor };
  };

  // Get status for each section
  let preApprovalStatus = getSectionStatus('pre-approvals');
  let approvalsStatus = getSectionStatus('approvals');
  let constructionStatus = getSectionStatus('construction');
  let energizationStatus = getSectionStatus('energization');
  
  // Log section statuses
  // console.log('Section statuses:', {
  //   preApprovalStatus,
  //   approvalsStatus,
  //   constructionStatus,
  //   energizationStatus
  // });
  
  // If we have server-calculated status, override the section status based on currentStage
  if (project.calculatedStatus) {
    const { currentStage } = project.calculatedStatus;
    
    // Override section status based on currentStage
    if (currentStage.name === 'Pre-Approvals' && currentStage.status === 'in_progress') {
      preApprovalStatus = { ...preApprovalStatus, status: 'In Progress' };
    } else if (currentStage.name === 'Approvals' && currentStage.status === 'in_progress') {
      approvalsStatus = { ...approvalsStatus, status: 'In Progress' };
    } else if (currentStage.name === 'Construction' && currentStage.status === 'in_progress') {
      constructionStatus = { ...constructionStatus, status: 'In Progress' };
    } else if ((currentStage.name === 'Energization' || currentStage.name === 'Activation') && currentStage.status === 'in_progress') {
      energizationStatus = { ...energizationStatus, status: 'In Progress' };
    }
  }
  
  // Determine the current active stage of the project
  const determineCurrentStage = (): { name: string; status: string; nextMilestone: string } => {
    // If we have server-calculated status, use that
    if (project.calculatedStatus) {
      console.log('[InstallationProgress] Using server-calculated stage:', project.calculatedStatus.currentStage);
      return {
        name: project.calculatedStatus.currentStage.name,
        status: project.calculatedStatus.currentStage.status,
        nextMilestone: project.calculatedStatus.nextMilestone
      };
    }
    
    console.log('[InstallationProgress] No calculatedStatus, falling back to client-side stage calculation');
    
    // Otherwise, calculate it client-side as fallback
    // Check if all sections are completed
    if (preApprovalStatus.status === 'Completed' && 
        approvalsStatus.status === 'Completed' && 
        constructionStatus.status === 'Completed' && 
        energizationStatus.status === 'Completed') {
      return { name: 'Completed', status: 'Completed', nextMilestone: getMilestoneDisplayName('system-active') };
    }
    
    // Check which section is in progress, starting from the beginning
    if (preApprovalStatus.status !== 'Completed') {
      // Determine next milestone in pre-approvals
      let nextMilestone = getMilestoneDisplayName('site-survey-complete');
      if (isCompleted(preApprovals?.['site-survey-complete'], preApprovals?.['site-survey-status'])) {
        nextMilestone = getMilestoneDisplayName('ntp-complete');
        if (isCompleted(preApprovals?.['ntp-complete'], undefined)) {
          nextMilestone = getMilestoneDisplayName('engineering-complete');
        }
      }
      return { name: 'Pre-Approvals', status: preApprovalStatus.status, nextMilestone };
    }
    
    if (approvalsStatus.status !== 'Completed') {
      return { name: 'Approvals', status: approvalsStatus.status, nextMilestone: getMilestoneDisplayName('pre-install-review-complete') };
    }
    
    if (constructionStatus.status !== 'Completed') {
      // Determine next milestone in construction
      let nextMilestone = getMilestoneDisplayName('install-appointment');
      if (isCompleted(construction?.['install-appointment'], undefined)) {
        nextMilestone = getMilestoneDisplayName('install-complete');
        if (isCompleted(construction?.['install-complete'], undefined)) {
          nextMilestone = getMilestoneDisplayName('ahj-inspection-complete');
        }
      }
      return { name: 'Construction', status: constructionStatus.status, nextMilestone };
    }
    
    if (energizationStatus.status !== 'Completed') {
      // Determine next milestone in energization
      let nextMilestone = getMilestoneDisplayName('pto-received');
      if (isCompleted(energization?.['pto-received'], energization?.['pto-status'])) {
        nextMilestone = getMilestoneDisplayName('energize-complete-date');
        if (isCompleted(energization?.['energize-complete-date'], undefined)) {
          nextMilestone = getMilestoneDisplayName('system-active');
        }
      }
      return { name: 'Activation', status: energizationStatus.status, nextMilestone };
    }
    
    // Fallback (should not reach here if logic above is correct)
    return { name: 'Completed', status: 'Completed', nextMilestone: getMilestoneDisplayName('system-active') };
  };
  
  // Get the current stage - moved to after progress percentage calculation
  
  // Calculate the overall progress percentage based on completed milestones
  const calculateProgressPercentage = (): number => {
    // If we have server-calculated status, use that
    if (project.calculatedStatus) {
      console.log('[InstallationProgress] Using server-calculated progress:', project.calculatedStatus.progressPercentage);
      return project.calculatedStatus.progressPercentage;
    }
    
    console.log('[InstallationProgress] No calculatedStatus, falling back to client-side calculation');
    
    // Count all milestones
    const totalMilestones = 9; // 3 pre-approvals + 1 approvals + 3 construction + 2 energization
    
    // Count completed milestones
    let completedMilestones = 0;
    let milestoneStatus = [];
    
    // Pre-approvals milestones
    const siteSurveyCompleted = isCompleted(preApprovals?.['site-survey-complete'], preApprovals?.['site-survey-status']);
    if (siteSurveyCompleted) completedMilestones++;
    milestoneStatus.push({ name: 'Site Survey', completed: siteSurveyCompleted, hasDate: !!preApprovals?.['site-survey-complete'] });
    
    const ntpCompleted = isCompleted(preApprovals?.['ntp-complete'], undefined);
    if (ntpCompleted) completedMilestones++;
    milestoneStatus.push({ name: 'NTP', completed: ntpCompleted, hasDate: !!preApprovals?.['ntp-complete'] });
    
    const engineeringCompleted = isCompleted(preApprovals?.['engineering-complete'], preApprovals?.['engineering-status']);
    if (engineeringCompleted) completedMilestones++;
    milestoneStatus.push({ name: 'Engineering', completed: engineeringCompleted, hasDate: !!preApprovals?.['engineering-complete'] });
    
    // Approvals milestones
    const reviewCompleted = isCompleted(approvals?.['pre-install-review-complete'], undefined);
    if (reviewCompleted) completedMilestones++;
    milestoneStatus.push({ name: 'Pre-Install Review', completed: reviewCompleted, hasDate: !!approvals?.['pre-install-review-complete'] });
    
    // Construction milestones
    const appointmentCompleted = isCompleted(construction?.['install-appointment'], undefined);
    if (appointmentCompleted) completedMilestones++;
    milestoneStatus.push({ name: 'Install Appointment', completed: appointmentCompleted, hasDate: !!construction?.['install-appointment'] });
    
    const installCompleted = isCompleted(construction?.['install-complete'], undefined);
    if (installCompleted) completedMilestones++;
    milestoneStatus.push({ name: 'Install Complete', completed: installCompleted, hasDate: !!construction?.['install-complete'] });
    
    const inspectionCompleted = isCompleted(construction?.['ahj-inspection-complete'], undefined);
    if (inspectionCompleted) completedMilestones++;
    milestoneStatus.push({ name: 'Inspection', completed: inspectionCompleted, hasDate: !!construction?.['ahj-inspection-complete'] });
    
    // Energization milestones
    const ptoCompleted = isCompleted(energization?.['pto-received'], energization?.['pto-status']);
    if (ptoCompleted) completedMilestones++;
    milestoneStatus.push({ name: 'PTO', completed: ptoCompleted, hasDate: !!energization?.['pto-received'] });
    
    const energizeCompleted = isCompleted(energization?.['energize-complete-date'], energization?.['engergize-status']);
    if (energizeCompleted) completedMilestones++;
    milestoneStatus.push({ name: 'Energize', completed: energizeCompleted, hasDate: !!energization?.['energize-complete-date'] });
    
    // Calculate percentage
    const percentage = Math.round((completedMilestones / totalMilestones) * 100);
    
    // Log milestone status and progress percentage
    // console.log('Project ID:', project.id);
    // console.log('Milestone Status:', milestoneStatus);
    // console.log(`Progress: ${completedMilestones}/${totalMilestones} milestones completed (${percentage}%)`);
    // console.log('Auto-completed milestones:', milestoneStatus.filter(m => m.completed && !m.hasDate).map(m => m.name));
    
    return percentage;
  };
  
  // Get the progress percentage
  const progressPercentage = calculateProgressPercentage();
  
  // Get the current stage
  const currentStage = determineCurrentStage();
  
  // Log the final calculated values
  // console.log('Final calculated values:', {
  //   progressPercentage,
  //   currentStage,
  //   usingServerCalculated: !!project.calculatedStatus
  // });
  
  // Call the callbacks with the progress percentage and current stage if provided
  // Using a ref to track if this is the first render to avoid infinite loops
  const isFirstRender = React.useRef(true);
  
  React.useEffect(() => {
    // Only call the callbacks on the first render
    if (isFirstRender.current) {
      if (onProgressCalculated) {
        onProgressCalculated(progressPercentage);
      }
      if (onStageCalculated) {
        onStageCalculated(currentStage);
      }
      isFirstRender.current = false;
    }
  }, [progressPercentage, currentStage, onProgressCalculated, onStageCalculated]);

  // Helper function to get tooltip content for each milestone
  const getMilestoneTooltip = (milestoneType: string): string => {
    switch(milestoneType) {
      // Pre-Approvals
      case 'site-survey':
        return "A technician visits your property to evaluate the site, take measurements, and determine the best location for solar panels.";
      case 'ntp':
        return "Notice to Proceed (NTP) is approved by financing, allowing the project to move forward with engineering and permitting.";
      case 'engineering':
        return "Our engineers design your custom solar system, including panel layout, electrical plans, and structural analysis.";
      
      // Approvals
      case 'pre-install-review':
        return "All necessary permits and approvals from your city and utility company are submitted and awaiting approval.";
      
      // Construction
      case 'install-appointment':
        return "The date when our installation team is scheduled to begin installing your solar system.";
      case 'install-complete':
        return "Your solar panel installation is physically complete with all equipment mounted and connected.";
      case 'inspection':
        return "City officials and/or utility representatives inspect the installation to ensure it meets all safety codes and requirements.";
      
      // Activation
      case 'pto':
        return "Permission to Operate (PTO) is granted by your utility company, allowing your system to be turned on and connected to the grid.";
      case 'energize':
        return "Your solar system is fully activated and begins producing clean energy for your home.";
      
      default:
        return "This milestone represents a key step in your solar installation process.";
    }
  };

  // Helper function to render milestone item with pill-like container and color-coded status circle
  const renderMilestoneItem = (title: string, isComplete: boolean, sectionStatus: string, dateValue?: string | null, tooltipType?: string) => {
    // Determine the status circle appearance based on completion and section status
    let statusCircle;
    
    if (isComplete) {
      // Completed milestone - green circle with checkmark
      statusCircle = (
        <div className="rounded-full bg-green-500 h-5 w-5 flex items-center justify-center">
          <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      );
    } else if (sectionStatus === 'In Progress') {
      // In progress section, milestone not completed - yellow filled circle
      statusCircle = (
        <div className="rounded-full bg-yellow-400 h-5 w-5 flex items-center justify-center">
        </div>
      );
    } else {
      // Not started section - gray filled circle
      statusCircle = (
        <div className="rounded-full bg-gray-300 h-5 w-5 flex items-center justify-center">
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 sm:space-x-3 my-1.5 sm:my-2">
        <div>{statusCircle}</div>
        {tooltipType ? (
          <Tooltip content={getMilestoneTooltip(tooltipType)}>
            <div className={`text-xs sm:text-sm ${isComplete ? 'font-extrabold' : 'font-normal'} text-gray-900 flex items-center flex-wrap cursor-help`}>
              {title}
              {dateValue && (
                <span className="ml-1 text-gray-600 font-normal text-xs sm:text-sm">
                  ({formatDate(dateValue)})
                </span>
              )}
              <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-1 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
          </Tooltip>
        ) : (
          <div className={`text-xs sm:text-sm ${isComplete ? 'font-extrabold' : 'font-normal'} text-gray-900 flex-wrap`}>
            {title}
            {dateValue && (
              <span className="ml-1 text-gray-600 font-normal text-xs sm:text-sm">
                ({formatDate(dateValue)})
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`${className} space-y-4 sm:space-y-6`}>
      {/* Pre-Approvals Section */}
      <div className="bg-white rounded-lg shadow relative">
        <div className="p-4 sm:p-6 pb-6 sm:pb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-extrabold text-gray-900">Pre-Approvals</h3>
            <div className={`inline-flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-extrabold ${preApprovalStatus.status === 'Completed' ? 'bg-green-100 text-green-800' : preApprovalStatus.status === 'In Progress' ? 'bg-yellow-50 text-amber-800' : 'bg-gray-200 text-gray-700'}`}>
              <span>
                {preApprovalStatus.status === 'Completed' ? 'Completed' : preApprovalStatus.status === 'In Progress' ? 'In Progress' : 'Not Started'}
              </span>
              {preApprovalStatus.status === 'Completed' ? (
                <div className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <div className={`ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full ${preApprovalStatus.status === 'In Progress' ? 'bg-yellow-400' : 'bg-gray-400'}`}></div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start space-y-0.5 sm:space-y-1">
            {renderMilestoneItem('Site Survey', isCompleted(preApprovals?.['site-survey-complete'], 'site-survey-complete', 'pre-approvals'), preApprovalStatus.status, preApprovals?.['site-survey-complete'], 'site-survey')}
            {renderMilestoneItem('Notice to Proceed approved by financing', isCompleted(preApprovals?.['ntp-complete'], 'ntp-complete', 'pre-approvals'), preApprovalStatus.status, preApprovals?.['ntp-complete'], 'ntp')}
            {renderMilestoneItem('Engineering', isCompleted(preApprovals?.['engineering-complete'], 'engineering-complete', 'pre-approvals'), preApprovalStatus.status, preApprovals?.['engineering-complete'], 'engineering')}
          </div>
        </div>
        {/* Status bar at bottom of card */}
        <div className={`h-1 sm:h-1.5 w-full absolute bottom-0 rounded-b-[20px] sm:rounded-b-[30px] ${preApprovalStatus.status === 'Completed' ? 'bg-green-500' : preApprovalStatus.status === 'In Progress' ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
      </div>

      {/* Approvals Section */}
      <div className="bg-white rounded-lg shadow relative">
        <div className="p-4 sm:p-6 pb-6 sm:pb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-extrabold text-gray-900">Approvals</h3>
            <div className={`inline-flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-extrabold ${approvalsStatus.status === 'Completed' ? 'bg-green-100 text-green-800' : approvalsStatus.status === 'In Progress' ? 'bg-yellow-50 text-amber-800' : 'bg-gray-200 text-gray-700'}`}>
              <span>
                {approvalsStatus.status === 'Completed' ? 'Completed' : approvalsStatus.status === 'In Progress' ? 'In Progress' : 'Not Started'}
              </span>
              {approvalsStatus.status === 'Completed' ? (
                <div className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <div className={`ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full ${approvalsStatus.status === 'In Progress' ? 'bg-yellow-400' : 'bg-gray-400'}`}></div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start space-y-0.5 sm:space-y-1">
            {renderMilestoneItem('All city and utility approvals submitted', isCompleted(approvals?.['pre-install-review-complete'], 'pre-install-review-complete', 'approvals'), approvalsStatus.status, approvals?.['pre-install-review-complete'], 'pre-install-review')}
          </div>
        </div>
        {/* Status bar at bottom of card */}
        <div className={`h-1 sm:h-1.5 w-full absolute bottom-0 rounded-b-[20px] sm:rounded-b-[30px] ${approvalsStatus.status === 'Completed' ? 'bg-green-500' : approvalsStatus.status === 'In Progress' ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
      </div>

      {/* Construction Section */}
      <div className="bg-white rounded-lg shadow relative">
        <div className="p-4 sm:p-6 pb-6 sm:pb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-extrabold text-gray-900">Construction</h3>
            <div className={`inline-flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-extrabold ${constructionStatus.status === 'Completed' ? 'bg-green-100 text-green-800' : constructionStatus.status === 'In Progress' ? 'bg-yellow-50 text-amber-800' : 'bg-gray-200 text-gray-700'}`}>
              <span>
                {constructionStatus.status === 'Completed' ? 'Completed' : constructionStatus.status === 'In Progress' ? 'In Progress' : 'Not Started'}
              </span>
              {constructionStatus.status === 'Completed' ? (
                <div className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <div className={`ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full ${constructionStatus.status === 'In Progress' ? 'bg-yellow-400' : 'bg-gray-400'}`}></div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start space-y-0.5 sm:space-y-1">
            {renderMilestoneItem('Confirmed Install Appointment Date', isCompleted(construction?.['install-appointment'], 'install-appointment', 'construction'), constructionStatus.status, construction?.['install-appointment'], 'install-appointment')}
            {renderMilestoneItem('Install Substantial Completion', isCompleted(construction?.['install-complete'], 'install-complete', 'construction'), constructionStatus.status, construction?.['install-complete'], 'install-complete')}
            {renderMilestoneItem('City and/or Utility Inspections', isCompleted(construction?.['ahj-inspection-complete'], 'ahj-inspection-complete', 'construction'), constructionStatus.status, construction?.['ahj-inspection-complete'], 'inspection')}
          </div>
        </div>
        {/* Status bar at bottom of card */}
        <div className={`h-1 sm:h-1.5 w-full absolute bottom-0 rounded-b-[20px] sm:rounded-b-[30px] ${constructionStatus.status === 'Completed' ? 'bg-green-500' : constructionStatus.status === 'In Progress' ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
      </div>

      {/* Activation Section */}
      <div className="bg-white rounded-lg shadow relative">
        <div className="p-4 sm:p-6 pb-6 sm:pb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-extrabold text-gray-900">Activation</h3>
            <div className={`inline-flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-extrabold ${energizationStatus.status === 'Completed' ? 'bg-green-100 text-green-800' : energizationStatus.status === 'In Progress' ? 'bg-yellow-50 text-amber-800' : 'bg-gray-200 text-gray-700'}`}>
              <span>
                {energizationStatus.status === 'Completed' ? 'Completed' : energizationStatus.status === 'In Progress' ? 'In Progress' : 'Not Started'}
              </span>
              {energizationStatus.status === 'Completed' ? (
                <div className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <div className={`ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full ${energizationStatus.status === 'In Progress' ? 'bg-yellow-400' : 'bg-gray-400'}`}></div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start space-y-0.5 sm:space-y-1">
            {renderMilestoneItem('Permission To Operate Received from Utility Company', isCompleted(energization?.['pto-received'], 'pto-received', 'energization'), energizationStatus.status, energization?.['pto-received'], 'pto')}
            {renderMilestoneItem('System Active and Producing', isCompleted(energization?.['system-active'], 'system-active', 'energization'), energizationStatus.status, energization?.['system-active'], 'system-active')}
          </div>
        </div>
        {/* Status bar at bottom of card */}
        <div className={`h-1 sm:h-1.5 w-full absolute bottom-0 rounded-b-[20px] sm:rounded-b-[30px] ${energizationStatus.status === 'Completed' ? 'bg-green-500' : energizationStatus.status === 'In Progress' ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
      </div>
    </div>
  );
}
