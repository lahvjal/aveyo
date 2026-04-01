"use client";

import Link from "next/link";
import { PLATFORM_UTILITY_NAV_ITEMS } from "@packages/ui/src/platform-nav";
import { PlatformSideNav } from "@packages/ui/src/shell/platform-side-nav";
import {
  type PlatformSideNavLinkRendererProps,
  type PlatformUtilityNavItem
} from "@packages/ui/src/shell/types";

const utilityNavItems: PlatformUtilityNavItem[] = PLATFORM_UTILITY_NAV_ITEMS.map((item) => ({
  id: item.id,
  label: item.label,
  icon: item.icon
}));

function getInitials(name: string | null | undefined) {
  const trimmed = typeof name === "string" ? name.trim() : "";
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

interface AppSideRailProps {
  userName?: string | null;
  userAvatarUrl?: string | null;
  userRole?: string | null;
  signOutPending?: boolean;
  onSignOut: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function AppSideRail({
  userName,
  userAvatarUrl,
  userRole,
  signOutPending = false,
  onSignOut,
  onCollapsedChange
}: AppSideRailProps) {
  const displayName = userName?.trim() || "Ava Agent";
  const roleLabel = userRole?.trim() || "Support Agent";
  const avatarUrl = typeof userAvatarUrl === "string" ? userAvatarUrl.trim() : "";

  return (
    <PlatformSideNav
      pathname="/"
      storageKey="ava-primary-nav-collapsed"
      iconPrefix="/images/"
      sameAppHrefByItemId={{
        ava: "/"
      }}
      renderLink={renderLink}
      isPrimaryItemActive={(itemId) => itemId === "ava"}
      utilityItems={utilityNavItems}
      onCollapsedChange={onCollapsedChange}
      profile={{
        displayName,
        roleLabel,
        avatarUrl,
        initials: getInitials(displayName),
        disabled: signOutPending,
        onClick: onSignOut
      }}
    />
  );
}
