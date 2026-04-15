"use client";

import { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { HandoffWorkspaceShell } from "@/components/dashboard/handoff-workspace-shell";
import { canAccessAvaDashboard } from "@/lib/auth/access";
import { buildAuthLoginUrl } from "@/lib/auth/config";
import { useAuthSession } from "@/lib/auth/use-auth-session";

function getRequestId(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export default function HandoffWorkspacePage() {
  const params = useParams<{ requestId: string | string[] }>();
  const searchParams = useSearchParams();
  const session = useAuthSession();
  const requestId = getRequestId(params.requestId);
  const conversationId = searchParams.get("conversationId");
  const hasDashboardAccess = canAccessAvaDashboard(session.role, session.access);

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

    const returnTo = window.location.href;
    window.location.replace(buildAuthLoginUrl(returnTo));
  }, [session.authenticated, session.loading]);

  if (session.loading || !session.authenticated) {
    return <main className="auth-redirect-loading">Checking session...</main>;
  }

  if (!hasDashboardAccess) {
    return <main className="auth-redirect-loading">Account does not have dashboard access.</main>;
  }

  if (!requestId) {
    return <main className="auth-redirect-loading">Invalid handoff request.</main>;
  }

  return (
    <HandoffWorkspaceShell requestId={requestId} initialConversationId={conversationId} />
  );
}
