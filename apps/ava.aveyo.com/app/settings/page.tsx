"use client";

import { useEffect } from "react";
import { RepSettingsShell } from "@/components/rep-settings-shell";
import { buildAuthLoginUrl } from "@/lib/auth/config";
import { canAccessAvaManagerViews } from "@/lib/auth/access";
import { useAuthSession } from "@/lib/auth/use-auth-session";

export default function SettingsPage() {
  const session = useAuthSession();
  const hasManagerAccess = canAccessAvaManagerViews(session.role);

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

    const returnTo = `${window.location.origin}/settings`;
    window.location.replace(buildAuthLoginUrl(returnTo));
  }, [session.loading, session.authenticated]);

  if (session.loading || !session.authenticated) {
    return <main className="auth-redirect-loading">Checking session...</main>;
  }

  if (!hasManagerAccess) {
    return <main className="auth-redirect-loading">Account does not have settings access.</main>;
  }

  return <RepSettingsShell />;
}
