interface BuildAuthLoginUrlOptions {
  logout?: boolean;
}

import {
  buildAuthLoginUrl as buildSharedAuthLoginUrl,
  resolveApiBaseUrl,
  resolveAuthAppUrl,
  resolvePlatformAppUrl
} from "@ava/config/runtime/auth-urls";
import { getLocalAppUrl, trimTrailingSlash } from "@ava/config/runtime/app-urls";

function normalizeUrl(url: string) {
  return trimTrailingSlash(url);
}

function getLocalOrgChartDashboardUrl() {
  if (typeof window !== "undefined") {
    return `${normalizeUrl(window.location.origin)}/dashboard`;
  }

  const configured = process.env.NEXT_PUBLIC_ORG_APP_URL?.trim();
  if (configured) {
    return `${normalizeUrl(configured)}/dashboard`;
  }

  return `${getLocalAppUrl("org")}/dashboard`;
}

export function getPlatformAppUrl() {
  return resolvePlatformAppUrl({
    configuredPlatformAppUrl: process.env.NEXT_PUBLIC_PLATFORM_APP_URL
  });
}

export function getPostLoginRedirectUrl() {
  if (typeof window !== "undefined") {
    const browserOrigin = normalizeUrl(window.location.origin);
    return `${browserOrigin}/dashboard`;
  }

  const configuredOrgUrl = process.env.NEXT_PUBLIC_ORG_APP_URL?.trim();
  if (configuredOrgUrl) {
    return `${normalizeUrl(configuredOrgUrl)}/dashboard`;
  }

  return getLocalOrgChartDashboardUrl();
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
