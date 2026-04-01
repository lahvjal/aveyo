'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ActionItem as ActionItemType } from '@/types';
import ActionItem from '@/components/actions/ActionItem';
import AppShell from '@/components/layout/AppShell';
import { useProjects } from '@/context/ProjectsContext';

export default function ActionsPage() {
  const { actionItems, loading, error } = useProjects();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  // Log the action items data when it changes
  useEffect(() => {
    console.log('Action Items Data:', actionItems);
  }, [actionItems]);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };

    getUser();
  }, [router, supabase]);
  
  // Log detailed information about each action item
  useEffect(() => {
    if (actionItems.length > 0) {
      console.log('Action Items Details:');
      actionItems.forEach((item, index) => {
        console.log(`Action Item ${index + 1}:`, {
          id: item.id,
          title: item.title,
          status: item.status,
          project_id: item.project_id,
          project_name: item.project_name,
          project_address: item.project_address,
          due_date: item.due_date,
          type: item.type,
          priority: item.priority
        });
      });
    }
  }, [actionItems]);

  // Since we're using the context, we can't directly modify the action items
  // In a real implementation, this would call an API to update the action status
  const handleCompleteAction = (id: string) => {
    console.log(`Action ${id} marked as completed`);
    // Would normally call an API endpoint to update the action status
    // and then refresh the projects data
  };

  const filteredItems = actionItems.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const getStatusCounts = () => {
    const counts = {
      pending: actionItems.filter(item => item.status === 'pending').length,
      completed: actionItems.filter(item => item.status === 'completed').length,
      overdue: actionItems.filter(item => item.status === 'overdue').length,
    };
    return counts;
  };

  const statusCounts = getStatusCounts();

  const tabs = [
    { name: 'All', href: '#', count: actionItems.length, current: filter === 'all' },
    { name: 'Pending', href: '#', count: statusCounts.pending, current: filter === 'pending' },
    { name: 'Overdue', href: '#', count: statusCounts.overdue, current: filter === 'overdue' },
    { name: 'Completed', href: '#', count: statusCounts.completed, current: filter === 'completed' },
  ];

  return (
    <AppShell>
      <div className="py-3 sm:py-4 md:py-6 px-2 sm:px-3 md:px-4 max-w-7xl mx-auto">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-0.5 sm:mb-1">ACTIONS</h1>
        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 md:mb-6">Tasks that require your attention.</p>
      
        {/* Filter tabs */}
        <div className="mb-3 sm:mb-4 md:mb-6">
          <div className="flex overflow-x-auto border-b border-gray-200 -mx-2 px-2">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                onClick={() => setFilter(tab.name.toLowerCase() as any)}
                className={`py-1.5 sm:py-2 md:py-3 px-2 sm:px-3 md:px-6 text-center whitespace-nowrap ${tab.current ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <div className="flex items-center">
                  <span className="text-xs sm:text-sm">{tab.name}</span>
                  <span className={`ml-1 sm:ml-2 px-1 sm:px-1.5 md:px-2 py-0.5 text-xs font-medium rounded-md ${tab.current ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {tab.count}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Action items list */}
        <div>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
              {error}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-lg">
              <div className="px-6 py-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No {filter !== "all" ? filter : ""} action items</h3>
                <p className="mt-1 text-sm text-gray-500">{filter !== "all" ? `You don't have any ${filter} action items at the moment.` : "You don't have any action items at the moment."}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map(item => (
                <ActionItem 
                  key={item.id} 
                  item={item} 
                  onComplete={handleCompleteAction} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
