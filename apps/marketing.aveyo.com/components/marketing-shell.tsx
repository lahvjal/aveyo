"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { resolveAppUrl, resolveEnvironment, trimTrailingSlash } from "@ava/config/runtime/app-urls";
import { PLATFORM_UTILITY_NAV_ITEMS } from "@packages/ui/src/platform-nav";
import { PlatformSideNav } from "@packages/ui/src/shell/platform-side-nav";
import {
  type PlatformSideNavLinkRendererProps,
  type PlatformUtilityNavItem,
  type RuntimeEnvironment
} from "@packages/ui/src/shell/types";
import { buildAuthLoginUrl } from "@/lib/auth/config";
import { logoutAuthSession } from "@/lib/auth/session";
import type { PlatformAuthSession } from "@/lib/auth/use-auth-session";

interface MarketingShellProps {
  session: PlatformAuthSession;
  currentPath: string;
  title: string;
  description?: string;
  children: ReactNode;
}

const utilityNavItems: PlatformUtilityNavItem[] = PLATFORM_UTILITY_NAV_ITEMS.map((item) => ({
  id: item.id,
  label: item.label,
  icon: item.icon
}));

function readRuntimeEnvironment(): RuntimeEnvironment {
  if (typeof window === "undefined") {
    return "local";
  }
  return resolveEnvironment(window.location.hostname);
}

function renderSideNavLink({
  key,
  href,
  className,
  title,
  ariaLabel,
  children
}: PlatformSideNavLinkRendererProps) {
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

function getInitials(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) {
    return "AV";
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function toRoleLabel(role: string): string {
  const normalized = role.trim();
  if (!normalized || normalized === "unknown") {
    return "Team member";
  }

  return normalized
    .split(/[_-]/g)
    .filter(Boolean)
    .map((segment) => `${segment[0]?.toUpperCase() ?? ""}${segment.slice(1).toLowerCase()}`)
    .join(" ");
}

function isActivePath(currentPath: string, href: string): boolean {
  if (href === "/") {
    return currentPath === "/";
  }
  return currentPath === href;
}

export function MarketingShell({
  session,
  currentPath,
  title,
  description,
  children
}: MarketingShellProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [runtimeEnvironment, setRuntimeEnvironment] = useState<RuntimeEnvironment>(
    readRuntimeEnvironment
  );

  useEffect(() => {
    setRuntimeEnvironment(readRuntimeEnvironment());
  }, []);

  const dashboardBaseUrl = useMemo(
    () => trimTrailingSlash(resolveAppUrl("dashboard", runtimeEnvironment)),
    [runtimeEnvironment]
  );
  const iconPrefix = dashboardBaseUrl ? `${dashboardBaseUrl}/` : "/";
  const wordmarkLogoSrc = dashboardBaseUrl ? `${dashboardBaseUrl}/aveyo-logo.svg` : "/aveyo-logo.svg";
  const wordmarkMiniLogoSrc = dashboardBaseUrl
    ? `${dashboardBaseUrl}/aveyo-icon.svg`
    : "/aveyo-icon.svg";

  const displayName = session.user?.name?.trim() || session.user?.email || "Account";
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

  return (
    <main className="app-shell">
      <PlatformSideNav
        pathname={currentPath}
        storageKey="marketing-primary-nav-collapsed"
        iconPrefix={iconPrefix}
        sameAppHrefByItemId={{
          marketing: "/",
          culture: "/culture"
        }}
        wordmarkLogoSrc={wordmarkLogoSrc}
        wordmarkMiniLogoSrc={wordmarkMiniLogoSrc}
        renderLink={renderSideNavLink}
        isPrimaryItemActive={(itemId, pathname) => {
          if (itemId === "marketing") {
            return isActivePath(pathname, "/");
          }
          if (itemId === "culture") {
            return pathname === "/culture" || pathname.startsWith("/culture/");
          }
          return false;
        }}
        utilityItems={utilityNavItems}
        role={session.role}
        userType="employee"
        profile={{
          displayName,
          roleLabel,
          avatarUrl: session.user?.avatarUrl ?? null,
          initials,
          disabled: isSigningOut,
          onClick: () => {
            void handleSignOut();
          }
        }}
      />

      <section className="workspace">
        <header className="workspace-header">
          <div className="header-copy">
            <p>Aveyo Marketing Workspace</p>
            <h1>{title}</h1>
            {description ? <p className="workspace-description">{description}</p> : null}
          </div>
          <div className="header-meta">
            <span>{roleLabel}</span>
            <button type="button" onClick={handleSignOut} disabled={isSigningOut}>
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </header>
        <div className="workspace-body">{children}</div>
      </section>
    </main>
  );
}
