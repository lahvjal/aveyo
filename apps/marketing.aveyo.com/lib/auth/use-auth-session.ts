"use client";

import {
  createPlatformSessionStore,
  DEFAULT_PLATFORM_SESSION_ACCESS,
  normalizePlatformSessionPayload,
  type PlatformSessionAccess,
  type PlatformSessionUser,
  type PlatformUserType
} from "@ava/auth";
import { usePlatformSessionStore } from "@ava/auth/react";
import {
  fetchAuthSession
} from "./session";

const defaultAccess = DEFAULT_PLATFORM_SESSION_ACCESS as PlatformSessionAccess;

export interface PlatformAuthSession {
  loading: boolean;
  authenticated: boolean;
  role: string;
  userType: PlatformUserType;
  access: PlatformSessionAccess;
  user: PlatformSessionUser | null;
}

const defaultSession: PlatformAuthSession = {
  loading: true,
  authenticated: false,
  role: "unknown",
  userType: "unknown",
  access: defaultAccess,
  user: null
};

function toSessionState(payload: unknown, requestOk: boolean): PlatformAuthSession {
  const normalizedPayload = normalizePlatformSessionPayload(payload);
  if (!requestOk || !normalizedPayload?.authenticated) {
    return {
      loading: false,
      authenticated: false,
      role: normalizedPayload?.role ?? "unknown",
      userType: normalizedPayload?.userType ?? "unknown",
      access: normalizedPayload?.access ?? defaultAccess,
      user: normalizedPayload?.user ?? null
    };
  }

  return {
    loading: false,
    authenticated: true,
    role: normalizedPayload.role,
    userType: normalizedPayload.userType,
    access: normalizedPayload.access,
    user: normalizedPayload.user
  };
}

const sessionStore = createPlatformSessionStore({
  initialSnapshot: defaultSession,
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
