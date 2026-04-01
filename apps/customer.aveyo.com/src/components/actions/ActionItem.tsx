'use client';

import { useState } from 'react';
import { ActionItem as ActionItemType } from '@/types';
import Link from 'next/link';
import '@/styles/brand-colors.css';

interface ActionItemProps {
  item: ActionItemType;
  onComplete: (id: string) => void;
}

export default function ActionItem({ item, onComplete }: ActionItemProps) {
  const [loading, setLoading] = useState(false);
  console.log('Action Item data:', item)
  const handleComplete = async () => {
    setLoading(true);
    try {
      // Call API route to complete action item
      const response = await fetch('/api/action-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: item.id }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to complete action item');
      }
      
      const data = await response.json();
      if (data.success) {
        onComplete(item.id);
      }
    } catch (error) {
      console.error('Error completing action item:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (item.status) {
      case 'completed':
        return (
          <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-medium rounded-md bg-green-50 text-green-700 border border-green-200">
            Completed
          </span>
        );
      case 'overdue':
        return (
          <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 border border-red-200">
            Overdue
          </span>
        );
      default:
        return (
          <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            Pending
          </span>
        );
    }
  };

  const getPriorityBadge = () => {
    switch (item.priority) {
      case 'high':
        return (
          <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 border border-red-200">
            <span className="md:hidden">High</span>
            <span className="hidden md:inline">High Priority</span>
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-medium rounded-md bg-yellow-50 text-yellow-700 border border-yellow-200">
            <span className="md:hidden">Medium</span>
            <span className="hidden md:inline">Medium Priority</span>
          </span>
        );
      default:
        return (
          <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-medium rounded-md bg-gray-50 text-gray-700 border border-gray-200">
            <span className="md:hidden">Low</span>
            <span className="hidden md:inline">Low Priority</span>
          </span>
        );
    }
  };

  const getActionButton = () => {
    if (item.status === 'completed') {
      return (
        <span className="text-sm text-green-600 font-medium">Completed</span>
      );
    }

    const buttonClass = "inline-flex items-center justify-center w-full md:w-auto px-4 sm:px-5 py-1.5 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white brand-button shadow-sm whitespace-nowrap";
    const approveButtonClass = "inline-flex items-center justify-center w-full md:w-auto px-4 sm:px-5 py-1.5 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white brand-button shadow-sm whitespace-nowrap";
    const disabledButtonClass = "inline-flex items-center justify-center w-full md:w-auto px-4 sm:px-5 py-1.5 sm:py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-md text-gray-500 bg-gray-100 cursor-not-allowed shadow-sm whitespace-nowrap";
    
    // If form-url is provided and not empty, use it
    if (item['form-url'] && item['form-url'].trim() !== '') {
      const buttonText = getButtonTextByType(item.type);
      
      // Ensure URL has proper protocol prefix
      let url = item['form-url'];
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      return (
        <a
          href={url}
          className={item.type === 'approval' || item.type === 'sow_approval' ? approveButtonClass : buttonClass}
          target="_blank"
          rel="noopener noreferrer"
        >
          {buttonText}
        </a>
      );
    }
    
    // If no form URL is available, show a disabled button
    const buttonText = getButtonTextByType(item.type);
    return (
      <span 
        className={disabledButtonClass}
        title="Form link not available"
      >
        {buttonText}
      </span>
    );
  };
  
  // Helper function to get button text based on action type
  const getButtonTextByType = (type: string): string => {
    switch (type) {
      case 'welcome_form': return 'Complete Form';
      case 'sow_approval': return 'Approve';
      case 'document_upload': return 'Upload';
      case 'payment': return 'Pay Now';
      case 'approval': return 'Approve';
      default: return 'Complete';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format date as MM/DD/YYYY
  const formatSimpleDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden mb-3 sm:mb-4">
      <div className="p-3 sm:p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-3 md:gap-6">
          {/* Left side - Title and Project */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-0.5 sm:mb-1 truncate">
              {item.title}
            </h3>
            {/* Project address - visible on mobile */}
            <div className="text-xs sm:text-sm text-gray-600 md:hidden truncate mb-1.5 sm:mb-2">
              {item.project_address || 'Address not available'}
            </div>
          </div>
          
          {/* Middle - Address - hidden on mobile */}
          <div className="hidden md:block text-sm text-gray-600 flex-1 min-w-0 truncate">
            {item.project_address || 'Address not available'}
          </div>
          
          {/* Due date */}
          <div className="text-xs sm:text-sm text-left md:text-right whitespace-nowrap mb-1.5 sm:mb-2 md:mb-0">
            <span className="text-gray-500">Due: </span>
            <span className="text-gray-700 font-medium">{formatSimpleDate(item.due_date)}</span>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap md:flex-nowrap mb-2 sm:mb-3 md:mb-0">
            {getStatusBadge()}
            {getPriorityBadge()}
          </div>
          
          {/* Action button */}
          <div className="w-full md:w-auto md:ml-2">
            {getActionButton()}
          </div>
        </div>
      </div>
    </div>
  );
}
