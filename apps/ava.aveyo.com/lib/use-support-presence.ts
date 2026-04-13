"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getSupportPresenceApi,
  heartbeatSupportPresenceApi,
  setSupportPresenceOfflineApi,
  setSupportPresenceOnlineApi
} from "@/lib/dashboard-api";
import { type PlatformAuthSession } from "@/lib/auth/use-auth-session";

const PRESENCE_HEARTBEAT_INTERVAL_MS = 25_000;

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export function useSupportPresence(authSession: PlatformAuthSession) {
  const [isOnline, setIsOnline] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const applyPresenceStatus = useCallback((status: "online" | "offline") => {
    setIsOnline(status === "online");
  }, []);

  const loadPresence = useCallback(async () => {
    if (!authSession.authenticated) {
      setIsOnline(false);
      return;
    }

    const current = await getSupportPresenceApi();
    applyPresenceStatus(current.status);

    // If the agent previously opted in to online status, revive the heartbeat immediately on load.
    if (current.status === "offline" && current.desiredStatus === "online") {
      const refreshed = await heartbeatSupportPresenceApi();
      applyPresenceStatus(refreshed.status);
    }
  }, [applyPresenceStatus, authSession.authenticated]);

  useEffect(() => {
    if (authSession.loading) {
      return;
    }

    let cancelled = false;
    const syncPresence = async () => {
      if (!authSession.authenticated) {
        setIsOnline(false);
        return;
      }

      try {
        await loadPresence();
      } catch {
        if (!cancelled) {
          setIsOnline(false);
        }
      }
    };

    void syncPresence();
    return () => {
      cancelled = true;
    };
  }, [authSession.authenticated, authSession.loading, authSession.user?.id, loadPresence]);

  const setPresenceOnline = useCallback(
    async (nextOnline: boolean) => {
      if (!authSession.authenticated) {
        setIsOnline(false);
        return;
      }

      setSyncing(true);
      try {
        const result = nextOnline
          ? await setSupportPresenceOnlineApi()
          : await setSupportPresenceOfflineApi();
        applyPresenceStatus(result.status);
      } catch (error) {
        throw new Error(
          toErrorMessage(
            error,
            nextOnline
              ? "Unable to set support presence online."
              : "Unable to set support presence offline."
          )
        );
      } finally {
        setSyncing(false);
      }
    },
    [applyPresenceStatus, authSession.authenticated]
  );

  const toggleOnline = useCallback(async () => {
    await setPresenceOnline(!isOnline);
  }, [isOnline, setPresenceOnline]);

  useEffect(() => {
    if (!authSession.authenticated || !isOnline) {
      return;
    }

    let cancelled = false;
    const sendHeartbeat = async () => {
      try {
        const result = await heartbeatSupportPresenceApi();
        if (!cancelled) {
          applyPresenceStatus(result.status);
        }
      } catch {
        // Avoid forcing a UI flip here; status naturally expires server-side if heartbeats stop.
      }
    };

    void sendHeartbeat();
    const intervalId = window.setInterval(() => {
      void sendHeartbeat();
    }, PRESENCE_HEARTBEAT_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [applyPresenceStatus, authSession.authenticated, isOnline]);

  return {
    isOnline,
    syncing,
    toggleOnline,
    setPresenceOnline
  };
}

