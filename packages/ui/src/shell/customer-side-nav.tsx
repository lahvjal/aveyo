"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import styles from "./platform-side-nav.module.css";
import type { PlatformSideNavLinkRenderer } from "./types";

export type CustomerSideNavItem = {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  icon: ReactNode;
  matchPrefixes?: string[];
};

export interface CustomerSideNavProps {
  pathname?: string;
  storageKey: string;
  brandHref: string;
  brandAriaLabel?: string;
  renderWordmark: (collapsed: boolean) => ReactNode;
  items: CustomerSideNavItem[];
  footer: ReactNode;
  renderLink: PlatformSideNavLinkRenderer;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
  onSupportClick: () => void;
  onProfileClick: () => void;
  profileAvatar: ReactNode;
}

const DEFAULT_PATHNAME = "/";

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

function isPrimaryItemActive(item: CustomerSideNavItem, pathname: string): boolean {
  if (item.matchPrefixes?.length) {
    return routeMatches(pathname, item.matchPrefixes);
  }
  if (!item.href) {
    return false;
  }
  if (item.href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/" || pathname.startsWith("/dashboard/");
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function CustomerSideNav({
  pathname = DEFAULT_PATHNAME,
  storageKey,
  brandHref,
  brandAriaLabel = "Aveyo home",
  renderWordmark,
  items,
  footer,
  renderLink,
  defaultCollapsed = true,
  onCollapsedChange,
  className,
  onSupportClick,
  onProfileClick,
  profileAvatar
}: CustomerSideNavProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() =>
    readStoredCollapsedState(storageKey, defaultCollapsed)
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, isCollapsed ? "1" : "0");
    }
    onCollapsedChange?.(isCollapsed);
  }, [storageKey, isCollapsed, onCollapsedChange]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const dashboardItem = useMemo(
    () => items.find((item) => item.id === "dashboard") ?? items[0] ?? null,
    [items]
  );
  const dashboardHref = dashboardItem?.href ?? "/dashboard";

  const mobileMenuItems = useMemo(
    () => items.filter((item) => item.id !== "dashboard" && item.id !== "support"),
    [items]
  );

  const supportItem = useMemo(() => items.find((item) => item.id === "support") ?? null, [items]);

  const dashboardTabActive = isPrimaryItemActive(
    dashboardItem ?? { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: null },
    pathname
  );

  const supportTabActive = false;

  return (
    <aside className={`${styles.aside}${isCollapsed ? ` ${styles.collapsed}` : ""}${className ? ` ${className}` : ""}`}>
      <div className={styles.header}>
        <div className={styles.brandRow}>
          {renderLink({
            key: "customer-brand",
            href: brandHref,
            className: "",
            ariaLabel: brandAriaLabel,
            children: renderWordmark(isCollapsed)
          })}
        </div>
        <button
          type="button"
          className={styles.collapseToggle}
          onClick={() => setIsCollapsed((value) => !value)}
          aria-label={isCollapsed ? "Expand side navigation" : "Collapse side navigation"}
          title={isCollapsed ? "Expand navigation" : "Collapse navigation"}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M12.5 4.5 7 10l5.5 5.5" />
          </svg>
        </button>
      </div>

      <nav className={styles.primaryNav} aria-label="Customer navigation">
        {items.map((item) => {
          const itemIsActive = isPrimaryItemActive(item, pathname);
          const itemClassName = joinClassNames(styles.navItem, {
            active: itemIsActive,
            disabled: !item.href && !item.onClick
          });
          const title = isCollapsed ? item.label : undefined;
          const navBody = (
            <>
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </>
          );

          if (item.onClick && !item.href) {
            return (
              <button
                key={item.id}
                type="button"
                className={itemClassName}
                title={title}
                onClick={item.onClick}
              >
                {navBody}
              </button>
            );
          }

          if (!item.href) {
            return (
              <div key={item.id} className={itemClassName} title={title}>
                {navBody}
              </div>
            );
          }

          return renderLink({
            key: item.id,
            href: item.href,
            className: itemClassName,
            title,
            ariaLabel: item.label,
            children: navBody
          });
        })}
      </nav>

      <div className={styles.utilityNav}>{footer}</div>

      <nav className={styles.mobileTabBar} aria-label="Mobile navigation">
        {renderLink({
          key: "mobile-dashboard",
          href: dashboardHref,
          className: `${styles.mobileTabLink}${dashboardTabActive ? ` ${styles.mobileTabActive}` : ""}`,
          ariaLabel: "Open dashboard",
          children: (
            <>
              <span className={styles.mobileTabIcon}>{dashboardItem?.icon}</span>
              <span className={styles.mobileTabLabel}>Dashboard</span>
            </>
          )
        })}

        <button
          type="button"
          className={`${styles.mobileTabButton}${isMobileMenuOpen ? ` ${styles.mobileTabActive}` : ""}`}
          aria-label="Open menu"
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
          <span className={styles.mobileTabLabel}>Menu</span>
        </button>

        <button
          type="button"
          className={`${styles.mobileTabButton}${supportTabActive ? ` ${styles.mobileTabActive}` : ""}`}
          aria-label={supportItem?.label ?? "Support"}
          onClick={onSupportClick}
        >
          <span className={styles.mobileTabIcon}>{supportItem?.icon}</span>
          <span className={styles.mobileTabLabel}>{supportItem?.label ?? "Support"}</span>
        </button>

        <button
          type="button"
          className={styles.mobileTabButton}
          aria-label="Account"
          onClick={onProfileClick}
        >
          <span className={styles.mobileTabAvatar} aria-hidden="true">
            {profileAvatar}
          </span>
          <span className={styles.mobileTabLabel}>Account</span>
        </button>
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
            aria-label="Menu"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.mobileMenuHeader}>
              <strong>Menu</strong>
              <button
                type="button"
                className={styles.mobileMenuClose}
                aria-label="Close menu"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M5.5 5.5 14.5 14.5" />
                  <path d="M14.5 5.5 5.5 14.5" />
                </svg>
              </button>
            </div>

            <div className={styles.mobileMenuList}>
              {mobileMenuItems.map((item) => {
                const itemIsActive = isPrimaryItemActive(item, pathname);
                const rowClass = `${styles.mobileMenuItem}${itemIsActive ? ` ${styles.mobileMenuItemActive}` : ""}`;

                if (item.onClick && !item.href) {
                  return (
                    <button
                      key={`mobile-menu-${item.id}`}
                      type="button"
                      className={rowClass}
                      onClick={() => {
                        item.onClick?.();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <span className={styles.mobileMenuItemIcon}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                }

                if (!item.href) {
                  return null;
                }

                return renderLink({
                  key: `mobile-menu-${item.id}`,
                  href: item.href,
                  className: rowClass,
                  ariaLabel: item.label,
                  children: (
                    <>
                      <span className={styles.mobileMenuItemIcon}>{item.icon}</span>
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
