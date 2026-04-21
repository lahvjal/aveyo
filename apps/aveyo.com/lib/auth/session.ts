"use client";

import {
  buildPlatformAuthLoginUrl,
  createPlatformSessionStore,
  fetchPlatformSession,
  normalizePlatformSessionPayload,
  resolvePlatformApiBaseUrl,
  resolvePlatformAppBaseUrl,
  resolvePlatformAuthAppBaseUrl,
  type PlatformSessionAccess,
  type PlatformSessionUser,
  type PlatformUserType
} from "@ava/auth";
import { usePlatformSessionStore } from "@ava/auth/react";
import { resolveAppUrl, resolveEnvironment } from "@ava/config/runtime/app-urls";

export interface MarketingSiteAuthSession {
  loading: boolean;
  authenticated: boolean;
  role: string;
  userType: PlatformUserType;
  access: PlatformSessionAccess | null;
  user: PlatformSessionUser | null;
}

function resolveRuntimeAppUrl(appId: "api" | "auth" | "dashboard") {
  if (typeof window === "undefined") {
    return "";
  }

  const environment = resolveEnvironment(window.location.hostname);
  return resolveAppUrl(appId, environment) || "";
}

export function getApiBaseUrl() {
  return resolvePlatformApiBaseUrl({
    configuredPlatformApiBaseUrl: process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL,
    configuredAvaApiBaseUrl: process.env.NEXT_PUBLIC_AVA_API_BASE_URL,
    fallbackApiBaseUrl: resolveRuntimeAppUrl("api") || "https://api.aveyo.com"
  });
}

export function getAuthAppUrl() {
  return resolvePlatformAuthAppBaseUrl({
    configuredAuthAppUrl: process.env.NEXT_PUBLIC_AUTH_APP_URL,
    authAppUrl: resolveRuntimeAppUrl("auth") || "https://auth.aveyo.com"
  });
}

export function getEmployeeAppUrl() {
  return resolvePlatformAppBaseUrl({
    configuredPlatformAppUrl: process.env.NEXT_PUBLIC_PLATFORM_APP_URL,
    fallbackPlatformAppUrl: resolveRuntimeAppUrl("dashboard") || "https://app-staging.aveyo.com"
  });
}

export function buildAuthLoginUrl(returnTo: string) {
  return buildPlatformAuthLoginUrl(returnTo, {
    configuredAuthAppUrl: process.env.NEXT_PUBLIC_AUTH_APP_URL,
    authAppUrl: getAuthAppUrl()
  });
}

const defaultSession: MarketingSiteAuthSession = {
  loading: true,
  authenticated: false,
  role: "unknown",
  userType: "unknown",
  access: null,
  user: null
};

function toSessionState(payload: unknown, requestOk: boolean): MarketingSiteAuthSession {
  const normalizedPayload = normalizePlatformSessionPayload(payload);
  if (!requestOk || !normalizedPayload?.authenticated) {
    return {
      loading: false,
      authenticated: false,
      role: normalizedPayload?.role ?? "unknown",
      userType: normalizedPayload?.userType ?? "unknown",
      access: normalizedPayload?.access ?? null,
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

const marketingSiteSessionStore = createPlatformSessionStore({
  initialSnapshot: defaultSession,
  async loadSnapshot() {
    try {
      const result = await fetchPlatformSession({
        apiBaseUrl: getApiBaseUrl(),
        preferSameOriginInLocal: true
      });
      return toSessionState(result.payload, result.ok);
    } catch {
      return toSessionState(null, false);
    }
  }
});

export function useMarketingSiteAuthSession() {
  return usePlatformSessionStore(marketingSiteSessionStore);
}

export async function refreshMarketingSiteAuthSession() {
  return marketingSiteSessionStore.refresh();
}

export function toHostSessionSnapshot(session: MarketingSiteAuthSession) {
  return {
    authenticated: session.authenticated,
    role: session.role,
    userType: session.userType,
    user: session.user
  };
}
