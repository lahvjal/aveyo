"use client";

import {
  createPlatformSessionStore,
  normalizePlatformSessionPayload,
  type PlatformSessionUser
} from "@ava/auth";
import { usePlatformSessionStore } from "@ava/auth/react";
import { fetchAuthSession } from "./session";

export interface PlatformAuthSession {
  loading: boolean;
  authenticated: boolean;
  role: string;
  user: PlatformSessionUser | null;
}

const defaultSession: PlatformAuthSession = {
  loading: true,
  authenticated: false,
  role: "unknown",
  user: null
};

function toSessionState(payload: unknown, requestOk: boolean): PlatformAuthSession {
  const normalizedPayload = normalizePlatformSessionPayload(payload);
  if (!requestOk || !normalizedPayload?.authenticated) {
    return {
      loading: false,
      authenticated: false,
      role: normalizedPayload?.role ?? "unknown",
      user: normalizedPayload?.user ?? null
    };
  }

  return {
    loading: false,
    authenticated: true,
    role: normalizedPayload.role,
    user: normalizedPayload.user
  };
}

const sessionStore = createPlatformSessionStore({
  initialSnapshot: defaultSession,
  shouldPoll(currentSession) {
    return currentSession.authenticated;
  },
  async loadSnapshot() {
    try {
      const result = await fetchAuthSession();
      return toSessionState(result.payload, result.ok);
    } catch {
      return toSessionState(null, false);
    }
  }
});

export function useAuthSession() {
  return usePlatformSessionStore(sessionStore);
}
