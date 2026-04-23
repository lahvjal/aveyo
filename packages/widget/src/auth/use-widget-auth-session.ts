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
const PARENT_SESSION_RESPONSE_WAIT_MS = 750;
const transientAuthFailureGraceMs = 5000;
const LOCAL_HOST_PATTERN =
  /^(localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2}|0\.0\.0\.0|::1|.+\.localhost|.+\.local)$/i;
const RETRYABLE_AUTH_FAILURE_REASONS = new Set([
  "missing_access_token",
  "invalid_access_token",
  "refresh_failed",
  "refreshed_access_token_invalid"
]);
let lastConfirmedAuthenticatedAt = 0;

interface HostSessionSnapshotMessageData {
  source?: string;
  type?: string;
  payload?: unknown;
}

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

function preserveRecentAuthenticatedSession(
  previousSession: WidgetAuthSession
): WidgetAuthSession {
  return {
    ...previousSession,
    loading: false
  };
}

function readFailureReason(response: Response, payload: unknown) {
  const headerReason = response.headers.get("x-ava-auth-reason")?.trim();
  if (headerReason) {
    return headerReason;
  }

  if (!payload || typeof payload !== "object" || !("failure" in payload)) {
    return undefined;
  }

  const failure = (payload as { failure?: unknown }).failure;
  if (!failure || typeof failure !== "object" || !("reason" in failure)) {
    return undefined;
  }

  const reason = (failure as { reason?: unknown }).reason;
  return typeof reason === "string" && reason.trim() ? reason.trim() : undefined;
}

function shouldGracefullyRetainAuthenticatedSession(
  previousSession: WidgetAuthSession,
  requestOk: boolean,
  failureReason?: string
) {
  if (!previousSession.authenticated) {
    return false;
  }

  if (Date.now() - lastConfirmedAuthenticatedAt > transientAuthFailureGraceMs) {
    return false;
  }

  if (requestOk) {
    return false;
  }

  return !failureReason || RETRYABLE_AUTH_FAILURE_REASONS.has(failureReason);
}

function isTrustedParentOrigin(origin: string) {
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.trim().toLowerCase();
    if (!host) {
      return false;
    }
    return host === "aveyo.com" || host.endsWith(".aveyo.com") || LOCAL_HOST_PATTERN.test(host);
  } catch {
    return false;
  }
}

function requestParentSessionSnapshot() {
  if (typeof window === "undefined" || window.parent === window) {
    return;
  }

  window.parent.postMessage(
    {
      source: "ava-widget",
      type: "request-auth-session"
    },
    "*"
  );
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
  const [hasParentSnapshot, setHasParentSnapshot] = useState(false);

  useEffect(() => {
    if (sessionSnapshot) {
      if (sessionSnapshot.authenticated) {
        lastConfirmedAuthenticatedAt = Date.now();
      }
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
    if (typeof window === "undefined" || window.parent === window) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window.parent || !isTrustedParentOrigin(event.origin)) {
        return;
      }
      if (!event.data || typeof event.data !== "object") {
        return;
      }

      const data = event.data as HostSessionSnapshotMessageData;
      if (data.source !== "aveyo-host" || data.type !== "auth-session-snapshot") {
        return;
      }

      const normalized = normalizeHostSessionSnapshot(data.payload);
      if (!normalized) {
        return;
      }

      if (normalized.authenticated) {
        lastConfirmedAuthenticatedAt = Date.now();
      }
      setHasParentSnapshot(true);
      setSession(toSession(normalized));
    };

    const onFocus = () => {
      requestParentSessionSnapshot();
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener("focus", onFocus);
    requestParentSessionSnapshot();

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("focus", onFocus);
    };
  }, [sessionSnapshot]);

  useEffect(() => {
    if (sessionSnapshot !== undefined) {
      return;
    }

    let cancelled = false;
    let fallbackTimerId: number | null = null;
    let intervalId: number | null = null;
    let onFocus: (() => void) | null = null;
    const isEmbedded = typeof window !== "undefined" && window.parent !== window;
    const resolvedApiBaseUrl = apiBaseUrl ?? resolveDefaultApiBaseUrl();

    const loadSession = async () => {
      if (!resolvedApiBaseUrl) {
        setSession(toSignedOutSession());
        return;
      }

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
          if (normalized.authenticated) {
            lastConfirmedAuthenticatedAt = Date.now();
            setSession(toSession(normalized));
            return;
          }
        }

        const failureReason = readFailureReason(response, payload);
        setSession((previousSession) => {
          if (
            shouldGracefullyRetainAuthenticatedSession(
              previousSession,
              response.ok,
              failureReason
            )
          ) {
            return preserveRecentAuthenticatedSession(previousSession);
          }

          if (normalized) {
            return toSession(normalized);
          }

          return toSignedOutSession();
        });
      } catch {
        if (!cancelled) {
          setSession((previousSession) => {
            if (shouldGracefullyRetainAuthenticatedSession(previousSession, false)) {
              return preserveRecentAuthenticatedSession(previousSession);
            }
            return toSignedOutSession();
          });
        }
      }
    };

    const startDirectSessionSync = () => {
      if (hasParentSnapshot) {
        return;
      }

      void loadSession();
      intervalId = window.setInterval(() => {
        void loadSession();
      }, pollIntervalMs);

      onFocus = () => {
        void loadSession();
      };
      window.addEventListener("focus", onFocus);
    };

    if (isEmbedded) {
      fallbackTimerId = window.setTimeout(() => {
        if (!cancelled && !hasParentSnapshot) {
          startDirectSessionSync();
        }
      }, PARENT_SESSION_RESPONSE_WAIT_MS);
    } else {
      startDirectSessionSync();
    }

    return () => {
      cancelled = true;
      if (fallbackTimerId !== null) {
        window.clearTimeout(fallbackTimerId);
      }
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      if (onFocus) {
        window.removeEventListener("focus", onFocus);
      }
    };
  }, [apiBaseUrl, hasParentSnapshot, pollIntervalMs, sessionSnapshot]);

  return session;
}
