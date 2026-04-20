"use client";

import { useCallback, useEffect, useRef } from "react";

let permissionRequested = false;

function requestNotificationPermission() {
  if (permissionRequested) {
    return;
  }
  permissionRequested = true;

  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }
  if (Notification.permission === "default") {
    void Notification.requestPermission();
  }
}

function canSendNotification() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted" &&
    document.visibilityState !== "visible"
  );
}

export function useHandoffNotifications() {
  const previousPendingIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const notifyNewPendingHandoffs = useCallback(
    (pendingRequestIds: string[]) => {
      const currentIds = new Set(pendingRequestIds);
      const previousIds = previousPendingIdsRef.current;

      if (!initializedRef.current) {
        initializedRef.current = true;
        previousPendingIdsRef.current = currentIds;
        return;
      }

      const newIds = pendingRequestIds.filter((id) => !previousIds.has(id));
      previousPendingIdsRef.current = currentIds;

      if (newIds.length === 0) {
        return;
      }

      if (!canSendNotification()) {
        return;
      }

      const body =
        newIds.length === 1
          ? "A new customer handoff is waiting in the pending queue."
          : `${newIds.length} new customer handoffs are waiting in the pending queue.`;

      try {
        const notification = new Notification("Ava — New Handoff", {
          body,
          icon: "/images/aveyo-icon.svg",
          tag: "ava-pending-handoff"
        });
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch {
        // Notifications may not be supported in some contexts.
      }
    },
    []
  );

  return { notifyNewPendingHandoffs };
}
