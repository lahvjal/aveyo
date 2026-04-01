// src/components/layout/AppShell.tsx
'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';
import TabNavigation from './TabNavigation';
import NotificationDropdown from '../ui/NotificationDropdown';
import '@/styles/brand-colors.css';
import { supabase } from '@/lib/supabase/client';
import { Notification } from '@/types';
import { useRouter } from 'next/navigation';
import { AveyoWordmark } from '@ava/ui';

interface AppShellProps {
  children: ReactNode;
  className?: string;
}

export default function AppShell({ children, className = '' }: AppShellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get the current user
        const { data } = await supabase.auth.getUser();
        
        if (data.user && data.user.email) {
          setUserEmail(data.user.email);
          
          // Try to get user profile to get the name if available
          const userProfile = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('id', data.user.id)
            .single();
            
          if (userProfile.data && userProfile.data.full_name) {
            setUserName(userProfile.data.full_name);
          }
          
          // Fetch notifications via API route
          const response = await fetch('/api/notifications');
          if (response.ok) {
            const notifs = await response.json();
            setNotifications(notifs);
          } else {
            console.error('Failed to fetch notifications');
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
  }, []);
  
  const handleMarkAsRead = async (id: string) => {
    try {
      // Call API route to mark notification as read
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      
      // Update local state
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleLogout = async () => {
    try {
      // First clear any local state
      setUserEmail(null);
      setUserName(null);
      setNotifications([]);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      // Force a hard navigation to the login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if there's an error, try to redirect to login
      window.location.href = '/login';
    }
  };

  // Close the user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  return (
    <div className={`min-h-screen ${className || 'page-background'}`}>
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16 items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="h-6 sm:h-8 flex items-center">
                <AveyoWordmark
                  className="customer-wordmark"
                  logoClassName="w-auto h-6 sm:h-8"
                  miniClassName="hidden"
                  miniLogoClassName="hidden"
                  logoSrc="/aveyo-logo.svg"
                />
              </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <NotificationDropdown 
                notifications={notifications} 
                onMarkAsRead={handleMarkAsRead} 
              />
              <div className="ml-1 sm:ml-3 relative" ref={userMenuRef}>
                <div>
                  <button
                    type="button"
                    className="max-w-xs bg-white rounded-full flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    id="user-menu-button"
                    aria-expanded={userMenuOpen ? 'true' : 'false'}
                    aria-haspopup="true"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                  >
                    <span className="sr-only">Open user menu</span>
                    {/* User icon SVG */}
                    <span className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                      <img 
                        src="/user-icon.svg" 
                        alt="User account" 
                        className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600"
                      />
                    </span>
                  </button>
                </div>
                
                {userMenuOpen && (
                  <div 
                    className="origin-top-right absolute right-0 mt-2 w-56 sm:w-64 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu-button"
                  >
                    <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-100">
                      {userName && (
                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{userName}</p>
                      )}
                      {userEmail && (
                        <p className="text-xs sm:text-sm text-gray-500 truncate">{userEmail}</p>
                      )}
                    </div>
                    <button
                      className="block w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                      onClick={handleLogout}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <TabNavigation />
      
      <main className="py-3 sm:py-4 md:py-6">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}