'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { analytics, trackPageView } from '@/lib/analytics';

const CLICK_DEDUPE_WINDOW_MS = 600;

function sanitizeLabel(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }

  if (normalized.includes('@')) {
    return 'redacted';
  }

  return normalized.slice(0, 80);
}

function isExcludedElement(element: HTMLElement) {
  const tag = element.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'option') {
    return true;
  }

  if (element.isContentEditable) {
    return true;
  }

  return false;
}

function getClickableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  if (isExcludedElement(target)) {
    return null;
  }

  const clickable = target.closest<HTMLElement>('a,button,[role="button"],[data-track-click],summary');
  if (!clickable) {
    return null;
  }

  if (isExcludedElement(clickable)) {
    return null;
  }

  return clickable;
}

function getElementType(element: HTMLElement) {
  const tag = element.tagName.toLowerCase();
  const role = element.getAttribute('role');

  if (role === 'button') {
    return 'button';
  }

  return tag;
}

function getTrackingTarget(element: HTMLElement) {
  if (element.id) {
    return `id:${element.id}`;
  }

  const testId = element.getAttribute('data-testid');
  if (testId) {
    return `testid:${testId}`;
  }

  const ariaLabel = sanitizeLabel(element.getAttribute('aria-label'));
  if (ariaLabel) {
    return `aria:${ariaLabel}`;
  }

  const text = sanitizeLabel(element.textContent);
  if (text) {
    return `text:${text}`;
  }

  return 'unknown';
}

export default function UserTracking() {
  const pathname = usePathname();
  const { user, role, userType, customerPortalView } = useAuth();
  const lastIdentitySignatureRef = useRef<string>('');
  const lastClickSignatureRef = useRef<{ signature: string; timestamp: number } | null>(null);

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!user?.id) {
      lastIdentitySignatureRef.current = '';
      return;
    }

    const signature = [
      user.id,
      role,
      userType,
      customerPortalView?.impersonationActive ? 'impersonating' : 'direct',
      customerPortalView?.effectiveCustomerEmail ?? ''
    ].join(':');

    if (lastIdentitySignatureRef.current === signature) {
      return;
    }

    lastIdentitySignatureRef.current = signature;

    analytics.userContext(user.id, user.email, {
      role,
      userType,
      impersonationActive: Boolean(customerPortalView?.impersonationActive),
      impersonatedCustomer: customerPortalView?.effectiveCustomerEmail
    });
  }, [customerPortalView?.effectiveCustomerEmail, customerPortalView?.impersonationActive, role, user?.email, user?.id, userType]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (event.button !== 0) {
        return;
      }

      const clickable = getClickableTarget(event.target);
      if (!clickable) {
        return;
      }

      const hrefRaw = clickable.getAttribute('href');
      const href = hrefRaw ? hrefRaw.split('?')[0].slice(0, 120) : undefined;
      const label =
        sanitizeLabel(clickable.getAttribute('aria-label')) ||
        sanitizeLabel(clickable.textContent) ||
        undefined;
      const target = getTrackingTarget(clickable);
      const elementType = getElementType(clickable);
      const signature = `${pathname}:${elementType}:${target}:${href ?? ''}`;
      const now = Date.now();
      const previous = lastClickSignatureRef.current;

      if (previous && previous.signature === signature && now - previous.timestamp < CLICK_DEDUPE_WINDOW_MS) {
        return;
      }

      lastClickSignatureRef.current = { signature, timestamp: now };

      analytics.uiClick({
        pathname,
        elementType,
        target,
        label,
        href
      });
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [pathname]);

  return null;
}
