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

const POST_LOGIN_REDIRECT_URL = "https://app.aveyo.com/";
const LOCAL_HOST_PATTERN = /^(localhost|127(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|0\.0\.0\.0|.+\.local)$/i;

function normalizeUrl(url: string) {
  return trimTrailingSlash(url);
}

function isLocalHostname(hostname: string) {
  return LOCAL_HOST_PATTERN.test(hostname.trim());
}

function getLocalOrgChartDashboardUrl() {
  if (typeof window !== "undefined") {
    return `${normalizeUrl(window.location.origin)}/dashboard`;
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
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
  if (typeof window !== "undefined" && isLocalHostname(window.location.hostname)) {
    return getLocalOrgChartDashboardUrl();
  }

  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredAppUrl) {
    let hostname = "";
    try {
      hostname = new URL(configuredAppUrl).hostname;
    } catch {
      hostname = "";
    }

    if (hostname && isLocalHostname(hostname)) {
      return `${normalizeUrl(configuredAppUrl)}/dashboard`;
    }
  }

  return POST_LOGIN_REDIRECT_URL;
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
