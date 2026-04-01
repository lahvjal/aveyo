"use client";

import { useEffect, useState } from "react";
import {
  createSignedOutSnapshot,
  normalizeHostSessionSnapshot,
  resolveDefaultApiBaseUrl
} from "../session";
import type { HostSessionSnapshot, HostSessionUser, HostUserType } from "../types";

export interface WidgetAuthSession {
  loading: boolean;
  authenticated: boolean;
  role: string;
  userType: HostUserType;
  user: HostSessionUser | null;
}

interface UseWidgetAuthSessionOptions {
  apiBaseUrl?: string;
  pollIntervalMs?: number;
  sessionSnapshot?: HostSessionSnapshot | null;
}

const DEFAULT_POLL_INTERVAL_MS = 30000;

const loadingSession: WidgetAuthSession = {
  loading: true,
  authenticated: false,
  role: "unknown",
  userType: "unknown",
  user: null
};

function toSession(snapshot: HostSessionSnapshot): WidgetAuthSession {
  return {
    loading: false,
    authenticated: snapshot.authenticated,
    role: snapshot.role,
    userType: snapshot.userType,
    user: snapshot.user
  };
}

function toSignedOutSession(): WidgetAuthSession {
  return toSession(createSignedOutSnapshot());
}

export function useWidgetAuthSession({
  apiBaseUrl,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  sessionSnapshot
}: UseWidgetAuthSessionOptions = {}): WidgetAuthSession {
  const [session, setSession] = useState<WidgetAuthSession>(() => {
    if (sessionSnapshot) {
      return toSession(sessionSnapshot);
    }
    if (sessionSnapshot === null) {
      return toSignedOutSession();
    }
    return loadingSession;
  });

  useEffect(() => {
    if (sessionSnapshot) {
      setSession(toSession(sessionSnapshot));
      return;
    }
    if (sessionSnapshot === null) {
      setSession(toSignedOutSession());
    }
  }, [sessionSnapshot]);

  useEffect(() => {
    if (sessionSnapshot !== undefined) {
      return;
    }

    let cancelled = false;
    const resolvedApiBaseUrl = apiBaseUrl ?? resolveDefaultApiBaseUrl();
    if (!resolvedApiBaseUrl) {
      setSession(toSignedOutSession());
      return;
    }

    const loadSession = async () => {
      try {
        const response = await fetch(`${resolvedApiBaseUrl}/api/auth/session`, {
          method: "GET",
          credentials: "include",
          cache: "no-store"
        });
        const payload = await response.json().catch(() => null);
        if (cancelled) {
          return;
        }

        const normalized = normalizeHostSessionSnapshot(payload);
        if (normalized) {
          setSession(toSession(normalized));
          return;
        }

        if (response.status === 401) {
          setSession(toSignedOutSession());
          return;
        }
        setSession(toSignedOutSession());
      } catch {
        if (!cancelled) {
          setSession(toSignedOutSession());
        }
      }
    };

    void loadSession();
    const intervalId = window.setInterval(() => {
      void loadSession();
    }, pollIntervalMs);

    const onFocus = () => {
      void loadSession();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [apiBaseUrl, pollIntervalMs, sessionSnapshot]);

  return session;
}
