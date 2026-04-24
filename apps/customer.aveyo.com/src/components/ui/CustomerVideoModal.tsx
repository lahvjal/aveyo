'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';

interface CustomerVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  videoSrc: string;
  closeLabel?: string;
  eyebrow?: string;
  footer?: ReactNode;
  autoPlay?: boolean;
}

export default function CustomerVideoModal({
  isOpen,
  onClose,
  title,
  description,
  videoSrc,
  closeLabel = 'Close',
  eyebrow,
  footer,
  autoPlay = false
}: CustomerVideoModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[var(--customer-radius-card)] bg-white shadow-[var(--customer-shadow-panel)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[var(--customer-color-text-muted)] transition-colors hover:text-[var(--customer-color-text-primary)]"
          aria-label="Close video"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="flex max-h-[90vh] flex-col overflow-y-auto">
          <div className="border-b border-[var(--customer-color-border-muted)] px-6 py-5 pr-14 sm:px-8">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--customer-color-action)]">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="mt-2 text-[length:var(--customer-font-h5)] font-extrabold tracking-[-0.03em] text-[var(--customer-color-text-primary)]">
              {title}
            </h2>
            {description ? (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--customer-color-text-subtle)] sm:text-base">
                {description}
              </p>
            ) : null}
          </div>

          <div className="bg-[var(--customer-color-text-primary)] p-4 sm:p-6">
            <div className="overflow-hidden rounded-[var(--customer-radius-card)] bg-black">
              <video
                key={videoSrc}
                className="aspect-video w-full bg-black"
                src={videoSrc}
                controls
                playsInline
                preload="metadata"
                autoPlay={autoPlay}
              >
                Your browser does not support embedded video playback.
              </video>
            </div>
          </div>

          <div className="border-t border-[var(--customer-color-border-muted)] px-6 py-4 sm:px-8">
            {footer ?? (
              <button
                type="button"
                className="brand-button inline-flex items-center justify-center px-5 py-3 text-sm"
                onClick={onClose}
              >
                {closeLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
