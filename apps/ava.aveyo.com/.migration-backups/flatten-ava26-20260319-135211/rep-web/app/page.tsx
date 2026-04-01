"use client";

import { useEffect } from "react";
import { RepDashboardShell } from "@/components/rep-dashboard-shell";
import { buildAuthLoginUrl } from "@/lib/auth/config";
import { useAuthSession } from "@/lib/auth/use-auth-session";

export default function HomePage() {
  const session = useAuthSession();
  const hasDashboardAccess =
    session.role === "support_agent" || session.role === "super_admin";

  useEffect(() => {
    if (session.loading || session.authenticated) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const returnTo = `${window.location.origin}/`;
    window.location.replace(buildAuthLoginUrl(returnTo));
  }, [session.loading, session.authenticated]);

  if (session.loading || !session.authenticated) {
    return <main className="auth-redirect-loading">Checking session...</main>;
  }

  if (!hasDashboardAccess) {
    return <main className="auth-redirect-loading">Account does not have dashboard access.</main>;
  }

  return <RepDashboardShell />;
}
