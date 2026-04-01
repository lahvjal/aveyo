"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSideRail } from "@/components/app-side-rail";
import { WidgetShell } from "@/components/widget-shell";
import { buildAuthLoginUrl } from "@/lib/auth/config";
import { logoutAuthSession } from "@/lib/auth/session";
import { useAuthSession } from "@/lib/auth/use-auth-session";

export default function AvaWidgetPage() {
  const router = useRouter();
  const session = useAuthSession();
  const [signOutPending, setSignOutPending] = useState(false);

  const hasDashboardAccess =
    session.role === "support_agent" || session.role === "super_admin";

  useEffect(() => {
    if (session.loading) {
      return;
    }

    if (!session.authenticated) {
      if (typeof window !== "undefined") {
        const returnTo = `${window.location.origin}/`;
        window.location.replace(buildAuthLoginUrl(returnTo));
      }
      return;
    }

    if (!hasDashboardAccess) {
      router.replace("/");
    }
  }, [router, session.loading, session.authenticated, hasDashboardAccess]);

  const signOutAgent = async () => {
    if (signOutPending) {
      return;
    }

    setSignOutPending(true);
    try {
      if (typeof window !== "undefined") {
        await logoutAuthSession();
        const returnTo = `${window.location.origin}/`;
        window.location.replace(buildAuthLoginUrl(returnTo, { logout: true }));
        return;
      }
      router.replace("/");
    } finally {
      setSignOutPending(false);
    }
  };

  if (session.loading || !session.authenticated || !hasDashboardAccess) {
    return <main className="auth-redirect-loading">Checking session...</main>;
  }

  return (
    <div className="rep-shell widget-route-layout">
      <AppSideRail
        activeRoute="widget"
        userName={session.user?.name}
        userAvatarUrl={session.user?.avatarUrl ?? null}
        signOutPending={signOutPending}
        onSignOut={() => {
          void signOutAgent();
        }}
      />

      <section className="widget-route-root">
        <WidgetShell />
      </section>
    </div>
  );
}
