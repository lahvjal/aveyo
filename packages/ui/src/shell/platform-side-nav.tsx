"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { resolveAppUrl, resolveEnvironment, trimTrailingSlash } from "@ava/config/runtime/app-urls";
import {
  PLATFORM_PRIMARY_NAV_ITEMS,
  PLATFORM_UTILITY_NAV_ITEMS,
  getAveyoSiteUrl,
  getPlatformNavIconSrc,
  resolvePlatformNavHref
} from "../platform-nav";
import styles from "./platform-side-nav.module.css";
import type {
  PlatformNavIconRenderer,
  PlatformProfileRowProps,
  PlatformSideNavClassNames,
  PlatformSideNavLinkRenderer,
  PlatformUtilityNavItem,
  RuntimeEnvironment
} from "./types";

type PlatformPrimaryNavItem = (typeof PLATFORM_PRIMARY_NAV_ITEMS)[number];
type PlatformNavIconKey = Parameters<typeof getPlatformNavIconSrc>[0];

export interface PlatformSideNavProps {
  pathname?: string;
  storageKey: string;
  renderWordmark?: (collapsed: boolean) => ReactNode;
  wordmarkLogoSrc?: string;
  wordmarkMiniLogoSrc?: string;
  wordmarkAlt?: string;
  profile: PlatformProfileRowProps;
  sameAppHrefByItemId?: Record<string, string>;
  utilityItems?: PlatformUtilityNavItem[];
  iconPrefix?: string;
  defaultCollapsed?: boolean;
  brandAriaLabel?: string;
  isPrimaryItemActive?: (itemId: string, pathname: string) => boolean;
  isUtilityItemActive?: (item: PlatformUtilityNavItem, pathname: string) => boolean;
  renderLink?: PlatformSideNavLinkRenderer;
  renderIcon?: PlatformNavIconRenderer;
  onCollapsedChange?: (collapsed: boolean) => void;
  resolveBrandHref?: (environment: RuntimeEnvironment) => string;
  userType?: string;
  role?: string;
  canAccessManagerPanel?: boolean;
  canAccessAdminPanel?: boolean;
}

const DEFAULT_PATHNAME = "/";
const SHARED_CLASS_NAMES: PlatformSideNavClassNames = {
  aside: styles.aside,
  header: styles.header,
  brandRow: styles.brandRow,
  collapseToggle: styles.collapseToggle,
  primaryNav: styles.primaryNav,
  navItem: styles.navItem,
  navIcon: styles.navIcon,
  navLabel: styles.navLabel,
  utilityNav: styles.utilityNav,
  utilityItem: styles.utilityItem,
  profileRow: styles.profileRow,
  profileAvatar: styles.profileAvatar,
  profileCopy: styles.profileCopy
};

const ADMIN_PANEL_ROLE_KEYS = new Set([
  "admin",
  "org_admin",
  "org-admin",
  "platform_admin",
  "platform-admin",
  "super_admin",
  "super-admin",
  "superadmin"
]);

const MANAGER_PANEL_ROLE_KEYS = new Set([
  "manager",
  "org_manager",
  "org-manager",
  "team_manager",
  "team-manager",
  "people_manager",
  "people-manager"
]);

function joinClassNames(
  baseClassName: string,
  options: { active?: boolean; disabled?: boolean } = {}
) {
  let value = baseClassName;
  if (options.active) {
    value += ` ${styles.active}`;
  }
  if (options.disabled) {
    value += ` ${styles.disabled}`;
  }
  return value;
}

function routeMatches(pathname: string, prefixes: string[] | undefined): boolean {
  if (!prefixes || prefixes.length === 0) {
    return false;
  }
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function normalizeAccessValue(value: string | undefined): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function canShowUtilityItemByRole(
  itemId: string,
  options: {
    userType?: string;
    role?: string;
    canAccessManagerPanel?: boolean;
    canAccessAdminPanel?: boolean;
  }
): boolean {
  const hasRoleContext = typeof options.role === "string" || typeof options.userType === "string";

  if (itemId === "manager") {
    if (typeof options.canAccessManagerPanel === "boolean") {
      return options.canAccessManagerPanel;
    }
    if (!hasRoleContext) {
      return true;
    }

    const normalizedUserType = normalizeAccessValue(options.userType);
    if (normalizedUserType && normalizedUserType !== "employee") {
      return false;
    }

    const normalizedRole = normalizeAccessValue(options.role);
    return MANAGER_PANEL_ROLE_KEYS.has(normalizedRole);
  }

  if (itemId === "admin") {
    if (typeof options.canAccessAdminPanel === "boolean") {
      return options.canAccessAdminPanel;
    }
    if (!hasRoleContext) {
      return true;
    }

    const normalizedUserType = normalizeAccessValue(options.userType);
    if (normalizedUserType && normalizedUserType !== "employee") {
      return false;
    }

    const normalizedRole = normalizeAccessValue(options.role);
    return ADMIN_PANEL_ROLE_KEYS.has(normalizedRole);
  }

  return true;
}

function resolveUtilityHref(
  item: PlatformUtilityNavItem,
  runtimeEnvironment: RuntimeEnvironment,
  sameAppHrefByItemId: Record<string, string>
): string {
  const sameAppHref = sameAppHrefByItemId[item.id];
  if (sameAppHref) {
    return sameAppHref;
  }

  if (item.href) {
    return item.href;
  }

  if (item.id === "manager" || item.id === "admin") {
    const orgBaseUrl = trimTrailingSlash(resolveAppUrl("org", runtimeEnvironment));
    return orgBaseUrl ? `${orgBaseUrl}/${item.id}` : "";
  }

  return "";
}

function resolveProfileHref(
  runtimeEnvironment: RuntimeEnvironment,
  sameAppHrefByItemId: Record<string, string>
): string {
  const sameAppHref = sameAppHrefByItemId.profile;
  if (sameAppHref) {
    return sameAppHref;
  }

  const orgBaseUrl = trimTrailingSlash(resolveAppUrl("org", runtimeEnvironment));
  if (orgBaseUrl) {
    return `${orgBaseUrl}/profile`;
  }

  return "/profile";
}

function resolveMobileDashboardTarget(
  primaryNavItems: PlatformPrimaryNavItem[],
  runtimeEnvironment: RuntimeEnvironment,
  sameAppHrefByItemId: Record<string, string>
): { item: PlatformPrimaryNavItem; href: string } | null {
  const preferredSameAppIds = ["dashboard", "org", "kpi", "ava"];
  for (const preferredId of preferredSameAppIds) {
    const candidate = primaryNavItems.find((item) => item.id === preferredId);
    if (!candidate) {
      continue;
    }

    if (preferredId !== "dashboard" && !sameAppHrefByItemId[preferredId]) {
      continue;
    }

    const href = resolvePlatformNavHref(candidate, runtimeEnvironment, { sameAppHrefByItemId });
    if (href) {
      return { item: candidate, href };
    }
  }

  for (const item of primaryNavItems) {
    const href = resolvePlatformNavHref(item, runtimeEnvironment, { sameAppHrefByItemId });
    if (href) {
      return { item, href };
    }
  }

  return null;
}

function readRuntimeEnvironment(): RuntimeEnvironment {
  if (typeof window === "undefined") {
    return "local";
  }
  return resolveEnvironment(window.location.hostname);
}

function readStoredCollapsedState(storageKey: string, fallbackValue: boolean): boolean {
  if (typeof window === "undefined") {
    return fallbackValue;
  }
  const stored = window.localStorage.getItem(storageKey);
  if (stored === "0") {
    return false;
  }
  if (stored === "1") {
    return true;
  }
  return fallbackValue;
}

function readPublicEnv(name: string): string | undefined {
  const processLike = globalThis as unknown as {
    process?: {
      env?: Record<string, string | undefined>;
    };
  };
  return processLike.process?.env?.[name];
}

function getInitials(value: string): string {
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

function defaultRenderLink({
  key,
  href,
  className,
  title,
  ariaLabel,
  children
}: {
  key: string;
  href: string;
  className: string;
  title?: string;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <a key={key} href={href} className={className} title={title} aria-label={ariaLabel}>
      {children}
    </a>
  );
}

function defaultRenderIcon({ src }: { icon: string; src: string }) {
  return <img src={src} alt="" aria-hidden="true" />;
}

function toAvatarUrl(value: string | null | undefined): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

export function PlatformSideNav({
  pathname = DEFAULT_PATHNAME,
  storageKey,
  renderWordmark,
  wordmarkLogoSrc,
  wordmarkMiniLogoSrc,
  wordmarkAlt = "Aveyo",
  profile,
  sameAppHrefByItemId = {},
  utilityItems,
  iconPrefix = "/",
  defaultCollapsed = true,
  brandAriaLabel = "Open Aveyo site",
  isPrimaryItemActive,
  isUtilityItemActive,
  renderLink = defaultRenderLink,
  renderIcon = defaultRenderIcon,
  onCollapsedChange,
  resolveBrandHref,
  userType,
  role,
  canAccessManagerPanel,
  canAccessAdminPanel
}: PlatformSideNavProps) {
  const classNames = SHARED_CLASS_NAMES;
  const [runtimeEnvironment, setRuntimeEnvironment] = useState<RuntimeEnvironment>(
    readRuntimeEnvironment
  );
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() =>
    readStoredCollapsedState(storageKey, defaultCollapsed)
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setRuntimeEnvironment(readRuntimeEnvironment());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, isCollapsed ? "1" : "0");
    }
    onCollapsedChange?.(isCollapsed);
  }, [storageKey, isCollapsed, onCollapsedChange]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const primaryNavItems = PLATFORM_PRIMARY_NAV_ITEMS as PlatformPrimaryNavItem[];
  const configuredUtilityItems = useMemo(
    () => {
      const resolvedItems =
        utilityItems ??
        ((PLATFORM_UTILITY_NAV_ITEMS as PlatformPrimaryNavItem[]).map((item) => ({
          id: item.id,
          label: item.label,
          icon: item.icon
        })) as PlatformUtilityNavItem[]);

      // Settings is intentionally removed from the shared side-nav.
      return resolvedItems.filter((item) => item.id !== "settings");
    },
    [utilityItems]
  );
  const visibleUtilityItems = useMemo(
    () =>
      configuredUtilityItems.filter((item) =>
        canShowUtilityItemByRole(item.id, {
          userType,
          role,
          canAccessManagerPanel,
          canAccessAdminPanel
        })
      ),
    [configuredUtilityItems, userType, role, canAccessManagerPanel, canAccessAdminPanel]
  );

  const brandHref =
    resolveBrandHref?.(runtimeEnvironment) ??
    getAveyoSiteUrl(runtimeEnvironment, readPublicEnv("NEXT_PUBLIC_AVEYO_APP_URL"));
  const logoSrc = wordmarkLogoSrc ?? "/images/aveyo-logo.svg";
  const miniLogoSrc = wordmarkMiniLogoSrc ?? "/images/aveyo-icon.svg";
  const wordmark = renderWordmark ?? ((collapsed: boolean) => (
    <div
      className={`${styles.wordmark}${collapsed ? ` ${styles.collapsed}` : ""}`}
      aria-label="Aveyo"
    >
      <img src={logoSrc} alt={wordmarkAlt} className={styles.wordmarkLogo} />
      <span className={styles.wordmarkMini} aria-hidden="true">
        <img src={miniLogoSrc} alt="" className={styles.wordmarkMiniLogo} />
      </span>
    </div>
  ));
  const profileAvatarUrl = toAvatarUrl(profile.avatarUrl);
  const profileInitials = profile.initials?.trim() || getInitials(profile.displayName);
  const profileHref = resolveProfileHref(runtimeEnvironment, sameAppHrefByItemId);
  const mobileDashboardTarget = resolveMobileDashboardTarget(
    primaryNavItems,
    runtimeEnvironment,
    sameAppHrefByItemId
  );
  const mobileDashboardHref = mobileDashboardTarget?.href || "/";
  const mobileMenuPrimaryItems = primaryNavItems.filter(
    (item) => item.id !== mobileDashboardTarget?.item.id
  );
  const panelUtilityItem =
    visibleUtilityItems.find((item) => item.id === "admin") ??
    visibleUtilityItems.find((item) => item.id === "manager") ??
    null;
  const panelHref = panelUtilityItem
    ? resolveUtilityHref(panelUtilityItem, runtimeEnvironment, sameAppHrefByItemId)
    : "";
  const panelLabel = panelUtilityItem?.label ?? "Panel";
  const panelIconSrc = getPlatformNavIconSrc((panelUtilityItem?.icon ?? "admin") as PlatformNavIconKey, {
    prefix: iconPrefix
  });
  const panelIsActive = panelUtilityItem
    ? (isUtilityItemActive?.(panelUtilityItem, pathname) ??
      panelUtilityItem.active ??
      routeMatches(pathname, panelUtilityItem.matchPrefixes))
    : false;
  const profileTabActive = routeMatches(pathname, ["/profile"]);
  const dashboardTabActive =
    typeof mobileDashboardHref === "string" && mobileDashboardHref.startsWith("/")
      ? routeMatches(pathname, [mobileDashboardHref === "/" ? "/" : mobileDashboardHref])
      : false;
  const profileTitle = isCollapsed ? `${profile.displayName} (${profile.roleLabel})` : undefined;
  const profileBody = (
    <>
      <span className={classNames.profileAvatar} aria-hidden="true">
        {profileAvatarUrl ? <img src={profileAvatarUrl} alt="" /> : profileInitials}
      </span>
      <span className={classNames.profileCopy}>
        <strong>{profile.displayName}</strong>
        <small>{profile.roleLabel}</small>
      </span>
    </>
  );
  const logoutBody = (
    <>
      <span className={classNames.navIcon} aria-hidden="true">
        <svg viewBox="0 0 20 20" className={styles.logoutIcon}>
          <path d="M8 3.5H5.5a1.5 1.5 0 0 0-1.5 1.5v10a1.5 1.5 0 0 0 1.5 1.5H8" />
          <path d="M12 6.5 16 10l-4 3.5" />
          <path d="M16 10H7" />
        </svg>
      </span>
      <span className={classNames.navLabel}>Logout</span>
    </>
  );

  return (
    <aside
      className={`${classNames.aside}${isCollapsed ? ` ${styles.collapsed}` : ""}`}
    >
      <div className={classNames.header}>
        <div className={classNames.brandRow}>
          <a href={brandHref} aria-label={brandAriaLabel}>
            {wordmark(isCollapsed)}
          </a>
        </div>
        <button
          type="button"
          className={classNames.collapseToggle}
          onClick={() => setIsCollapsed((value) => !value)}
          aria-label={isCollapsed ? "Expand side navigation" : "Collapse side navigation"}
          title={isCollapsed ? "Expand navigation" : "Collapse navigation"}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M12.5 4.5 7 10l5.5 5.5" />
          </svg>
        </button>
      </div>

      <nav className={classNames.primaryNav} aria-label="Primary navigation">
        {primaryNavItems.map((item) => {
          const href = resolvePlatformNavHref(item, runtimeEnvironment, {
            sameAppHrefByItemId
          });
          const itemIsActive =
            isPrimaryItemActive?.(item.id, pathname) ??
            routeMatches(pathname, item.id === "dashboard" ? ["/"] : undefined);
          const itemClassName = joinClassNames(classNames.navItem, {
            active: itemIsActive,
            disabled: !href
          });
          const title = isCollapsed ? item.label : undefined;
          const iconSrc = getPlatformNavIconSrc(item.icon as PlatformNavIconKey, { prefix: iconPrefix });
          const navBody = (
            <>
              <span className={classNames.navIcon}>
                {iconSrc ? renderIcon({ icon: item.icon, src: iconSrc }) : null}
              </span>
              <span className={classNames.navLabel}>{item.label}</span>
            </>
          );

          if (!href) {
            return (
              <div key={item.id} className={itemClassName} title={title}>
                {navBody}
              </div>
            );
          }

          return renderLink({
            key: item.id,
            href,
            className: itemClassName,
            title,
            ariaLabel: item.label,
            children: navBody
          });
        })}
      </nav>

      <div className={classNames.utilityNav}>
        {visibleUtilityItems.map((item) => {
          const href = resolveUtilityHref(item, runtimeEnvironment, sameAppHrefByItemId);
          const itemIsActive =
            isUtilityItemActive?.(item, pathname) ??
            item.active ??
            routeMatches(pathname, item.matchPrefixes);
          const itemClassName = joinClassNames(classNames.utilityItem, {
            active: itemIsActive,
            disabled: item.disabled
          });
          const title = isCollapsed ? item.label : undefined;
          const iconSrc = getPlatformNavIconSrc(item.icon as PlatformNavIconKey, { prefix: iconPrefix });
          const navBody = (
            <>
              <span className={classNames.navIcon}>
                {iconSrc ? renderIcon({ icon: item.icon, src: iconSrc }) : null}
              </span>
              <span className={classNames.navLabel}>{item.label}</span>
            </>
          );

          if (href && !item.disabled) {
            return renderLink({
              key: item.id,
              href,
              className: itemClassName,
              title,
              ariaLabel: item.label,
              children: navBody
            });
          }

          if (item.onClick) {
            return (
              <button
                key={item.id}
                type="button"
                className={itemClassName}
                title={title}
                onClick={item.onClick}
                disabled={item.disabled}
              >
                {navBody}
              </button>
            );
          }

          return (
            <div key={item.id} className={itemClassName} title={title}>
              {navBody}
            </div>
          );
        })}

        {renderLink({
          key: "profile",
          href: profileHref,
          className: classNames.profileRow,
          title: profileTitle,
          ariaLabel: "Open profile",
          children: profileBody
        })}

        <button
          type="button"
          className={`${classNames.utilityItem} ${styles.utilityButton}`}
          title={isCollapsed ? "Logout" : undefined}
          aria-label="Logout"
          onClick={profile.onClick}
          disabled={profile.disabled}
        >
          {logoutBody}
        </button>
      </div>

      <nav className={styles.mobileTabBar} aria-label="Mobile navigation">
        {renderLink({
          key: "mobile-dashboard",
          href: mobileDashboardHref,
          className: `${styles.mobileTabLink}${dashboardTabActive ? ` ${styles.mobileTabActive}` : ""}`,
          ariaLabel: "Open dashboard",
          children: (
            <>
              <span className={styles.mobileTabIcon}>
                {getPlatformNavIconSrc("dashboard", { prefix: iconPrefix }) ? (
                  <img
                    src={getPlatformNavIconSrc("dashboard", { prefix: iconPrefix })}
                    alt=""
                    aria-hidden="true"
                  />
                ) : null}
              </span>
              <span className={styles.mobileTabLabel}>Dashboard</span>
            </>
          )
        })}

        <button
          type="button"
          className={`${styles.mobileTabButton}${isMobileMenuOpen ? ` ${styles.mobileTabActive}` : ""}`}
          aria-label="Open app menu"
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((value) => !value)}
        >
          <span className={styles.mobileTabIcon} aria-hidden="true">
            <svg viewBox="0 0 20 20" className={styles.mobileMenuIcon}>
              <path d="M3.5 5.5h13" />
              <path d="M3.5 10h13" />
              <path d="M3.5 14.5h13" />
            </svg>
          </span>
          <span className={styles.mobileTabLabel}>Apps</span>
        </button>

        {panelHref ? (
          renderLink({
            key: "mobile-panel",
            href: panelHref,
            className: `${styles.mobileTabLink}${panelIsActive ? ` ${styles.mobileTabActive}` : ""}`,
            ariaLabel: `Open ${panelLabel}`,
            children: (
              <>
                <span className={styles.mobileTabIcon}>
                  {panelIconSrc ? <img src={panelIconSrc} alt="" aria-hidden="true" /> : null}
                </span>
                <span className={styles.mobileTabLabel}>{panelLabel}</span>
              </>
            )
          })
        ) : (
          <button
            type="button"
            className={`${styles.mobileTabButton} ${styles.mobileTabDisabled}`}
            aria-label="Panel unavailable"
            disabled
          >
            <span className={styles.mobileTabIcon}>
              {panelIconSrc ? <img src={panelIconSrc} alt="" aria-hidden="true" /> : null}
            </span>
            <span className={styles.mobileTabLabel}>{panelLabel}</span>
          </button>
        )}

        {renderLink({
          key: "mobile-profile",
          href: profileHref,
          className: `${styles.mobileTabLink}${profileTabActive ? ` ${styles.mobileTabActive}` : ""}`,
          ariaLabel: "Open profile",
          children: (
            <>
              <span className={styles.mobileTabAvatar} aria-hidden="true">
                {profileAvatarUrl ? <img src={profileAvatarUrl} alt="" /> : profileInitials}
              </span>
              <span className={styles.mobileTabLabel}>Profile</span>
            </>
          )
        })}
      </nav>

      {isMobileMenuOpen ? (
        <div
          className={styles.mobileMenuOverlay}
          role="presentation"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className={styles.mobileMenuSheet}
            role="dialog"
            aria-modal="true"
            aria-label="Apps"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.mobileMenuHeader}>
              <strong>Apps</strong>
              <button
                type="button"
                className={styles.mobileMenuClose}
                aria-label="Close app menu"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M5.5 5.5 14.5 14.5" />
                  <path d="M14.5 5.5 5.5 14.5" />
                </svg>
              </button>
            </div>

            <div className={styles.mobileMenuList}>
              {mobileMenuPrimaryItems.map((item) => {
                const href = resolvePlatformNavHref(item, runtimeEnvironment, {
                  sameAppHrefByItemId
                });
                if (!href) {
                  return null;
                }

                const itemIsActive =
                  isPrimaryItemActive?.(item.id, pathname) ??
                  routeMatches(pathname, item.id === "dashboard" ? ["/"] : undefined);
                const iconSrc = getPlatformNavIconSrc(item.icon as PlatformNavIconKey, { prefix: iconPrefix });

                return renderLink({
                  key: `mobile-menu-${item.id}`,
                  href,
                  className: `${styles.mobileMenuItem}${itemIsActive ? ` ${styles.mobileMenuItemActive}` : ""}`,
                  ariaLabel: item.label,
                  children: (
                    <>
                      <span className={styles.mobileMenuItemIcon}>
                        {iconSrc ? <img src={iconSrc} alt="" aria-hidden="true" /> : null}
                      </span>
                      <span>{item.label}</span>
                    </>
                  )
                });
              })}
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
