"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getEnvironmentLabel,
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
import { resolveDashboardModules, summarizeDashboardAccess } from "../lib/dashboard-modules";

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
  const kpiAppUrl = useMemo(() => {
    const kpiNavItem = PLATFORM_PRIMARY_NAV_ITEMS.find((item) => item.id === "kpi");
    if (!kpiNavItem) {
      return "";
    }
    return resolvePlatformNavHref(kpiNavItem, runtime.environment);
  }, [runtime.environment]);
  const orgBaseUrl = useMemo(() => trimTrailingSlash(orgAppUrl), [orgAppUrl]);
  const managerPanelUrl = useMemo(
    () => (orgBaseUrl ? `${orgBaseUrl}/manager` : ""),
    [orgBaseUrl]
  );
  const adminPanelUrl = useMemo(
    () => (orgBaseUrl ? `${orgBaseUrl}/admin` : ""),
    [orgBaseUrl]
  );
  const accessSummary = useMemo(() => summarizeDashboardAccess(session.access), [session.access]);
  const dashboardModules = useMemo(() => resolveDashboardModules(session.access), [session.access]);
  const canAccessManagerPanel = Boolean(
    accessSummary.flags.isManager ||
      accessSummary.flags.isAdmin ||
      accessSummary.flags.isExecutive ||
      accessSummary.flags.isSuperAdmin
  );
  const canAccessAdminPanel = Boolean(
    accessSummary.flags.isAdmin || accessSummary.flags.isSuperAdmin
  );

  const displayName = session.user?.name ?? session.user?.email ?? "Vel Fuimaono";
  const roleLabel = toRoleLabel(session.role, accessSummary.flags);
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

  function renderModuleContent(moduleId) {
    switch (moduleId) {
      case "org_chart":
        return (
          <>
            {orgAppUrl ? (
              <a href={orgAppUrl} className="inline-link">
                Open org chart app
              </a>
            ) : (
              <p>Org chart app link will appear for this environment.</p>
            )}
            <p>Environment: {getEnvironmentLabel(runtime.environment)}</p>
            <p>Host: {runtime.hostname}</p>
          </>
        );
      case "platform_operations":
        return (
          <ul className="ops-list">
            {platformOpsCommands.map((command) => (
              <li key={command}>
                <code>{command}</code>
              </li>
            ))}
          </ul>
        );
      case "department_scope":
        return (
          <>
            <p>Department: {accessSummary.departmentLabel}</p>
            <p>Scope path: {accessSummary.departmentPathLabel}</p>
            <p>Sub-departments in scope: {accessSummary.subDepartmentCount}</p>
          </>
        );
      case "sub_department_scope":
        return (
          <ul className="simple-list">
            {accessSummary.subDepartmentNames.slice(0, 6).map((name) => (
              <li key={name}>{name}</li>
            ))}
            {accessSummary.subDepartmentCount > 6 ? (
              <li>+{accessSummary.subDepartmentCount - 6} more</li>
            ) : null}
          </ul>
        );
      case "manager_workspace":
        return (
          <>
            {managerPanelUrl ? (
              <a href={managerPanelUrl} className="inline-link">
                Open manager panel
              </a>
            ) : (
              <p>Manager panel link will appear for this environment.</p>
            )}
            <p>Team staffing updates and direct-report operations.</p>
          </>
        );
      case "admin_workspace":
        return (
          <>
            {adminPanelUrl ? (
              <a href={adminPanelUrl} className="inline-link">
                Open admin panel
              </a>
            ) : (
              <p>Admin panel link will appear for this environment.</p>
            )}
            <p>Manage users, departments, and org-level permissions.</p>
          </>
        );
      case "executive_workspace":
        return (
          <>
            {kpiAppUrl ? (
              <a href={kpiAppUrl} className="inline-link">
                Open KPI dashboard
              </a>
            ) : (
              <p>KPI app link will appear for this environment.</p>
            )}
            <p>Review cross-org performance trends and strategic KPIs.</p>
          </>
        );
      case "super_admin_workspace":
        return (
          <>
            <p>Environment controls and release readiness checks.</p>
            <p>Global role governance and platform guardrails.</p>
            <p>Current environment: {getEnvironmentLabel(runtime.environment)}</p>
          </>
        );
      case "announcements":
        return (
          <ul className="simple-list">
            {announcementItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        );
      case "upcoming_events":
        return (
          <ul className="simple-list">
            {upcomingEventItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        );
      default:
        return <p>No module content available.</p>;
    }
  }

  return (
    <main className="app-shell">
      <AppPlatformSideNav
        displayName={displayName}
        roleLabel={roleLabel}
        role={session.role}
        userType={session.userType}
        canAccessManagerPanel={canAccessManagerPanel}
        canAccessAdminPanel={canAccessAdminPanel}
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
            <p>Scope: {accessSummary.departmentPathLabel}</p>
          </div>
          <div className="header-meta">
            <span>{roleLabel}</span>
            <button type="button" onClick={handleSignOut} disabled={isSigningOut}>
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </header>

        <section className="workspace-grid">
          {dashboardModules.map((module) => (
            <article key={module.id} className="workspace-card">
              <h2 className={module.id === "announcements" ? "with-alert-dot" : undefined}>
                {module.id === "announcements" ? <span /> : null}
                {module.title}
              </h2>
              <div className="workspace-content">
                <p>{module.description}</p>
                {renderModuleContent(module.id)}
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
