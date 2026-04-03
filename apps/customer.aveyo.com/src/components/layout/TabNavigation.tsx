// src/components/layout/TabNavigation.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProjects } from '@/context/ProjectsContext';
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

interface TabProps {
  href?: string;
  label: string;
  active: boolean;
  badge?: number;
  onClick?: () => void;
  isButton?: boolean;
}

const Tab = ({ href, label, active, badge, onClick, isButton }: TabProps) => {
  const baseClasses = `px-2 sm:px-4 md:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 flex items-center transition-all ${
    active
      ? 'text-blue-600 border-blue-600 font-semibold'
      : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
  }`;

  if (isButton && onClick) {
    return (
      <button
        onClick={onClick}
        className={baseClasses}
      >
        {label}
        {badge !== undefined && badge > 0 && (
          <span className="ml-1 sm:ml-2 inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 min-w-[18px] sm:min-w-[20px] text-xs font-bold leading-none text-white bg-red-500 rounded-full">
            {badge}
          </span>
        )}
      </button>
    );
  }

  return (
    <Link
      href={href!}
      className={baseClasses}
      onClick={() => {
        // Track tab navigation
        analytics.tabNavigation(label.toLowerCase());
      }}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1 sm:ml-2 inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 min-w-[18px] sm:min-w-[20px] text-xs font-bold leading-none text-white bg-red-500 rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
};

export default function TabNavigation() {
  const pathname = usePathname();
  const { actionItems } = useProjects();
  const pendingActionsCount = actionItems.filter(
    (item) => item.status === 'pending' || item.status === 'overdue'
  ).length;

  // Function to open Ava chat
  const openAvaChat = () => {
    console.log('=== SUPPORT TAB CLICKED ===');
    console.log('Window exists:', typeof window !== 'undefined');
    console.log('AvaAuth exists:', !!(typeof window !== 'undefined' && window.AvaAuth));
    
    // Track support tab navigation and Ava chat opened
    analytics.tabNavigation('support');
    analytics.avaChatOpened('support_tab');
    
    if (typeof window !== 'undefined' && window.AvaAuth) {
      console.log('Available AvaAuth methods:', Object.keys(window.AvaAuth));
      console.log('Current session:', window.AvaAuth.getSession());
      console.log('Opening Ava chat from support tab');
      
      try {
        window.AvaAuth.open();
        console.log('AvaAuth.open() called successfully from support tab');
      } catch (error) {
        console.error('Error calling AvaAuth.open() from support tab:', error);
      }
    } else {
      console.log('Ava chatbot not available from support tab - script may not be loaded yet');
      
      // Try to find the Ava button manually
      const avaButton = document.querySelector('[data-ava-widget], .ava-widget, iframe[src*="ava"]');
      console.log('Manual Ava button search from support tab:', avaButton);
    }
  };

  const tabs: Array<{
    href?: string;
    label: string;
    badge?: number;
    isButton?: boolean;
    onClick?: () => void;
  }> = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/actions', label: 'Actions', badge: pendingActionsCount },
    { href: '/expectations', label: 'Expectations' },
    { label: 'Support', isButton: true, onClick: openAvaChat },
  ];

  return (
    <div className="border-b border-gray-200 bg-white shadow-sm overflow-x-auto">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-2" aria-label="Tabs">
          {tabs.map((tab, index) => (
            <Tab
              key={tab.href || `tab-${index}`}
              href={tab.href}
              label={tab.label}
              active={tab.href ? pathname.startsWith(tab.href) : false}
              badge={tab.badge}
              onClick={tab.onClick}
              isButton={tab.isButton}
            />
          ))}
        </nav>
      </div>
    </div>
  );
}