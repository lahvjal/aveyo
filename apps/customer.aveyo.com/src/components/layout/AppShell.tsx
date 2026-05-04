'use client';

import { getAveyoSiteUrl } from '@ava/config/runtime/platform-nav';
import { resolveEnvironment } from '@ava/config/runtime/app-urls';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { CustomerSideNav, type CustomerSideNavItem } from '@ava/ui/shell/customer-side-nav';
import platformSideNavStyles from '@ava/ui/shell/platform-side-nav.module.css';

import type { Project } from '@/types';
import {
  CustomerNavActionsGlyph,
  CustomerNavDashboardGlyph,
  CustomerNavExpectationsGlyph,
  CustomerNavSupportGlyph
} from './customer-nav-icons';
import { AdminInternalViewBar } from './AdminInternalViewBar';
import '@/styles/brand-colors.css';
import { useAuth } from '@/context/AuthContext';
import { useProjects } from '@/context/ProjectsContext';
import { analytics } from '@/lib/analytics';

interface AppShellProps {
  children: ReactNode;
}

function initialMarketingEnvironment(): 'local' | 'dev' | 'staging' | 'prod' {
  if (process.env.VERCEL_ENV === 'preview' || process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview') {
    return 'staging';
  }
  if (process.env.NODE_ENV === 'production') {
    return 'prod';
  }
  return 'local';
}

function toTitleCase(value: string) {
  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function getDisplayName(fullName: string | null | undefined, email: string | null | undefined) {
  if (fullName && fullName.trim()) {
    return fullName.trim();
  }

  if (email) {
    return toTitleCase(email.split('@')[0]);
  }

  return 'Aveyo Customer';
}

function getPreviewCustomerName(project: Project | undefined, fallbackEmail: string | null | undefined) {
  if (project?.customer_name?.trim()) {
    return project.customer_name.trim();
  }

  const rawCustomerName = project?.podio_data?.raw_payload?.['customer-name'];
  if (typeof rawCustomerName === 'string' && rawCustomerName.trim()) {
    return rawCustomerName.trim();
  }

  if (project?.name?.trim()) {
    const projectNameMatch = project.name.match(/^Solar Installation -\s*(.+)$/i);
    if (projectNameMatch?.[1]?.trim()) {
      return projectNameMatch[1].trim();
    }

    return project.name.trim();
  }

  return getDisplayName(null, fallbackEmail);
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function UserAvatar({
  name,
  avatarUrl,
  sizeClass = 'h-12 w-12 text-sm'
}: {
  name: string;
  avatarUrl?: string | null;
  sizeClass?: string;
}) {
  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt={name} className={`${sizeClass} rounded-full object-cover`} />
    );
  }

  const initials = getInitials(name) || 'AC';

  return (
    <div
      className={`flex ${sizeClass} items-center justify-center rounded-full bg-black font-semibold text-white`}
    >
      {initials}
    </div>
  );
}

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut, customerPortalView } = useAuth();
  const { projects, refreshProjects } = useProjects();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [aveyoMarketingHref, setAveyoMarketingHref] = useState(() =>
    getAveyoSiteUrl(initialMarketingEnvironment(), process.env.NEXT_PUBLIC_AVEYO_APP_URL)
  );

  useEffect(() => {
    setAveyoMarketingHref(
      getAveyoSiteUrl(resolveEnvironment(window.location.hostname), process.env.NEXT_PUBLIC_AVEYO_APP_URL)
    );
  }, []);

  const fullName =
    typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null;
  const avatarUrl =
    typeof user?.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null;
  const displayName = getDisplayName(fullName, user?.email ?? null);
  const primaryAddress = projects[0]?.address ?? user?.email ?? 'Your project details';
  const headerDisplayName = useMemo(() => {
    if (!customerPortalView?.impersonationActive) {
      return displayName;
    }

    return getPreviewCustomerName(projects[0], customerPortalView.effectiveCustomerEmail);
  }, [customerPortalView?.effectiveCustomerEmail, customerPortalView?.impersonationActive, displayName, projects]);

  const openAvaChat = useCallback(() => {
    analytics.tabNavigation('support');
    analytics.avaChatOpened('support_tab');

    const avaAuth = typeof window !== 'undefined' ? (window as Window & { AvaAuth?: { open: () => void } }).AvaAuth : undefined;
    if (avaAuth) {
      try {
        avaAuth.open();
      } catch (error) {
        console.error('Error opening Ava chat from sidebar:', error);
      }
    }
  }, []);

  const navItems: CustomerSideNavItem[] = useMemo(
    () => [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: '/dashboard',
        icon: <CustomerNavDashboardGlyph />
      },
      {
        id: 'actions',
        label: 'Actions',
        href: '/actions',
        icon: <CustomerNavActionsGlyph />
      },
      {
        id: 'expectations',
        label: 'Expectations',
        href: '/expectations',
        icon: <CustomerNavExpectationsGlyph />
      },
      {
        id: 'support',
        label: 'Support',
        onClick: openAvaChat,
        icon: <CustomerNavSupportGlyph />
      }
    ],
    [openAvaChat]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refreshProjects();
      router.refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.replace('/login?logout=1');
  };

  const handleNavLinkClick = useCallback((label: string) => {
    analytics.tabNavigation(label.toLowerCase());
  }, []);

  const renderLinkWithAnalytics = useCallback(
    (props: { key: string; href: string; className: string; title?: string; ariaLabel: string; children: ReactNode }) => {
      const { key, href, className, title, ariaLabel, children } = props;
      const layoutClass =
        key === 'customer-brand' ? 'flex min-h-0 min-w-0 flex-1 items-center' : 'block min-w-0';
      const isOutbound = href.startsWith('http://') || href.startsWith('https://');
      return (
        <Link
          key={key}
          href={href}
          className={[className, layoutClass].filter(Boolean).join(' ')}
          title={title}
          aria-label={ariaLabel}
          {...(isOutbound ? { rel: 'noopener noreferrer' } : {})}
          onClick={() => {
            if (key !== 'customer-brand') {
              handleNavLinkClick(ariaLabel);
            }
          }}
        >
          {children}
        </Link>
      );
    },
    [handleNavLinkClick]
  );

  const mobileProfileAvatar = (
    <UserAvatar name={displayName} avatarUrl={avatarUrl} sizeClass="h-6 w-6 min-h-[24px] min-w-[24px] text-[10px]" />
  );

  return (
    <div className="page-background min-h-screen min-[980px]:flex">
      <CustomerSideNav
        className="shrink-0"
        pathname={pathname}
        storageKey="aveyo-customer-side-nav-collapsed"
        brandHref={aveyoMarketingHref}
        brandAriaLabel="Visit aveyo.com"
        defaultCollapsed={false}
        renderWordmark={(collapsed) => (
          <div
            className={`${platformSideNavStyles.wordmark}${collapsed ? ` ${platformSideNavStyles.collapsed}` : ''}`}
            aria-label="Aveyo"
          >
            <img src="/aveyo-logo.svg" alt="Aveyo" className={platformSideNavStyles.wordmarkLogo} />
            <span className={platformSideNavStyles.wordmarkMini} aria-hidden="true">
              <img src="/ava-icon.svg" alt="" className={platformSideNavStyles.wordmarkMiniLogo} />
            </span>
          </div>
        )}
        items={navItems}
        renderLink={renderLinkWithAnalytics}
        onSupportClick={openAvaChat}
        onProfileClick={() => setAccountMenuOpen((open) => !open)}
        profileAvatar={mobileProfileAvatar}
        footer={
          <div className="w-full px-1">
            <div
              className={`${platformSideNavStyles.utilityItem} ${platformSideNavStyles.disabled}`}
              aria-hidden="true"
            >
              <span className={platformSideNavStyles.navIcon}>
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M8 1.75a.75.75 0 0 1 .75.75v.55a4.98 4.98 0 0 1 1.62.67l.39-.39a.75.75 0 0 1 1.06 0l.86.86a.75.75 0 0 1 0 1.06l-.4.39c.3.5.53 1.04.67 1.62h.55a.75.75 0 0 1 .75.75v1.22a.75.75 0 0 1-.75.75h-.55a4.98 4.98 0 0 1-.67 1.62l.4.39a.75.75 0 0 1 0 1.06l-.86.86a.75.75 0 0 1-1.06 0l-.39-.4a4.98 4.98 0 0 1-1.62.67v.55A.75.75 0 0 1 8 14.25h-1.22a.75.75 0 0 1-.75-.75v-.55a4.98 4.98 0 0 1-1.62-.67l-.39.4a.75.75 0 0 1-1.06 0l-.86-.86a.75.75 0 0 1 0-1.06l.4-.39a4.98 4.98 0 0 1-.67-1.62H1.25a.75.75 0 0 1-.75-.75V7.27a.75.75 0 0 1 .75-.75h.55c.14-.58.37-1.12.67-1.62l-.4-.39a.75.75 0 0 1 0-1.06l.86-.86a.75.75 0 0 1 1.06 0l.39.39c.5-.3 1.04-.53 1.62-.67V2.5a.75.75 0 0 1 .75-.75H8Zm-.61 3.75a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span className={platformSideNavStyles.navLabel}>Settings</span>
            </div>

            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                className={platformSideNavStyles.profileRow}
                onClick={() => setAccountMenuOpen((open) => !open)}
              >
                <span className={platformSideNavStyles.profileAvatar} aria-hidden="true">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" />
                  ) : (
                    getInitials(displayName) || 'AC'
                  )}
                </span>
                <span className={platformSideNavStyles.profileCopy}>
                  <strong>{displayName}</strong>
                  <small className="truncate">{primaryAddress}</small>
                </span>
              </button>

              {accountMenuOpen ? (
                <div className="absolute bottom-full left-0 z-20 mb-3 w-full rounded-[var(--customer-radius-card)] border border-[var(--customer-color-border)] bg-white p-4 shadow-[var(--customer-shadow-panel)]">
                  <p className="truncate text-sm font-semibold text-[var(--customer-color-text-primary)]">
                    {displayName}
                  </p>
                  {user?.email ? (
                    <p className="mt-1 truncate text-xs text-[var(--customer-color-text-subtle)]">{user.email}</p>
                  ) : null}
                  <button
                    type="button"
                    className="brand-button-secondary mt-4 w-full px-4 py-3 text-sm"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        }
      />

      <div className="flex min-w-0 flex-1 flex-col pb-[76px] min-[980px]:pb-0">
        <AdminInternalViewBar />

        <div className="customer-shell-mobile-nav border-b border-[var(--customer-color-border)] bg-[var(--customer-color-surface)] px-4 py-4 min-[980px]:hidden">
          <div className="flex items-center justify-between gap-4">
            <Link href={aveyoMarketingHref} rel="noopener noreferrer" aria-label="Visit aveyo.com">
              <img src="/aveyo-logo.svg" alt="Aveyo" className="h-8 w-auto" />
            </Link>
            <button type="button" className="brand-button-secondary px-4 py-2 text-sm" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[var(--customer-layout-content-max)] flex-1 flex-col px-4 py-6 sm:px-6 lg:px-[var(--customer-space-shell-gutter)] lg:py-10">
          <header className="customer-shell-topbar mb-8 flex min-h-[var(--customer-layout-topbar-height)] flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--customer-color-text-subtle)]">Viewing As:</p>
              <h1 className="mt-2 text-[clamp(2.5rem,5vw,var(--customer-font-h3))] font-extrabold tracking-[-0.04em] text-[var(--customer-color-text-primary)]">
                {headerDisplayName}
              </h1>
            </div>

            <div className="flex w-full min-w-0 flex-col gap-3 lg:max-w-xl lg:items-end">
              <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                className="brand-button-secondary inline-flex items-center gap-2 px-5 py-3 text-sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <svg
                  className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M13 4.75V1.75m0 0h-3m3 0L9.75 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13 7.25a5 5 0 1 1-1.46-3.54L13 5.16"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{isRefreshing ? 'Refreshing' : 'Refresh'}</span>
              </button>
              </div>
            </div>
          </header>

          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
