import {
  getLocalAppUrl,
  resolveAppUrl,
  resolveEnvironment,
  trimTrailingSlash
} from "@ava/config/runtime/app-urls";

const LOCAL_HOST_PATTERN =
  /^(localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2}|0\.0\.0\.0|::1|.+\.local)$/i;

function normalizeConfiguredUrl(value) {
  const configured = typeof value === "string" ? value.trim() : "";
  if (!configured) {
    return "";
  }

  return trimTrailingSlash(configured);
}

function isLocalHostname(hostname) {
  const value = typeof hostname === "string" ? hostname.trim() : "";
  return LOCAL_HOST_PATTERN.test(value);
}

function resolveRuntimeNetworkHostname() {
  if (typeof window === "undefined") {
    return "";
  }

  const hostname = window.location.hostname?.trim();
  if (!hostname || !isLocalHostname(hostname)) {
    return "";
  }

  return hostname;
}

function resolveNetworkAwareConfiguredUrl(value) {
  const normalized = normalizeConfiguredUrl(value);
  if (!normalized) {
    return "";
  }

  try {
    const parsed = new URL(normalized);
    if (!isLocalHostname(parsed.hostname)) {
      return normalized;
    }

    const runtimeHostname = resolveRuntimeNetworkHostname();
    if (!runtimeHostname || runtimeHostname === parsed.hostname) {
      return normalized;
    }

    parsed.hostname = runtimeHostname;
    return trimTrailingSlash(parsed.toString());
  } catch {
    return normalized;
  }
}

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

export function getEmployeeAppUrl() {
  const configured = resolveNetworkAwareConfiguredUrl(
    process.env.NEXT_PUBLIC_PLATFORM_APP_URL || process.env.NEXT_PUBLIC_AUTH_EMPLOYEE_APP_URL
  );
  if (configured) {
    return configured;
  }

  const environment = resolveRuntimeEnvironment();
  return environment === "local" ? getLocalAppUrl("app") : resolveAppUrl("app", environment);
}

export function getCustomerAppUrl() {
  const configured = resolveNetworkAwareConfiguredUrl(process.env.NEXT_PUBLIC_AUTH_CUSTOMER_APP_URL);
  if (configured) {
    return configured;
  }

  const environment = resolveRuntimeEnvironment();
  return environment === "local"
    ? getLocalAppUrl("customer")
    : resolveAppUrl("customer", environment);
}

export function getAveyoAppUrl() {
  const configured = resolveNetworkAwareConfiguredUrl(
    process.env.NEXT_PUBLIC_AVEYO_APP_URL || process.env.NEXT_PUBLIC_AUTH_AVEYO_APP_URL
  );
  if (configured) {
    return configured;
  }

  const environment = resolveRuntimeEnvironment();
  return environment === "local" ? getLocalAppUrl("aveyo") : resolveAppUrl("aveyo", environment);
}

export function getAuthApiBaseUrl() {
  const configured = resolveNetworkAwareConfiguredUrl(
    process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL || process.env.NEXT_PUBLIC_AUTH_API_BASE_URL
  );
  if (configured) {
    return configured;
  }

  const environment = resolveRuntimeEnvironment();
  return environment === "local" ? getLocalAppUrl("api") : resolveAppUrl("api", environment);
}
