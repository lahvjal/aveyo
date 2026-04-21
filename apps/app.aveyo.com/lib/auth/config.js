import {
  buildPlatformAuthLoginUrl,
  resolvePlatformApiBaseUrl,
  resolvePlatformAuthAppBaseUrl
} from "@ava/auth";

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

export function buildAuthLoginUrl(returnTo, options = {}) {
  return buildPlatformAuthLoginUrl(returnTo, {
    configuredAuthAppUrl: process.env.NEXT_PUBLIC_AUTH_APP_URL,
    authAppUrl: getAuthAppUrl(),
    logout: options.logout
  });
}
