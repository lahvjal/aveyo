import {
  buildAuthLoginUrl as buildSharedAuthLoginUrl,
  resolveApiBaseUrl,
  resolveAuthAppUrl
} from "@ava/config/runtime/auth-urls";
import { resolveAppUrl, resolveEnvironment } from "@ava/config/runtime/app-urls";

interface BuildAuthLoginUrlOptions {
  logout?: boolean;
}

function resolveRuntimeAppUrl(appId: "auth" | "api") {
  if (typeof window === "undefined") {
    return undefined;
  }

  const environment = resolveEnvironment(window.location.hostname);
  const resolved = resolveAppUrl(appId, environment);
  return resolved || undefined;
}

export function getAuthAppUrl() {
  return resolveAuthAppUrl({
    configuredAuthAppUrl: process.env.NEXT_PUBLIC_AUTH_APP_URL,
    fallbackAuthAppUrl: resolveRuntimeAppUrl("auth")
  });
}

export function getApiBaseUrl() {
  return resolveApiBaseUrl({
    configuredPlatformApiBaseUrl: process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL,
    configuredAvaApiBaseUrl: process.env.NEXT_PUBLIC_AVA_API_BASE_URL,
    fallbackApiBaseUrl: resolveRuntimeAppUrl("api")
  });
}

export function buildAuthLoginUrl(returnTo: string, options: BuildAuthLoginUrlOptions = {}) {
  return buildSharedAuthLoginUrl(returnTo, {
    configuredAuthAppUrl: process.env.NEXT_PUBLIC_AUTH_APP_URL,
    authAppUrl: resolveRuntimeAppUrl("auth"),
    logout: options.logout
  });
}
