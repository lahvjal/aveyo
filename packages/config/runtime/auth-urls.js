import { getLocalAppUrl, trimTrailingSlash } from "./app-urls.js";

function normalizeConfiguredUrl(value) {
  const configured = typeof value === "string" ? value.trim() : "";
  if (!configured) {
    return "";
  }
  return trimTrailingSlash(configured);
}

export function resolveAuthAppUrl(options = {}) {
  const configured = normalizeConfiguredUrl(options.configuredAuthAppUrl);
  if (configured) {
    return configured;
  }

  const fallback = normalizeConfiguredUrl(options.fallbackAuthAppUrl);
  if (fallback) {
    return fallback;
  }

  return getLocalAppUrl("auth");
}

export function resolveApiBaseUrl(options = {}) {
  const configuredPrimary = normalizeConfiguredUrl(options.configuredPlatformApiBaseUrl);
  if (configuredPrimary) {
    return configuredPrimary;
  }

  const configuredSecondary = normalizeConfiguredUrl(options.configuredAvaApiBaseUrl);
  if (configuredSecondary) {
    return configuredSecondary;
  }

  const fallback = normalizeConfiguredUrl(options.fallbackApiBaseUrl);
  if (fallback) {
    return fallback;
  }

  return getLocalAppUrl("api");
}

export function resolvePlatformAppUrl(options = {}) {
  const configured = normalizeConfiguredUrl(options.configuredPlatformAppUrl);
  if (configured) {
    return configured;
  }

  const fallback = normalizeConfiguredUrl(options.fallbackPlatformAppUrl);
  if (fallback) {
    return fallback;
  }

  return getLocalAppUrl("dashboard");
}

export function buildAuthLoginUrl(returnTo, options = {}) {
  const authAppUrl = resolveAuthAppUrl({
    configuredAuthAppUrl: options.configuredAuthAppUrl,
    fallbackAuthAppUrl: options.authAppUrl
  });
  const authUrl = new URL("/login", authAppUrl);
  authUrl.searchParams.set("returnTo", returnTo);
  if (options.logout) {
    authUrl.searchParams.set("logout", "1");
  }
  return authUrl.toString();
}
