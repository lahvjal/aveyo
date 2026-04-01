interface BuildAuthLoginUrlOptions {
  logout?: boolean;
}

import {
  buildAuthLoginUrl as buildSharedAuthLoginUrl,
  resolveApiBaseUrl,
  resolveAuthAppUrl,
  resolvePlatformAppUrl
} from "@ava/config/runtime/auth-urls";

export function getPlatformAppUrl() {
  return resolvePlatformAppUrl({
    configuredPlatformAppUrl: process.env.NEXT_PUBLIC_PLATFORM_APP_URL
  });
}

export function getAuthAppUrl() {
  return resolveAuthAppUrl({
    configuredAuthAppUrl: process.env.NEXT_PUBLIC_AUTH_APP_URL
  });
}

export function getApiBaseUrl() {
  return resolveApiBaseUrl({
    configuredPlatformApiBaseUrl: process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL,
    configuredAvaApiBaseUrl: process.env.NEXT_PUBLIC_AVA_API_BASE_URL
  });
}

export function buildAuthLoginUrl(returnTo: string, options: BuildAuthLoginUrlOptions = {}) {
  return buildSharedAuthLoginUrl(returnTo, {
    configuredAuthAppUrl: process.env.NEXT_PUBLIC_AUTH_APP_URL,
    logout: options.logout
  });
}
