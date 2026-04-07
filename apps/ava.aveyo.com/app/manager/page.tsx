"use client";

import { useEffect } from "react";
import { RepManagerShell } from "@/components/rep-manager-shell";
import { buildAuthLoginUrl } from "@/lib/auth/config";
import { useAuthSession } from "@/lib/auth/use-auth-session";

const MANAGER_DASHBOARD_ROLES = new Set([
  "support_agent",
  "support-agent",
  "support",
  "agent",
  "super_admin",
  "super-admin",
  "superadmin",
  "admin",
  "manager",
  "support_manager",
  "org_manager"
]);

function canAccessManagerDashboard(role: string | null | undefined) {
  const normalized = typeof role === "string" ? role.trim().toLowerCase() : "";
  return MANAGER_DASHBOARD_ROLES.has(normalized);
}

export default function ManagerPage() {
  const session = useAuthSession();
  const hasManagerAccess = canAccessManagerDashboard(session.role);

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

    const returnTo = `${window.location.origin}/manager`;
    window.location.replace(buildAuthLoginUrl(returnTo));
  }, [session.loading, session.authenticated]);

  if (session.loading || !session.authenticated) {
    return <main className="auth-redirect-loading">Checking session...</main>;
  }

  if (!hasManagerAccess) {
    return <main className="auth-redirect-loading">Account does not have manager dashboard access.</main>;
  }

  return <RepManagerShell />;
}
