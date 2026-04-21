'use client';

import { useState, useEffect } from 'react';
import ActionItem from '@/components/actions/ActionItem';
import { useProjects } from '@/context/ProjectsContext';

export default function ActionsPage() {
  const { actionItems, loading, error } = useProjects();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  
  // Log the action items data when it changes
  useEffect(() => {
    console.log('Action Items Data:', actionItems);
  }, [actionItems]);
  
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
    <div className="px-1 sm:px-2">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--customer-color-text-primary)]">Actions</h2>
        <p className="mt-2 text-sm text-[var(--customer-color-text-subtle)]">
          Tasks that require your attention.
        </p>
      </div>

      <div className="customer-panel overflow-hidden">
        <div className="border-b border-[var(--customer-color-border-muted)] px-4 py-2 sm:px-6">
          <div className="flex overflow-x-auto gap-2 py-2">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                onClick={() => setFilter(tab.name.toLowerCase() as any)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                  tab.current
                    ? 'border-black bg-black text-white'
                    : 'border-[var(--customer-color-border)] bg-white text-[var(--customer-color-text-subtle)]'
                }`}
              >
                <span>{tab.name}</span>
                <span
                  className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs ${
                    tab.current ? 'bg-white/15 text-white' : 'bg-[var(--customer-color-border-muted)] text-[var(--customer-color-text-primary)]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--customer-color-action)]"></div>
            </div>
          ) : error ? (
            <div className="rounded-[var(--customer-radius-card)] border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-[var(--customer-radius-card)] border border-[var(--customer-color-border-muted)] bg-white px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-[var(--customer-color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-[var(--customer-color-text-primary)]">
                No {filter !== "all" ? filter : ""} action items
              </h3>
              <p className="mt-1 text-sm text-[var(--customer-color-text-subtle)]">
                {filter !== "all"
                  ? `You don't have any ${filter} action items at the moment.`
                  : "You don't have any action items at the moment."}
              </p>
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
    </div>
  );
}
