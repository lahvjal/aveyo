"use client";

import { useState, useEffect, createContext, useContext, type ReactNode } from "react";
import { Loader2, ShieldX } from "lucide-react";
import { getLocalAppUrl, trimTrailingSlash } from "@ava/config/runtime/app-urls";
import { buildAuthLoginUrl, getPlatformAppUrl } from "@/lib/auth/config";
import { authApiRequest, type PlatformSessionUser } from "@/lib/auth/session";
import { useAuthSession } from "@/lib/auth/use-auth-session";

const ORG_CHART_URL = (() => {
  const configured = process.env.NEXT_PUBLIC_ORG_CHART_URL?.trim();
  return configured ? trimTrailingSlash(configured) : getLocalAppUrl("org");
})();

export interface UserProfile {
  full_name: string | null;
  job_title: string | null;
  profile_photo_url: string | null;
  is_executive: boolean | null;
  is_super_admin: boolean | null;
  onboarding_completed: boolean | null;
}

interface AuthContextType {
  user: PlatformSessionUser | null;
  profile: UserProfile | null;
  loading: boolean;
  role: string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  role: "unknown"
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const session = useAuthSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (window.location.pathname === "/login") {
      setProfileLoading(false);
      return;
    }
    if (!session.loading && !session.authenticated) {
      const returnTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
      window.location.replace(buildAuthLoginUrl(returnTo));
    }
  }, [session.loading, session.authenticated]);

  useEffect(() => {
    if (session.loading) {
      return;
    }
    if (!session.authenticated) {
      setProfile(null);
      setProfileLoading(false);
      setIsAuthorized(false);
      return;
    }

    let cancelled = false;
    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        const result = await authApiRequest<{
          authorized: boolean;
          profile: UserProfile;
        }>("/api/auth/profile");
        if (cancelled) {
          return;
        }
        setProfile(result.profile);
        setIsAuthorized(result.authorized);
      } catch (err) {
        if (cancelled) {
          return;
        }
        console.error("Auth check failed:", err);
        setProfile(null);
        setIsAuthorized(false);
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [session.loading, session.authenticated]);

  const onboardingRequired = Boolean(session.authenticated && profile && !profile.onboarding_completed);

  useEffect(() => {
    if (!onboardingRequired || typeof window === "undefined") {
      return;
    }

    const onboardingUrl = new URL("/onboarding", getPlatformAppUrl());
    onboardingUrl.searchParams.set(
      "returnTo",
      `${window.location.origin}${window.location.pathname}${window.location.search}`
    );
    window.location.replace(onboardingUrl.toString());
  }, [onboardingRequired]);

  const loading = session.loading || profileLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (typeof window !== "undefined" && window.location.pathname === "/login") {
    return (
      <AuthContext.Provider
        value={{
          user: session.user,
          profile,
          loading: false,
          role: session.role
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  if (!session.authenticated) {
    return (
      <AuthContext.Provider
        value={{
          user: null,
          profile: null,
          loading: false,
          role: "unknown"
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  if (onboardingRequired) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 w-full max-w-md text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <ShieldX className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h1>
          <p className="text-sm text-slate-600 mb-6">
            The KPI Dashboard is only for Aveyo Executives.
          </p>
          <a
            href={ORG_CHART_URL}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors"
          >
            ← Back to Org Chart
          </a>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user: session.user,
        profile,
        loading: false,
        role: session.role
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
