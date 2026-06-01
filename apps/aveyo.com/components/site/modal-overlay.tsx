"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalOverlayProps {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  describedBy?: string;
  closeOnBackdrop?: boolean;
  children: ReactNode;
}

export function ModalOverlay({
  open,
  onClose,
  labelledBy,
  describedBy,
  closeOnBackdrop = true,
  children
}: ModalOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[#0A1628]/72 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      <div
        className="relative z-[1] w-full max-h-[calc(100vh-2rem)] overflow-y-auto animate-[siteModalIn_180ms_ease-out]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
