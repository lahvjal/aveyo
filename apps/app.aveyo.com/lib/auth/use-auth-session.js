"use client";

import {
  createPlatformSessionStore,
  normalizePlatformSessionPayload
} from "@ava/auth";
import { usePlatformSessionStore } from "@ava/auth/react";
import { fetchAuthSession } from "./session";

const defaultSession = {
  loading: true,
  authenticated: false,
  userType: "unknown",
  role: "unknown",
  access: null,
  user: null
};

function toSessionState(payload, requestOk) {
  const normalizedPayload = normalizePlatformSessionPayload(payload);
  if (!requestOk || !normalizedPayload?.authenticated) {
    return {
      loading: false,
      authenticated: false,
      userType: normalizedPayload?.userType ?? "unknown",
      role: normalizedPayload?.role ?? "unknown",
      access: normalizedPayload?.access ?? null,
      user: normalizedPayload?.user ?? null
    };
  }

  return {
    loading: false,
    authenticated: true,
    userType: normalizedPayload.userType,
    role: normalizedPayload.role,
    access: normalizedPayload.access,
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
