export const LOCAL_APP_PORTS = Object.freeze({
  app: 4004,
  dashboard: 4004,
  ava: 4001,
  api: 4002,
  auth: 4003,
  org: 4005,
  kpi: 4006,
  aveyo: 4007,
  customer: 4008,
  marketing: 4009
});

const DEFAULT_LOCAL_HOSTNAME = "localhost";
const LOCAL_NETWORK_HOST_ENV_KEYS = Object.freeze([
  "NEXT_PUBLIC_LOCAL_NETWORK_HOST",
  "NEXT_PUBLIC_LOCAL_HOST",
  "NEXT_PUBLIC_NETWORK_HOST",
  "LOCAL_NETWORK_HOST",
  "LOCAL_HOST"
]);
const LOCAL_HOST_PATTERN =
  /^(localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2}|0\.0\.0\.0|::1|.+\.local)$/i;

function readPublicEnv(name) {
  const processLike = globalThis;
  const env = processLike?.process?.env;
  return typeof env?.[name] === "string" ? env[name] : "";
}

function normalizeHostname(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) {
    return "";
  }

  try {
    const candidate = trimmed.includes("://") ? trimmed : `http://${trimmed}`;
    return new URL(candidate).hostname.trim().toLowerCase();
  } catch {
    return "";
  }
}

function resolveConfiguredLocalHostname() {
  for (const envKey of LOCAL_NETWORK_HOST_ENV_KEYS) {
    const hostname = normalizeHostname(readPublicEnv(envKey));
    if (hostname) {
      return hostname;
    }
  }
  return "";
}

function resolveRuntimeLocalHostname() {
  if (typeof window === "undefined") {
    return "";
  }

  const hostname = normalizeHostname(window.location.hostname);
  if (!hostname || !LOCAL_HOST_PATTERN.test(hostname)) {
    return "";
  }

  return hostname;
}

function resolveLocalHostname() {
  const configuredHost = resolveConfiguredLocalHostname();
  if (configuredHost) {
    return configuredHost;
  }

  const runtimeHost = resolveRuntimeLocalHostname();
  if (runtimeHost) {
    return runtimeHost;
  }

  return DEFAULT_LOCAL_HOSTNAME;
}

function buildLocalAppUrls(hostname) {
  const resolvedHost = normalizeHostname(hostname) || DEFAULT_LOCAL_HOSTNAME;
  return Object.freeze({
    app: `http://${resolvedHost}:${LOCAL_APP_PORTS.app}`,
    dashboard: `http://${resolvedHost}:${LOCAL_APP_PORTS.dashboard}`,
    ava: `http://${resolvedHost}:${LOCAL_APP_PORTS.ava}`,
    api: `http://${resolvedHost}:${LOCAL_APP_PORTS.api}`,
    auth: `http://${resolvedHost}:${LOCAL_APP_PORTS.auth}`,
    org: `http://${resolvedHost}:${LOCAL_APP_PORTS.org}`,
    kpi: `http://${resolvedHost}:${LOCAL_APP_PORTS.kpi}`,
    aveyo: `http://${resolvedHost}:${LOCAL_APP_PORTS.aveyo}`,
    customer: `http://${resolvedHost}:${LOCAL_APP_PORTS.customer}`,
    marketing: `http://${resolvedHost}:${LOCAL_APP_PORTS.marketing}`,
    widget: `http://${resolvedHost}:${LOCAL_APP_PORTS.ava}/embed`
  });
}

export const LOCAL_APP_URLS = buildLocalAppUrls(resolveLocalHostname());

export const APP_URLS_BY_ENV = Object.freeze({
  app: Object.freeze({
    local: LOCAL_APP_URLS.app,
    dev: "https://app-dev.aveyo.com",
    staging: "https://app-staging.aveyo.com",
    prod: "https://app.aveyo.com"
  }),
  dashboard: Object.freeze({
    local: LOCAL_APP_URLS.dashboard,
    dev: "https://app-dev.aveyo.com",
    staging: "https://app-staging.aveyo.com",
    prod: "https://app.aveyo.com"
  }),
  auth: Object.freeze({
    local: LOCAL_APP_URLS.auth,
    dev: "https://auth-dev.aveyo.com",
    staging: "https://auth-staging.aveyo.com",
    prod: "https://auth.aveyo.com"
  }),
  api: Object.freeze({
    local: LOCAL_APP_URLS.api,
    dev: "https://api-dev.aveyo.com",
    staging: "https://api-staging.aveyo.com",
    prod: "https://api.aveyo.com"
  }),
  ava: Object.freeze({
    local: LOCAL_APP_URLS.ava,
    dev: "https://ava-dev.aveyo.com",
    staging: "https://ava-staging.aveyo.com",
    prod: "https://ava.aveyo.com"
  }),
  org: Object.freeze({
    local: LOCAL_APP_URLS.org,
    dev: "https://org-dev.aveyo.com",
    staging: "https://org-staging.aveyo.com",
    prod: "https://orgchart.aveyo.com"
  }),
  kpi: Object.freeze({
    local: LOCAL_APP_URLS.kpi,
    dev: "https://kpi-dev.aveyo.com",
    staging: "https://kpi-staging.aveyo.com",
    prod: "https://kpi.aveyo.com"
  }),
  aveyo: Object.freeze({
    local: LOCAL_APP_URLS.aveyo,
    dev: "https://dev.aveyo.com",
    staging: "https://staging.aveyo.com",
    prod: "https://aveyo.com"
  }),
  customer: Object.freeze({
    local: LOCAL_APP_URLS.customer,
    dev: "https://customer-dev.aveyo.com",
    staging: "https://customer-staging.aveyo.com",
    prod: "https://customer.aveyo.com"
  }),
  marketing: Object.freeze({
    local: LOCAL_APP_URLS.marketing,
    dev: "https://marketing-dev.aveyo.com",
    staging: "https://marketing-staging.aveyo.com",
    prod: "https://marketing.aveyo.com"
  }),
  widget: Object.freeze({
    local: LOCAL_APP_URLS.widget,
    dev: "https://ava-dev.aveyo.com/embed",
    staging: "https://ava-staging.aveyo.com/embed",
    prod: "https://ava.aveyo.com/embed"
  })
});

export function trimTrailingSlash(value) {
  return value.replace(/\/$/, "");
}

export function getLocalAppUrl(appId) {
  const urls = buildLocalAppUrls(resolveLocalHostname());
  return urls[appId] ?? "";
}

export function resolveEnvironment(hostname) {
  const host = typeof hostname === "string" ? hostname.trim().toLowerCase() : "";
  if (!host || LOCAL_HOST_PATTERN.test(host)) {
    return "local";
  }
  if (host.includes("-dev.") || host.startsWith("dev.")) {
    return "dev";
  }
  if (host.includes("-staging.") || host.startsWith("staging.")) {
    return "staging";
  }
  return "prod";
}

export function getEnvironmentLabel(environment) {
  switch (environment) {
    case "dev":
      return "Development";
    case "staging":
      return "Staging";
    case "prod":
      return "Production";
    default:
      return "Local";
  }
}

export function resolveAppUrl(appId, environment) {
  if (environment === "local") {
    return getLocalAppUrl(appId);
  }

  const urls = APP_URLS_BY_ENV[appId];
  if (!urls) {
    return "";
  }
  return urls[environment] ?? urls.dev ?? urls.staging ?? urls.prod ?? urls.local ?? "";
}
