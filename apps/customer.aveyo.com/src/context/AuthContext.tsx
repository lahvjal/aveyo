'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  canAccessCustomerPortalAsAdmin,
  isCustomerPortalCustomerSession
} from '@/lib/platform-auth/customer-portal-access';
import {
  fetchPlatformAuthSession,
  logoutPlatformAuthSession,
  type PlatformSessionRole,
  type PlatformSessionUser,
  type PlatformSessionUserType
} from '@/lib/platform-auth/session';
import { analytics } from '@/lib/analytics';

const SESSION_REFRESH_INTERVAL_MS = 30000;

export interface CustomerPortalViewState {
  canImpersonate: boolean;
  impersonationActive: boolean;
  effectiveCustomerEmail: string | null;
  viewerEmail: string | null;
}

export interface AuthenticatedCustomerUser {
  id: string;
  email: string | null;
  user_metadata: {
    full_name?: string | null;
    avatar_url?: string | null;
    role?: PlatformSessionRole;
    user_type?: PlatformSessionUserType;
    account_type?: 'customer' | 'employee' | 'unknown';
  };
}

interface AuthContextType {
  user: AuthenticatedCustomerUser | null;
  loading: boolean;
  role: PlatformSessionRole;
  userType: PlatformSessionUserType;
  customerPortalView: CustomerPortalViewState | null;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  showWelcomeModal: boolean;
  dismissWelcomeModal: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: 'unknown',
  userType: 'unknown',
  customerPortalView: null,
  signOut: async () => {},
  refreshSession: async () => {},
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
  const [user, setUser] = useState<AuthenticatedCustomerUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<PlatformSessionRole>('unknown');
  const [userType, setUserType] = useState<PlatformSessionUserType>('unknown');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [customerPortalView, setCustomerPortalView] = useState<CustomerPortalViewState | null>(null);
  const previousAuthenticatedRef = useRef(false);

  const consumeWelcomeVideo = useCallback(async () => {
    try {
      const response = await fetch('/api/customer-portal/welcome-video', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store'
      });
      const payload = (await response.json().catch(() => null)) as { showWelcomeVideo?: boolean } | null;

      setShowWelcomeModal(Boolean(response.ok && payload?.showWelcomeVideo));
    } catch (error) {
      console.error('Error resolving welcome video state:', error);
      setShowWelcomeModal(false);
    }
  }, []);

  const syncSession = useCallback(async () => {
    try {
      const result = await fetchPlatformAuthSession();
      const payload = result.payload;
      const nextRole = payload?.role ?? 'unknown';
      const nextUserType = payload?.userType ?? 'unknown';
      const nextUser =
        result.ok && payload?.authenticated && payload.user
          ? toAuthenticatedCustomerUser(payload.user, nextRole, nextUserType)
          : null;
      let nextCustomerPortalView: CustomerPortalViewState | null = null;

      setUser(nextUser);
      setRole(nextRole);
      setUserType(nextUserType);

      if (result.ok && payload?.authenticated) {
        const viewerEmail = payload.user?.email ?? null;

        if (isCustomerPortalCustomerSession(payload)) {
          nextCustomerPortalView = {
            canImpersonate: false,
            impersonationActive: false,
            effectiveCustomerEmail: viewerEmail?.trim() ?? null,
            viewerEmail
          };
        } else if (canAccessCustomerPortalAsAdmin(payload)) {
          try {
            const impersonationResponse = await fetch('/api/customer-portal/impersonation', {
              method: 'GET',
              credentials: 'include',
              cache: 'no-store'
            });
            const impersonationPayload = (await impersonationResponse.json().catch(() => null)) as
              | (Partial<CustomerPortalViewState> & { error?: string })
              | null;

            if (
              impersonationResponse.ok &&
              impersonationPayload &&
              typeof impersonationPayload.impersonationActive === 'boolean'
            ) {
              nextCustomerPortalView = {
                canImpersonate: true,
                impersonationActive: Boolean(impersonationPayload.impersonationActive),
                effectiveCustomerEmail: impersonationPayload.effectiveCustomerEmail ?? null,
                viewerEmail: impersonationPayload.viewerEmail ?? viewerEmail
              };
            } else {
              nextCustomerPortalView = {
                canImpersonate: true,
                impersonationActive: false,
                effectiveCustomerEmail: null,
                viewerEmail
              };
            }
          } catch {
            nextCustomerPortalView = {
              canImpersonate: true,
              impersonationActive: false,
              effectiveCustomerEmail: null,
              viewerEmail
            };
          }
        }
      }
      setCustomerPortalView(nextCustomerPortalView);

      const isAuthenticated = Boolean(nextUser);
      const wasAuthenticated = previousAuthenticatedRef.current;
      previousAuthenticatedRef.current = isAuthenticated;

      if (nextUserType === 'employee') {
        setShowWelcomeModal(false);
      }

      if (isAuthenticated && !wasAuthenticated) {
        analytics.userLogin(nextUser?.email, {
          role: nextRole,
          userType: nextUserType,
          impersonationActive: Boolean(nextCustomerPortalView?.impersonationActive),
          impersonatedCustomer: nextCustomerPortalView?.effectiveCustomerEmail
        });

        if (nextUserType === 'customer') {
          await consumeWelcomeVideo();
        } else {
          setShowWelcomeModal(false);
        }
      }

      if (!isAuthenticated && wasAuthenticated) {
        setShowWelcomeModal(false);
      }
    } catch (error) {
      console.error('Error getting platform auth session:', error);
      setUser(null);
      setRole('unknown');
      setUserType('unknown');
      setCustomerPortalView(null);
      setShowWelcomeModal(false);
      previousAuthenticatedRef.current = false;
    } finally {
      setLoading(false);
    }
  }, [consumeWelcomeVideo]);

  useEffect(() => {
    let cancelled = false;

    const runSync = async () => {
      if (cancelled) {
        return;
      }
      await syncSession();
    };

    void runSync();

    const refreshInterval = window.setInterval(() => {
      void runSync();
    }, SESSION_REFRESH_INTERVAL_MS);

    const handleFocus = () => {
      void runSync();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [syncSession]);

  const signOut = async () => {
    try {
      analytics.userLogout(user?.email, {
        role,
        userType,
        impersonationActive: Boolean(customerPortalView?.impersonationActive),
        impersonatedCustomer: customerPortalView?.effectiveCustomerEmail
      });

      await fetch('/api/customer-portal/impersonation', {
        method: 'DELETE',
        credentials: 'include'
      }).catch(() => null);
      await logoutPlatformAuthSession();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setUser(null);
      setRole('unknown');
      setUserType('unknown');
      setCustomerPortalView(null);
      previousAuthenticatedRef.current = false;
      setShowWelcomeModal(false);
    }
  };

  const dismissWelcomeModal = () => {
    setShowWelcomeModal(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        role,
        userType,
        customerPortalView,
        signOut,
        refreshSession: syncSession,
        showWelcomeModal,
        dismissWelcomeModal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function toAuthenticatedCustomerUser(
  user: PlatformSessionUser,
  role: PlatformSessionRole,
  userType: PlatformSessionUserType
): AuthenticatedCustomerUser {
  return {
    id: user.id,
    email: user.email,
    user_metadata: {
      full_name: user.name,
      avatar_url: user.avatarUrl,
      role,
      user_type: userType,
      account_type: userType
    }
  };
}
