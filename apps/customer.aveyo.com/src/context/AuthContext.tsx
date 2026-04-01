'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  showWelcomeModal: boolean;
  dismissWelcomeModal: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  showWelcomeModal: false,
  dismissWelcomeModal: () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    // Get initial session - this only runs once on app load
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes - this handles login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Show welcome modal on new sign-in
        // Check sessionStorage to avoid showing on page refresh
        if (event === 'SIGNED_IN' && session?.user) {
          const hasShownModal = sessionStorage.getItem('aveyo_welcome_modal_shown');
          if (!hasShownModal) {
            setShowWelcomeModal(true);
            sessionStorage.setItem('aveyo_welcome_modal_shown', 'true');
          }
        }
        
        // Clear welcome modal flag on sign out
        if (event === 'SIGNED_OUT') {
          sessionStorage.removeItem('aveyo_welcome_modal_shown');
          setShowWelcomeModal(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const dismissWelcomeModal = () => {
    setShowWelcomeModal(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, showWelcomeModal, dismissWelcomeModal }}>
      {children}
    </AuthContext.Provider>
  );
}
