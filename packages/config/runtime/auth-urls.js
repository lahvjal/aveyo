import { getLocalAppUrl, trimTrailingSlash } from "./app-urls.js";

const LOCAL_HOST_PATTERN =
  /^(localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2}|0\.0\.0\.0|::1|.+\.local)$/i;

function normalizeHostname(value) {
  const host = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!host) {
    return "";
  }

  return host.startsWith("[") ? host.slice(1).split("]")[0] : host;
}

function readRuntimeLocalHostname() {
  if (typeof window === "undefined") {
    return "";
  }

  const hostname = normalizeHostname(window.location.hostname);
  if (!hostname || !LOCAL_HOST_PATTERN.test(hostname)) {
    return "";
  }

  return hostname;
}

function normalizeAndResolveNetworkAwareUrl(value) {
  const configured = typeof value === "string" ? value.trim() : "";
  if (!configured) {
    return "";
  }

  const normalizedUrl = trimTrailingSlash(configured);
  const runtimeHostname = readRuntimeLocalHostname();
  if (!runtimeHostname) {
    return normalizedUrl;
  }

  try {
    const parsed = new URL(normalizedUrl);
    const configuredHostname = normalizeHostname(parsed.hostname);
    if (!configuredHostname || !LOCAL_HOST_PATTERN.test(configuredHostname)) {
      return normalizedUrl;
    }
    if (configuredHostname === runtimeHostname) {
      return normalizedUrl;
    }

    parsed.hostname = runtimeHostname;
    return trimTrailingSlash(parsed.toString());
  } catch {
    return normalizedUrl;
  }
}

function normalizeConfiguredUrl(value) {
  return normalizeAndResolveNetworkAwareUrl(value);
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
