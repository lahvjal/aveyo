import React from 'react';
import { Milestone } from '@/types';

interface MilestoneTimelineProps {
  milestones: Milestone[];
  className?: string;
}

export default function MilestoneTimeline({ milestones, className = '' }: MilestoneTimelineProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Progress line */}
      <div className="absolute left-9 top-0 bottom-0 w-0.5 bg-gray-200"></div>
      
      {/* Milestones */}
      <div className="space-y-8">
        {milestones.map((milestone, index) => (
          <div key={milestone.id} className="relative flex items-start">
            {/* Status indicator */}
            <div className="relative z-10 flex items-center justify-center h-8 w-8 rounded-full border-2 border-white mr-4">
              {milestone.status === 'completed' ? (
                <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : milestone.status === 'in_progress' ? (
                <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-white"></div>
                </div>
              ) : (
                <div className="h-6 w-6 rounded-full bg-gray-300"></div>
              )}
            </div>
            
            {/* Content */}
            <div className={`flex-1 min-w-0 ${milestone.status === 'in_progress' ? 'bg-blue-50 p-4 rounded-lg' : 'p-1'}`}>
              <div className="text-sm font-medium text-gray-900">{milestone.name}</div>
              <p className="text-sm text-gray-500">{milestone.description}</p>
              {milestone.date && (
                <p className="mt-1 text-xs text-gray-400">{new Date(milestone.date).toLocaleDateString()}</p>
              )}
              {milestone.status === 'in_progress' && (
                <div className="mt-2 flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full w-1/2"></div>
                  </div>
                  <span className="ml-2 text-xs text-gray-500">In Progress</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
