interface BuildAuthLoginUrlOptions {
  logout?: boolean;
}

import {
  buildPlatformAuthLoginUrl,
  resolvePlatformApiBaseUrl,
  resolvePlatformAuthAppBaseUrl,
  resolvePlatformAppBaseUrl
} from "@ava/auth";

export function getPlatformAppUrl() {
  return resolvePlatformAppBaseUrl({
    configuredPlatformAppUrl: process.env.NEXT_PUBLIC_PLATFORM_APP_URL
  });
}

export function getAuthAppUrl() {
  return resolvePlatformAuthAppBaseUrl({
    configuredAuthAppUrl: process.env.NEXT_PUBLIC_AUTH_APP_URL
  });
}

export function getApiBaseUrl() {
  return resolvePlatformApiBaseUrl({
    configuredPlatformApiBaseUrl: process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL,
    configuredAvaApiBaseUrl: process.env.NEXT_PUBLIC_AVA_API_BASE_URL
  });
}

export function buildAuthLoginUrl(returnTo: string, options: BuildAuthLoginUrlOptions = {}) {
  return buildPlatformAuthLoginUrl(returnTo, {
    configuredAuthAppUrl: process.env.NEXT_PUBLIC_AUTH_APP_URL,
    authAppUrl: getAuthAppUrl(),
    logout: options.logout
  });
}
