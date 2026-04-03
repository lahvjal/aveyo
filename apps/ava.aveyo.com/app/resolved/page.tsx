"use client";

import { useEffect } from "react";
import { RepResolvedShell } from "@/components/rep-resolved-shell";
import { buildAuthLoginUrl } from "@/lib/auth/config";
import { useAuthSession } from "@/lib/auth/use-auth-session";

export default function ResolvedPage() {
  const session = useAuthSession();
  const hasDashboardAccess =
    session.role === "support_agent" || session.role === "super_admin";

  useEffect(() => {
    if (session.loading) {
      return;
    }

    if (session.authenticated) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const returnTo = `${window.location.origin}/resolved`;
    window.location.replace(buildAuthLoginUrl(returnTo));
  }, [session.loading, session.authenticated]);

  if (session.loading || !session.authenticated) {
    return <main className="auth-redirect-loading">Checking session...</main>;
  }

  if (!hasDashboardAccess) {
    return <main className="auth-redirect-loading">Account does not have dashboard access.</main>;
  }

  return <RepResolvedShell />;
}
