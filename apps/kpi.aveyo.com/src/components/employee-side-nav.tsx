"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { buildAuthLoginUrl } from "@/lib/auth/config";
import { logoutAuthSession } from "@/lib/auth/session";
import { PLATFORM_UTILITY_NAV_ITEMS } from "@packages/ui/src/platform-nav";
import { PlatformSideNav } from "@packages/ui/src/shell/platform-side-nav";
import {
  type PlatformSideNavLinkRendererProps,
  type PlatformUtilityNavItem
} from "@packages/ui/src/shell/types";

function toRoleLabel(role?: string, jobTitle?: string | null, isExecutive?: boolean | null) {
  if (role === "super_admin") {
    return "Platform Admin";
  }
  if (isExecutive) {
    return "Executive";
  }
  if (jobTitle?.trim()) {
    return jobTitle.trim();
  }
  return "Employee";
}

function getInitials(value?: string | null) {
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

function renderLink({ key, href, className, title, ariaLabel, children }: PlatformSideNavLinkRendererProps) {
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

const utilityNavItems: PlatformUtilityNavItem[] = PLATFORM_UTILITY_NAV_ITEMS.map((item) => ({
  id: item.id,
  label: item.label,
  icon: item.icon
}));

export function EmployeeSideNav() {
  const pathname = usePathname();
  const { user, profile, role } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isKpiRoute = pathname === "/" || pathname?.startsWith("/settings");
  const displayName = profile?.full_name ?? user?.name ?? user?.email ?? "Aveyo User";
  const roleLabel = toRoleLabel(role, profile?.job_title, profile?.is_executive);
  const avatarUrl = profile?.profile_photo_url?.trim() || "";
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
    <PlatformSideNav
      pathname={pathname || "/"}
      storageKey="kpi-primary-nav-collapsed"
      sameAppHrefByItemId={{
        kpi: "/"
      }}
      wordmarkLogoSrc="/logo/aveyo-logo.svg"
      wordmarkMiniLogoSrc="/logo/aveyo-icon.svg"
      renderLink={renderLink}
      isPrimaryItemActive={(itemId) => itemId === "kpi" && Boolean(isKpiRoute)}
      utilityItems={utilityNavItems}
      iconPrefix="/"
      profile={{
        displayName,
        roleLabel,
        avatarUrl,
        initials,
        disabled: isSigningOut,
        onClick: () => {
          void handleSignOut();
        }
      }}
    />
  );
}
