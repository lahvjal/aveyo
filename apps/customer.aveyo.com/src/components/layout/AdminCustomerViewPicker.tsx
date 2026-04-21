'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useProjects } from '@/context/ProjectsContext';

type SearchHit = { email: string; label: string };

export type AdminCustomerViewPickerLayout = 'default' | 'bar';

interface AdminCustomerViewPickerProps {
  /** `bar`: compact row for {@link AdminInternalViewBar}; `default`: stacked label + field */
  layout?: AdminCustomerViewPickerLayout;
}

export function AdminCustomerViewPicker({ layout = 'default' }: AdminCustomerViewPickerProps) {
  const router = useRouter();
  const { customerPortalView, refreshSession } = useAuth();
  const { refreshProjects } = useProjects();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveEmail = customerPortalView?.effectiveCustomerEmail ?? null;

  useEffect(() => {
    setQuery(effectiveEmail ?? '');
  }, [effectiveEmail]);

  useEffect(() => {
    if (!open) {
      setHits([]);
    }
  }, [open]);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `/api/customer-portal/customer-search?q=${encodeURIComponent(trimmed)}`,
        { credentials: 'include', cache: 'no-store' }
      );
      const payload = (await response.json().catch(() => null)) as { customers?: SearchHit[] } | null;
      if (!response.ok) {
        setHits([]);
        return;
      }
      setHits(Array.isArray(payload?.customers) ? payload!.customers! : []);
      setHighlightIndex(0);
    } catch {
      setHits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      void runSearch(query);
    }, 280);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [open, query, runSearch]);

  useEffect(() => {
    const onDocMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery(effectiveEmail ?? '');
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [effectiveEmail]);

  const selectCustomer = async (email: string) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/customer-portal/impersonation', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerEmail: email })
      });
      if (!response.ok) {
        const errBody = (await response.json().catch(() => null)) as { error?: string } | null;
        console.error(
          '[AdminCustomerViewPicker] impersonation POST failed:',
          response.status,
          typeof errBody?.error === 'string' ? errBody.error : errBody
        );
        return;
      }
      console.log('[AdminCustomerViewPicker] impersonation POST ok for:', email);
      await refreshSession();
      await refreshProjects();
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  if (!customerPortalView?.canImpersonate) {
    return null;
  }

  const isBar = layout === 'bar';
  const fieldClassName = isBar
    ? 'w-full min-w-0 rounded-[var(--customer-radius-field)] border border-[var(--customer-internal-bar-input-border)] bg-[var(--customer-internal-bar-input-bg)] px-3 py-2 text-[length:var(--customer-font-paragraph)] text-[var(--customer-internal-bar-title)] shadow-sm outline-none ring-0 placeholder:text-[var(--customer-color-text-muted)] focus:border-[var(--customer-internal-bar-input-focus)] focus:ring-1 focus:ring-[var(--customer-internal-bar-input-focus)]'
    : 'w-full rounded-lg border border-[var(--customer-color-border)] bg-white px-3 py-2 text-sm text-[var(--customer-color-text-primary)] shadow-sm outline-none ring-0 placeholder:text-[var(--customer-color-text-muted)] focus:border-[var(--customer-color-text-primary)]';

  return (
    <div
      ref={rootRef}
      className={
        isBar
          ? 'relative min-h-[42px] w-full min-w-0 flex-1 sm:max-w-xl lg:max-w-2xl'
          : 'relative w-full min-w-0 max-w-md flex-1 sm:min-w-[260px]'
      }
    >
      <label htmlFor={listId} className="sr-only">
        Find customer to view their portal
      </label>
      <div className={isBar ? 'flex flex-col gap-0' : 'flex flex-col gap-1'}>
        {!isBar ? (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--customer-color-text-subtle)]">
            Customer (internal)
          </span>
        ) : null}
        <input
          id={listId}
          type="search"
          autoComplete="off"
          placeholder="Search by name or email…"
          value={query}
          disabled={submitting}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
              setOpen(true);
              return;
            }
            if (!open) {
              return;
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              setOpen(false);
              setQuery(effectiveEmail ?? '');
              return;
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlightIndex((i) => Math.min(i + 1, Math.max(hits.length - 1, 0)));
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlightIndex((i) => Math.max(i - 1, 0));
            }
            if (e.key === 'Enter' && hits[highlightIndex]) {
              e.preventDefault();
              void selectCustomer(hits[highlightIndex].email);
            }
          }}
          className={fieldClassName}
        />
      </div>

      {open ? (
        <div
          className={`absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-[var(--customer-radius-card)] border border-[var(--customer-color-border)] bg-[var(--customer-color-surface)] py-1 shadow-[var(--customer-shadow-panel)] ${isBar ? 'ring-1 ring-[var(--customer-internal-bar-input-border)]' : ''}`}
          role="listbox"
          aria-label="Matching customers"
        >
          {loading ? (
            <p className="px-3 py-2 text-xs text-[var(--customer-color-text-subtle)]">Searching…</p>
          ) : query.trim().length < 2 ? (
            <p className="px-3 py-2 text-xs text-[var(--customer-color-text-subtle)]">
              Type at least 2 characters to search.
            </p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[var(--customer-color-text-subtle)]">No matches.</p>
          ) : (
            hits.map((hit, index) => (
              <button
                key={hit.email}
                type="button"
                role="option"
                aria-selected={index === highlightIndex}
                className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-[var(--customer-color-surface-muted)] ${
                  index === highlightIndex ? 'bg-[var(--customer-color-surface-muted)]' : ''
                }`}
                onMouseEnter={() => setHighlightIndex(index)}
                onClick={() => void selectCustomer(hit.email)}
              >
                <span className="font-medium text-[var(--customer-color-text-primary)]">{hit.label}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
