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
import { openAvaWidgetFromHost } from "@ava/widget";
import { PlatformSideNav } from "@packages/ui/src/shell/platform-side-nav";
import { buildAuthLoginUrl } from "../lib/auth/config";
import { authApiRequest, logoutAuthSession } from "../lib/auth/session";
import { useAuthSession } from "../lib/auth/use-auth-session";
import { summarizeDashboardAccess } from "../lib/dashboard-modules";
import CustomerTrackingSection from "./customer-tracking";

const hardcodedDashboardVideoUrl =
  "https://vz-bd3d2939-ded.b-cdn.net/340a5949-b949-4328-a27d-d1698a64b0ae/play_1080p.mp4";

const dashboardPageStyleVars = {
  "--dashboard-card-radius": `${designSystem.tokens.radius.card}px`,
  "--dashboard-button-radius": `${designSystem.tokens.radius.button}px`
};

const eventDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric"
});

const eventTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit"
});

const announcementDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit"
});

const announcementTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit"
});

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

function isCurrentOrUpcomingCultureEvent(event) {
  const startAt = Date.parse(`${event?.date}T${event?.time}`);
  if (Number.isNaN(startAt)) {
    return false;
  }

  const now = Date.now();
  const endDate = typeof event?.endDate === "string" ? event.endDate.trim() : "";
  const endAt =
    endDate && !Number.isNaN(Date.parse(`${endDate}T23:59:59.999`))
      ? Date.parse(`${endDate}T23:59:59.999`)
      : null;

  return endAt !== null ? now <= endAt : startAt >= now;
}

function sortCultureEvents(events) {
  return [...events].sort((left, right) => {
    const leftTime = Date.parse(`${left?.date}T${left?.time}`);
    const rightTime = Date.parse(`${right?.date}T${right?.time}`);
    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
      return `${left?.title ?? ""}`.localeCompare(`${right?.title ?? ""}`);
    }

    return leftTime - rightTime;
  });
}

function formatCultureEventDateTime(event) {
  const parsedDate = Date.parse(`${event?.date}T00:00:00`);
  const parsedTime = Date.parse(`1970-01-01T${event?.time}`);
  const formattedDate = Number.isNaN(parsedDate)
    ? event?.date ?? ""
    : eventDateFormatter.format(new Date(parsedDate));
  const formattedTime = Number.isNaN(parsedTime)
    ? event?.time ?? ""
    : eventTimeFormatter.format(new Date(parsedTime));

  return formattedDate && formattedTime
    ? `${formattedDate} at ${formattedTime}`
    : formattedDate || formattedTime || "";
}

function isSameCalendarDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatAnnouncementTimestamp(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const now = new Date();
  if (isSameCalendarDay(parsed, now)) {
    return `Today at ${announcementTimeFormatter.format(parsed)}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameCalendarDay(parsed, yesterday)) {
    return `Yesterday at ${announcementTimeFormatter.format(parsed)}`;
  }

  return announcementDateTimeFormatter.format(parsed);
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
      onMobileAvaClick={() => {
        openAvaWidgetFromHost();
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
  const [cultureHighlights, setCultureHighlights] = useState({
    loading: true,
    error: "",
    nextEvent: null,
    latestAnnouncement: null
  });
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

  useEffect(() => {
    if (
      session.loading ||
      !session.authenticated ||
      !onboardingChecked ||
      session.userType !== "employee"
    ) {
      return;
    }

    let cancelled = false;

    async function loadCultureHighlights() {
      try {
        const payload = await authApiRequest("/api/marketing/culture", { method: "GET" });
        if (cancelled) {
          return;
        }

        const upcomingEvents = sortCultureEvents(
          Array.isArray(payload?.events)
            ? payload.events.filter((event) => isCurrentOrUpcomingCultureEvent(event))
            : []
        );
        const announcements = Array.isArray(payload?.announcements) ? payload.announcements : [];

        setCultureHighlights({
          loading: false,
          error: "",
          nextEvent: upcomingEvents[0] ?? null,
          latestAnnouncement: announcements[0] ?? null
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setCultureHighlights({
          loading: false,
          error: error instanceof Error ? error.message : "Unable to load culture highlights.",
          nextEvent: null,
          latestAnnouncement: null
        });
      }
    }

    void loadCultureHighlights();
    return () => {
      cancelled = true;
    };
  }, [onboardingChecked, session.authenticated, session.loading, session.userType]);

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
  const nextEvent = cultureHighlights.nextEvent;
  const latestAnnouncement = cultureHighlights.latestAnnouncement;

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

        <div className="dashboard-content-stack">
          <section className="dashboard-hero-row">
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

            <aside className="dashboard-culture-rail" aria-label="Culture highlights">
              <div className="dashboard-culture-rail-heading">
                <p>Next Upcoming Event</p>
              </div>

              <div className="dashboard-culture-event-slot">
                {cultureHighlights.loading ? (
                  <div className="dashboard-culture-event-empty">
                    <p>Loading next event...</p>
                  </div>
                ) : nextEvent?.posterUrl ? (
                  nextEvent.posterKind === "video" ? (
                    <video
                      className="dashboard-culture-event-media"
                      src={nextEvent.posterUrl}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="dashboard-culture-event-media"
                        src={nextEvent.posterUrl}
                        alt={`${nextEvent.title} poster`}
                      />
                    </>
                  )
                ) : nextEvent ? (
                  <div className="dashboard-culture-event-empty">
                    <p className="dashboard-culture-event-title">{nextEvent.title}</p>
                    <p>{nextEvent.location}</p>
                    <p>{formatCultureEventDateTime(nextEvent)}</p>
                  </div>
                ) : (
                  <div className="dashboard-culture-event-empty">
                    <p>{cultureHighlights.error ? "Culture highlights unavailable." : "No upcoming event yet."}</p>
                  </div>
                )}
              </div>

              <div className="dashboard-culture-rail-heading dashboard-culture-rail-heading-border">
                <p>Announcements</p>
              </div>

              <div className="dashboard-culture-announcement-card">
                {cultureHighlights.loading ? (
                  <div className="dashboard-culture-announcement-empty">
                    <p>Loading announcement...</p>
                  </div>
                ) : latestAnnouncement ? (
                  <div className="dashboard-culture-announcement-row">
                    <span className="dashboard-culture-announcement-avatar" aria-hidden="true">
                      {latestAnnouncement.authorInitials}
                    </span>
                    <div className="dashboard-culture-announcement-copy">
                      <p className="dashboard-culture-announcement-title">
                        {latestAnnouncement.title}
                      </p>
                      <p className="dashboard-culture-announcement-message">
                        {latestAnnouncement.message}
                      </p>
                      <p className="dashboard-culture-announcement-timestamp">
                        {formatAnnouncementTimestamp(latestAnnouncement.publishedAt)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="dashboard-culture-announcement-empty">
                    <p>
                      {cultureHighlights.error
                        ? "Unable to load the latest announcement."
                        : "No announcements yet."}
                    </p>
                  </div>
                )}
              </div>
            </aside>
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

          {canAccessKpiDashboard && <CustomerTrackingSection />}
        </div>
      </section>
    </main>
  );
}
