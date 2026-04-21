'use client';

import { useRouter } from 'next/navigation';
import { AdminCustomerViewPicker } from '@/components/layout/AdminCustomerViewPicker';
import { useAuth } from '@/context/AuthContext';
import { useProjects } from '@/context/ProjectsContext';

/**
 * Full-width internal tools strip for admins (customer preview).
 * Styling uses CSS variables from `customer-design-system.ts` (sourced from `aveyo.com/design-system.json`).
 */
export function AdminInternalViewBar() {
  const router = useRouter();
  const { customerPortalView, refreshSession } = useAuth();
  const { refreshProjects } = useProjects();

  if (!customerPortalView?.canImpersonate) {
    return null;
  }

  const active =
    Boolean(customerPortalView.impersonationActive) &&
    Boolean(customerPortalView.effectiveCustomerEmail?.trim());

  const handleExitCustomerView = async () => {
    try {
      await fetch('/api/customer-portal/impersonation', {
        method: 'DELETE',
        credentials: 'include'
      });
      await refreshSession();
      await refreshProjects();
      router.push('/dashboard');
    } catch (error) {
      console.error('Unable to end customer portal view:', error);
    }
  };

  return (
    <div
      role="region"
      aria-label="Internal tools — customer preview"
      className="sticky top-0 z-40 border-b border-[var(--customer-internal-bar-divider)] bg-[var(--customer-internal-bar-bg)] shadow-[0_1px_0_rgba(10,22,40,0.04)]"
    >
      <div className="mx-auto flex w-full max-w-[var(--customer-layout-content-max)] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-5 sm:py-3.5 lg:px-[var(--customer-space-shell-gutter)]">
        <div className="flex min-w-0 flex-1 items-stretch gap-3 sm:items-center">
          <div
            className="hidden w-1 shrink-0 self-stretch rounded-full sm:block sm:min-h-[2.75rem]"
            style={{ background: 'var(--customer-internal-bar-strip)' }}
            aria-hidden
          />
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-[var(--customer-internal-bar-badge-bg)] px-[var(--customer-space-btn-horiz)] py-1.5 text-[length:var(--customer-font-h7)] font-extrabold uppercase tracking-[0.06em] text-[var(--customer-internal-bar-badge-fg)]">
                Internal
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              {active ? (
                <p className="max-w-full text-[length:var(--customer-font-paragraph)] leading-snug text-[var(--customer-internal-bar-body)] sm:max-w-[min(320px,42vw)]">
                  <span className="font-semibold text-[var(--customer-internal-bar-title)]">Preview</span>
                  <span className="text-[var(--customer-internal-bar-body)]"> — signed in as </span>
                  <span className="break-all font-medium text-[var(--customer-internal-bar-title)]">
                    {customerPortalView.effectiveCustomerEmail}
                  </span>
                </p>
              ) : (
                <p className="shrink-0 text-[length:var(--customer-font-paragraph)] leading-snug text-[var(--customer-internal-bar-body)]">
                  Search by name or email, then select a customer to load their portal.
                </p>
              )}
              <AdminCustomerViewPicker layout="bar" />
            </div>
          </div>
        </div>
        {active ? (
          <div className="flex shrink-0 items-center justify-end border-t border-[var(--customer-internal-bar-divider)] pt-3 sm:border-t-0 sm:pt-0">
            <button
              type="button"
              onClick={() => void handleExitCustomerView()}
              className="w-full rounded-[var(--customer-radius-button)] border border-[var(--customer-internal-bar-badge-bg)] bg-[var(--customer-internal-bar-badge-bg)] px-[var(--customer-space-btn-horiz)] py-[var(--customer-space-btn-vert)] text-center text-[length:var(--customer-font-h7)] font-semibold text-[var(--customer-internal-bar-badge-fg)] transition-opacity hover:opacity-90 sm:w-auto"
            >
              Stop preview
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
