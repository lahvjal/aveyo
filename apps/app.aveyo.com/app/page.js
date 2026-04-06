"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getEnvironmentLabel,
  resolveEnvironment
} from "@ava/config/runtime/app-urls";
import {
  PLATFORM_PRIMARY_NAV_ITEMS,
  PLATFORM_UTILITY_NAV_ITEMS,
  resolvePlatformNavHref
} from "@ava/config/runtime/platform-nav";
import { PlatformSideNav } from "@packages/ui/src/shell/platform-side-nav";
import { buildAuthLoginUrl } from "../lib/auth/config";
import { authApiRequest, logoutAuthSession } from "../lib/auth/session";
import { useAuthSession } from "../lib/auth/use-auth-session";

const platformOpsCommands = [
  "npm run supabase:migrations:check-source",
  "npm run supabase:migrate:ordered",
  "npm run supabase:seed-and-smoke:nonprod",
  "npm run supabase:env:check"
];

const announcementItems = [
  "Quarterly goals sync starts Monday at 10:00 AM.",
  "Unified side navigation rollout begins after dashboard sign-off.",
  "Production release window for shared auth updates is Friday."
];

const upcomingEventItems = [
  "Design review: Employee app shell - Tomorrow, 2:00 PM",
  "Operations standup - Wednesday, 9:30 AM",
  "Cross-team retro - Friday, 4:00 PM"
];

function readRuntimeContext() {
  if (typeof window === "undefined") {
    return {
      environment: "local",
      hostname: "localhost"
    };
  }

  return {
    environment: resolveEnvironment(window.location.hostname),
    hostname: window.location.hostname
  };
}

function getInitials(value) {
  if (!value || typeof value !== "string") {
    return "AV";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "AV";
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function toRoleLabel(role) {
  switch (role) {
    case "super_admin":
      return "Platform Admin";
    case "support_agent":
      return "Support Agent";
    case "customer":
      return "Customer";
    default:
      return "Director of UX";
  }
}

const appUtilityNavItems = PLATFORM_UTILITY_NAV_ITEMS.map((item) => ({
  id: item.id,
  label: item.label,
  icon: item.icon
}));

function renderAppSideNavLink({ key, href, className, title, ariaLabel, children }) {
  if (href.startsWith("/")) {
    return (
      <Link key={key} href={href} className={className} title={title} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <a key={key} href={href} className={className} title={title} aria-label={ariaLabel}>
      {children}
    </a>
  );
}

function AppPlatformSideNav({
  displayName,
  roleLabel,
  role,
  avatarUrl,
  initials,
  isSigningOut,
  onSignOut
}) {
  return (
    <PlatformSideNav
      pathname="/"
      storageKey="app-primary-nav-collapsed"
      iconPrefix="/"
      sameAppHrefByItemId={{
        dashboard: "/"
      }}
      wordmarkLogoSrc="/aveyo-logo.svg"
      wordmarkMiniLogoSrc="/aveyo-icon.svg"
      renderLink={renderAppSideNavLink}
      isPrimaryItemActive={(itemId) => itemId === "dashboard"}
      utilityItems={appUtilityNavItems}
      role={role}
      profile={{
        displayName,
        roleLabel,
        avatarUrl,
        initials,
        disabled: isSigningOut,
        onClick: onSignOut
      }}
    />
  );
}

export default function HomePage() {
  const router = useRouter();
  const session = useAuthSession();
  const [runtime, setRuntime] = useState(readRuntimeContext);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    setRuntime(readRuntimeContext());
  }, []);

  useEffect(() => {
    if (session.loading || session.authenticated || typeof window === "undefined") {
      return;
    }

    const returnTo = `${window.location.origin}/`;
    window.location.replace(buildAuthLoginUrl(returnTo));
  }, [session.loading, session.authenticated]);

  useEffect(() => {
    if (session.loading || !session.authenticated) {
      return;
    }

    if (session.role === "customer") {
      setOnboardingChecked(true);
      return;
    }

    let cancelled = false;
    async function ensureOnboarded() {
      try {
        const payload = await authApiRequest("/api/auth/onboarding", { method: "GET" });
        if (cancelled) {
          return;
        }
        if (!payload?.onboardingCompleted && typeof window !== "undefined") {
          const returnTo = encodeURIComponent(window.location.href);
          router.replace(`/onboarding?returnTo=${returnTo}`);
          return;
        }
      } catch (error) {
        console.error("Failed to validate onboarding status", error);
      } finally {
        if (!cancelled) {
          setOnboardingChecked(true);
        }
      }
    }

    void ensureOnboarded();
    return () => {
      cancelled = true;
    };
  }, [router, session.authenticated, session.loading, session.role]);

  const orgAppUrl = useMemo(() => {
    const orgNavItem = PLATFORM_PRIMARY_NAV_ITEMS.find((item) => item.id === "org");
    if (!orgNavItem) {
      return "";
    }
    return resolvePlatformNavHref(orgNavItem, runtime.environment);
  }, [runtime.environment]);

  const displayName = session.user?.name ?? session.user?.email ?? "Vel Fuimaono";
  const roleLabel = toRoleLabel(session.role);
  const initials = getInitials(displayName);

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    await logoutAuthSession();
    if (typeof window !== "undefined") {
      const returnTo = `${window.location.origin}/`;
      window.location.replace(buildAuthLoginUrl(returnTo, { logout: true }));
    }
  }

  if (session.loading || !session.authenticated || !onboardingChecked) {
    return <main className="loading-shell">Checking shared session...</main>;
  }

  return (
    <main className="app-shell">
      <AppPlatformSideNav
        displayName={displayName}
        roleLabel={roleLabel}
        role={session.role}
        avatarUrl={session.user?.avatarUrl ?? null}
        initials={initials}
        isSigningOut={isSigningOut}
        onSignOut={() => {
          void handleSignOut();
        }}
      />

      <section className="workspace">
        <header className="workspace-header">
          <div className="header-copy">
            <p>Good Afternoon</p>
            <h1>{displayName}</h1>
          </div>
          <div className="header-meta">
            <span>Change Maker</span>
            <button type="button" onClick={handleSignOut} disabled={isSigningOut}>
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </header>

        <section className="workspace-grid">
          <article className="workspace-card">
            <h2>Org Chart</h2>
            <div className="workspace-content">
              {orgAppUrl ? (
                <a href={orgAppUrl} className="inline-link">
                  Open org chart app
                </a>
              ) : (
                <p>Org chart app link will appear for this environment.</p>
              )}
              <p>Environment: {getEnvironmentLabel(runtime.environment)}</p>
              <p>Host: {runtime.hostname}</p>
            </div>
          </article>

          <article className="workspace-card">
            <h2>Operations</h2>
            <div className="workspace-content">
              <ul className="ops-list">
                {platformOpsCommands.map((command) => (
                  <li key={command}>
                    <code>{command}</code>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <div className="stack-column">
            <article className="workspace-card half">
              <h2 className="with-alert-dot">
                <span />
                Company Announcements
              </h2>
              <div className="workspace-content">
                <ul className="simple-list">
                  {announcementItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </article>

            <article className="workspace-card half">
              <h2>Upcoming Events</h2>
              <div className="workspace-content">
                <ul className="simple-list">
                  {upcomingEventItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}
