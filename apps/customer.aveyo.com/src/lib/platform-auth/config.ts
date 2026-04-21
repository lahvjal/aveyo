interface BuildAuthLoginUrlOptions {
  logout?: boolean;
}

import {
  buildAuthLoginUrl as buildSharedAuthLoginUrl,
  resolveApiBaseUrl,
  resolveAuthAppUrl,
  resolvePlatformAppUrl
} from "@ava/config/runtime/auth-urls";
import {
  getLocalAppUrl,
  resolveAppUrl,
  resolveEnvironment
} from "@ava/config/runtime/app-urls";

function resolveRuntimeEnvironment() {
  if (typeof window !== "undefined") {
    return resolveEnvironment(window.location.hostname);
  }

  if (process.env.NODE_ENV !== "production") {
    return "local";
  }

  if (process.env.VERCEL_ENV === "preview" || process.env.NEXT_PUBLIC_VERCEL_ENV === "preview") {
    return "staging";
  }

  return "prod";
}

export function getAuthAppUrl() {
  if (process.env.NEXT_PUBLIC_AUTH_APP_URL?.trim()) {
    return resolveAuthAppUrl({
      configuredAuthAppUrl: process.env.NEXT_PUBLIC_AUTH_APP_URL
    });
  }

  const environment = resolveRuntimeEnvironment();
  return environment === "local" ? getLocalAppUrl("auth") : resolveAppUrl("auth", environment);
}

export function getPlatformApiBaseUrl() {
  if (
    process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_AVA_API_BASE_URL?.trim()
  ) {
    return resolveApiBaseUrl({
      configuredPlatformApiBaseUrl: process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL,
      configuredAvaApiBaseUrl: process.env.NEXT_PUBLIC_AVA_API_BASE_URL
    });
  }

  const environment = resolveRuntimeEnvironment();
  return environment === "local" ? getLocalAppUrl("api") : resolveAppUrl("api", environment);
}

export function getEmployeeAppUrl() {
  if (process.env.NEXT_PUBLIC_PLATFORM_APP_URL?.trim()) {
    return resolvePlatformAppUrl({
      configuredPlatformAppUrl: process.env.NEXT_PUBLIC_PLATFORM_APP_URL
    });
  }

  const environment = resolveRuntimeEnvironment();
  return environment === "local" ? getLocalAppUrl("dashboard") : resolveAppUrl("app", environment);
}

export function buildAuthLoginUrl(returnTo: string, options: BuildAuthLoginUrlOptions = {}) {
  return buildSharedAuthLoginUrl(returnTo, {
    configuredAuthAppUrl: process.env.NEXT_PUBLIC_AUTH_APP_URL,
    authAppUrl: getAuthAppUrl(),
    logout: options.logout
  });
}
