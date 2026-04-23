"use client";

import { useEffect } from "react";
import {
  fetchAuthSession,
  type PlatformAccessContext,
  type PlatformSessionUser
} from "./session";
import {
  createPlatformSessionStore,
  normalizePlatformSessionPayload,
  type PlatformSessionPayload,
  type PlatformUserType
} from "@ava/auth";
import { usePlatformSessionStore } from "@ava/auth/react";

export interface PlatformAuthSession {
  loading: boolean;
  authenticated: boolean;
  role: string;
  userType: PlatformUserType;
  user: PlatformSessionUser | null;
  access: PlatformAccessContext | null;
}

const defaultSession: PlatformAuthSession = {
  loading: true,
  authenticated: false,
  role: "unknown",
  userType: "unknown",
  user: null,
  access: null
};

const sessionPollIntervalMs = 30000;
const transientAuthFailureGraceMs = 5000;
const LOCAL_HOST_PATTERN =
  /^(localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2}|0\.0\.0\.0|::1|.+\.local)$/i;
let parentSnapshotBridgeUsers = 0;
let lastConfirmedAuthenticatedAt = 0;

interface AuthSessionSnapshotMessageData {
  source?: string;
  type?: string;
  payload?: unknown;
}

function toSessionState(
  payload: PlatformSessionPayload | null | undefined,
  requestOk: boolean
): PlatformAuthSession {
  const normalizedPayload = payload ? normalizePlatformSessionPayload(payload) : null;
  if (!requestOk || !normalizedPayload?.authenticated) {
    return {
      loading: false,
      authenticated: false,
      role: normalizedPayload?.role ?? "unknown",
      userType: normalizedPayload?.userType ?? "unknown",
      user: normalizedPayload?.user ?? null,
      access: normalizedPayload?.access ?? null
    };
  }

  return {
    loading: false,
    authenticated: true,
    role: normalizedPayload.role,
    userType: normalizedPayload.userType,
    user: normalizedPayload.user,
    access: normalizedPayload.access
  };
}

function preserveRecentAuthenticatedSession(previousSession: PlatformAuthSession) {
  return {
    ...previousSession,
    loading: false
  };
}

function shouldGracefullyRetainAuthenticatedSession(
  previousSession: PlatformAuthSession,
  payload: PlatformSessionPayload | null | undefined,
  requestOk: boolean
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

  const normalizedPayload = payload ? normalizePlatformSessionPayload(payload) : null;
  const failureReason = normalizedPayload?.failure?.reason;

  return (
    !failureReason ||
    failureReason === "missing_access_token" ||
    failureReason === "invalid_access_token" ||
    failureReason === "refresh_failed" ||
    failureReason === "refreshed_access_token_invalid"
  );
}

function isTrustedParentOrigin(origin: string) {
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.trim().toLowerCase();
    if (!host) {
      return false;
    }
    if (host === "aveyo.com" || host.endsWith(".aveyo.com")) {
      return true;
    }
    if (host === "::1") {
      return true;
    }
    return LOCAL_HOST_PATTERN.test(host);
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

const sessionStore = createPlatformSessionStore({
  initialSnapshot: defaultSession,
  pollIntervalMs: sessionPollIntervalMs,
  shouldPoll(currentSession) {
    return currentSession.authenticated;
  },
  async loadSnapshot(previousSession) {
    try {
      const result = await fetchAuthSession();
      const nextSession = toSessionState(result.payload, result.ok);
      if (nextSession.authenticated) {
        lastConfirmedAuthenticatedAt = Date.now();
        return nextSession;
      }
      if (shouldGracefullyRetainAuthenticatedSession(previousSession, result.payload, result.ok)) {
        return preserveRecentAuthenticatedSession(previousSession);
      }
      return nextSession;
    } catch {
      if (shouldGracefullyRetainAuthenticatedSession(previousSession, null, false)) {
        return preserveRecentAuthenticatedSession(previousSession);
      }
      return toSessionState(null, false);
    }
  }
});

function onParentSessionMessage(event: MessageEvent) {
  if (!isTrustedParentOrigin(event.origin)) {
    return;
  }

  if (!event.data || typeof event.data !== "object") {
    return;
  }

  const data = event.data as AuthSessionSnapshotMessageData;
  if (data.source !== "aveyo-host" || data.type !== "auth-session-snapshot") {
    return;
  }

  const payload = normalizePlatformSessionPayload(data.payload);
  if (!payload) {
    return;
  }

  if (payload.authenticated) {
    lastConfirmedAuthenticatedAt = Date.now();
  }
  sessionStore.setSnapshot(toSessionState(payload, payload.authenticated));
}

function startParentSnapshotBridge() {
  if (typeof window === "undefined") {
    return;
  }

  parentSnapshotBridgeUsers += 1;
  if (parentSnapshotBridgeUsers !== 1) {
    return;
  }

  window.addEventListener("message", onParentSessionMessage);
  window.addEventListener("focus", requestParentSessionSnapshot);
  requestParentSessionSnapshot();
}

function stopParentSnapshotBridge() {
  if (typeof window === "undefined" || parentSnapshotBridgeUsers === 0) {
    return;
  }

  parentSnapshotBridgeUsers -= 1;
  if (parentSnapshotBridgeUsers > 0) {
    return;
  }

  window.removeEventListener("message", onParentSessionMessage);
  window.removeEventListener("focus", requestParentSessionSnapshot);
}

export function useAuthSession() {
  const session = usePlatformSessionStore(sessionStore);

  useEffect(() => {
    startParentSnapshotBridge();
    return () => {
      stopParentSnapshotBridge();
    };
  }, []);

  return session;
}
