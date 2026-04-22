"use client";

import designSystem from "../../aveyo.com/design-system.json";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  resolveAppUrl,
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
import { summarizeDashboardAccess } from "../lib/dashboard-modules";

const hardcodedDashboardVideoUrl =
  "https://vz-bd3d2939-ded.b-cdn.net/340a5949-b949-4328-a27d-d1698a64b0ae/play_1080p.mp4";

const dashboardPageStyleVars = {
  "--dashboard-card-radius": `${designSystem.tokens.radius.card}px`,
  "--dashboard-button-radius": `${designSystem.tokens.radius.button}px`
};

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

function trimTrailingSlash(value) {
  return typeof value === "string" ? value.replace(/\/$/, "") : "";
}

function toRoleLabel(role, flags = {}) {
  if (flags.isSuperAdmin) {
    return "Super Admin";
  }
  if (flags.isExecutive) {
    return "Executive";
  }
  if (flags.isAdmin) {
    return "Admin";
  }
  if (flags.isManager) {
    return "Manager";
  }

  switch (role) {
    case "super_admin":
      return "Platform Admin";
    case "support_agent":
      return "Support Agent";
    default:
      return "Employee";
  }
}

function LogoutGlyph() {
  return (
    <svg
      aria-hidden="true"
      width="11"
      height="10"
      viewBox="0 0 10.1995 9.62891"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.38086 1H2.5C1.67175 1.00021 1 1.6717 1 2.5V7.12891C1.0002 7.95704 1.67187 8.6287 2.5 8.62891H6.38086V9.62891H2.5C1.11959 9.6287 0.000197847 8.50932 0 7.12891V2.5C1.28841e-07 1.11942 1.11946 0.000206168 2.5 0H6.38086V1ZM6.69238 1.74121C6.86194 1.57199 7.13702 1.57209 7.30664 1.74121L10.0723 4.50684C10.2419 4.67652 10.2419 4.95239 10.0723 5.12207L7.30664 7.88672C7.13695 8.05626 6.86203 8.05633 6.69238 7.88672C6.52279 7.71707 6.52284 7.44214 6.69238 7.27246L8.71582 5.24902H3.11621C2.87647 5.24881 2.68172 5.05422 2.68164 4.81445C2.68164 4.57461 2.87642 4.3801 3.11621 4.37988H8.71582L6.69238 2.35645C6.5227 2.18676 6.5227 1.9109 6.69238 1.74121Z"
        fill="currentColor"
      />
    </svg>
  );
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
  userType,
  canAccessManagerPanel,
  canAccessAdminPanel,
  canAccessKpiDashboard,
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
      userType={userType}
      canAccessManagerPanel={canAccessManagerPanel}
      canAccessAdminPanel={canAccessAdminPanel}
      canAccessKpiDashboard={canAccessKpiDashboard}
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
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isVideoCursorVisible, setIsVideoCursorVisible] = useState(false);
  const [videoCursorPosition, setVideoCursorPosition] = useState({ x: 0, y: 0 });
  const dashboardVideoRef = useRef(null);

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

    if (session.userType === "customer" || session.role === "customer") {
      const customerAppUrl = resolveAppUrl("customer", runtime.environment);
      if (typeof window !== "undefined" && customerAppUrl) {
        window.location.replace(customerAppUrl);
        return;
      }
      if (typeof window !== "undefined") {
        const returnTo = `${window.location.origin}/`;
        window.location.replace(buildAuthLoginUrl(returnTo, { logout: true }));
      }
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
  }, [router, runtime.environment, session.authenticated, session.loading, session.role, session.userType]);

  const orgAppUrl = useMemo(() => {
    const orgNavItem = PLATFORM_PRIMARY_NAV_ITEMS.find((item) => item.id === "org");
    if (!orgNavItem) {
      return "";
    }
    return resolvePlatformNavHref(orgNavItem, runtime.environment);
  }, [runtime.environment]);
  const orgBaseUrl = useMemo(() => trimTrailingSlash(orgAppUrl), [orgAppUrl]);
  const paychexUrl = useMemo(() => {
    const paychexNavItem = PLATFORM_PRIMARY_NAV_ITEMS.find((item) => item.id === "paychex");
    if (!paychexNavItem) {
      return "";
    }
    return resolvePlatformNavHref(paychexNavItem, runtime.environment);
  }, [runtime.environment]);
  const orgProfileUrl = useMemo(
    () => (orgBaseUrl ? `${orgBaseUrl}/profile` : ""),
    [orgBaseUrl]
  );
  const dashboardVideoUrl = hardcodedDashboardVideoUrl;
  const accessSummary = useMemo(() => summarizeDashboardAccess(session.access), [session.access]);
  const canAccessManagerPanel = Boolean(
    accessSummary.flags.isManager ||
      accessSummary.flags.isAdmin ||
      accessSummary.flags.isExecutive ||
      accessSummary.flags.isSuperAdmin
  );
  const canAccessAdminPanel = Boolean(
    accessSummary.flags.isAdmin || accessSummary.flags.isSuperAdmin
  );
  const canAccessKpiDashboard = Boolean(
    accessSummary.flags.isExecutive ||
      accessSummary.flags.isAdmin ||
      accessSummary.flags.isSuperAdmin
  );

  const displayName = session.user?.name ?? session.user?.email ?? "Vel Fuimaono";
  const roleLabel = toRoleLabel(session.role, accessSummary.flags);
  const departmentLabel = accessSummary.departmentLabel;
  const initials = getInitials(displayName);
  const quickLinks = useMemo(
    () => [
      {
        id: "org",
        title: "Org app",
        description: "Open the org chart workspace and team structure tools.",
        href: orgAppUrl,
        newTab: false
      },
      {
        id: "profile",
        title: "Profile page",
        description: "Review and update your employee profile details.",
        href: orgProfileUrl,
        newTab: false
      },
      {
        id: "paychex",
        title: "Paychex",
        description: "Open payroll and benefits in a new browser tab.",
        href: paychexUrl,
        newTab: true
      }
    ],
    [orgAppUrl, orgProfileUrl, paychexUrl]
  );

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

  function handleDashboardVideoPointerMove(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    setVideoCursorPosition({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top
    });
  }

  function handleDashboardVideoToggle() {
    setIsVideoMuted((current) => {
      const nextMuted = !current;
      const video = dashboardVideoRef.current;
      if (video) {
        video.muted = nextMuted;
        void video.play().catch(() => null);
      }
      return nextMuted;
    });
  }

  if (session.loading || !session.authenticated || !onboardingChecked) {
    return <main className="loading-shell">Checking shared session...</main>;
  }

  return (
    <main className="app-shell dashboard-home" style={dashboardPageStyleVars}>
      <AppPlatformSideNav
        displayName={displayName}
        roleLabel={roleLabel}
        role={session.role}
        userType={session.userType}
        canAccessManagerPanel={canAccessManagerPanel}
        canAccessAdminPanel={canAccessAdminPanel}
        canAccessKpiDashboard={canAccessKpiDashboard}
        avatarUrl={session.user?.avatarUrl ?? null}
        initials={initials}
        isSigningOut={isSigningOut}
        onSignOut={() => {
          void handleSignOut();
        }}
      />

      <section className="workspace">
        <header className="workspace-header">
          <div className="workspace-header-primary">
            <p className="workspace-header-greeting">Good Afternoon</p>
            <div className="workspace-header-identity">
              <h1 className="workspace-header-name">{displayName}</h1>
              {departmentLabel ? (
                <span className="workspace-header-department">{departmentLabel}</span>
              ) : null}
            </div>
          </div>
          <div className="workspace-header-actions">
            <span className="workspace-role-label">{roleLabel}</span>
            <button
              type="button"
              className="workspace-logout-button"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              <span>{isSigningOut ? "Logging out..." : "Logout"}</span>
              <LogoutGlyph />
            </button>
          </div>
        </header>

        <section className="dashboard-video-card">
          {dashboardVideoUrl ? (
            <button
              type="button"
              className="dashboard-video-toggle"
              onClick={handleDashboardVideoToggle}
              onPointerEnter={() => setIsVideoCursorVisible(true)}
              onPointerMove={handleDashboardVideoPointerMove}
              onPointerLeave={() => setIsVideoCursorVisible(false)}
              aria-label={isVideoMuted ? "Unmute dashboard video" : "Mute dashboard video"}
            >
              <video
                ref={dashboardVideoRef}
                className="dashboard-video"
                src={dashboardVideoUrl}
                autoPlay
                muted={isVideoMuted}
                loop
                playsInline
                preload="metadata"
              />
              <span
                className={`dashboard-video-cursor${isVideoCursorVisible ? " is-visible" : ""}`}
                style={{
                  left: `${videoCursorPosition.x}px`,
                  top: `${videoCursorPosition.y}px`
                }}
                aria-hidden="true"
              >
                {isVideoMuted ? "Unmute" : "Mute"}
              </span>
              <span className="dashboard-video-hint" aria-hidden="true">
                Click anywhere to {isVideoMuted ? "turn sound on" : "mute"}
              </span>
            </button>
          ) : (
            <div className="dashboard-video-empty">
              <p className="dashboard-video-empty-kicker">External video ready</p>
              <h2>Paste your Bunny.net video URL into `hardcodedDashboardVideoUrl`.</h2>
              <p>The dashboard video area is prepared for a CDN-hosted MP4 and will render once that hardcoded URL is in place.</p>
            </div>
          )}
        </section>

        <section className="dashboard-quick-links" aria-label="Quick links">
          {quickLinks.map((link) =>
            link.href.startsWith("http://") || link.href.startsWith("https://") ? (
              <a
                key={link.id}
                href={link.href}
                target={link.newTab ? "_blank" : undefined}
                rel={link.newTab ? "noreferrer" : undefined}
                className="dashboard-quick-link"
              >
                <span className="dashboard-quick-link-kicker">Quick link</span>
                <div className="dashboard-quick-link-copy">
                  <h2>{link.title}</h2>
                  <p>{link.description}</p>
                </div>
                <span className="dashboard-quick-link-arrow" aria-hidden="true">
                  {link.newTab ? "↗" : "→"}
                </span>
              </a>
            ) : (
              <Link key={link.id} href={link.href} className="dashboard-quick-link">
                <span className="dashboard-quick-link-kicker">Quick link</span>
                <div className="dashboard-quick-link-copy">
                  <h2>{link.title}</h2>
                  <p>{link.description}</p>
                </div>
                <span className="dashboard-quick-link-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            )
          )}
        </section>
      </section>
    </main>
  );
}
