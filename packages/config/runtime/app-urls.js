export const LOCAL_APP_PORTS = Object.freeze({
  app: 4004,
  dashboard: 4004,
  ava: 4001,
  api: 4002,
  auth: 4003,
  org: 4005,
  kpi: 4006,
  aveyo: 4007,
  customer: 4008
});

export const LOCAL_APP_URLS = Object.freeze({
  app: `http://localhost:${LOCAL_APP_PORTS.app}`,
  dashboard: `http://localhost:${LOCAL_APP_PORTS.dashboard}`,
  ava: `http://localhost:${LOCAL_APP_PORTS.ava}`,
  api: `http://localhost:${LOCAL_APP_PORTS.api}`,
  auth: `http://localhost:${LOCAL_APP_PORTS.auth}`,
  org: `http://localhost:${LOCAL_APP_PORTS.org}`,
  kpi: `http://localhost:${LOCAL_APP_PORTS.kpi}`,
  aveyo: `http://localhost:${LOCAL_APP_PORTS.aveyo}`,
  customer: `http://localhost:${LOCAL_APP_PORTS.customer}`,
  widget: `http://localhost:${LOCAL_APP_PORTS.ava}/embed`
});

export const APP_URLS_BY_ENV = Object.freeze({
  app: Object.freeze({
    local: LOCAL_APP_URLS.app,
    dev: "https://app.aveyo.com",
    staging: "https://app.aveyo.com",
    prod: "https://app.aveyo.com"
  }),
  dashboard: Object.freeze({
    local: LOCAL_APP_URLS.dashboard,
    dev: "https://app.aveyo.com",
    staging: "https://app.aveyo.com",
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
  widget: Object.freeze({
    local: LOCAL_APP_URLS.widget,
    dev: "https://ava-dev.aveyo.com/embed",
    staging: "https://ava-staging.aveyo.com/embed",
    prod: "https://ava.aveyo.com/embed"
  })
});

const LOCAL_HOST_PATTERN = /^(localhost|127(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|0\.0\.0\.0|.+\.local)$/i;

export function trimTrailingSlash(value) {
  return value.replace(/\/$/, "");
}

export function getLocalAppUrl(appId) {
  return LOCAL_APP_URLS[appId] ?? "";
}

export function resolveEnvironment(hostname) {
  const host = typeof hostname === "string" ? hostname.trim().toLowerCase() : "";
  if (!host || LOCAL_HOST_PATTERN.test(host)) {
    return "local";
  }
  if (host.includes("-dev.")) {
    return "dev";
  }
  if (host.includes("-staging.")) {
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
  const urls = APP_URLS_BY_ENV[appId];
  if (!urls) {
    return "";
  }
  return urls[environment] ?? urls.dev ?? urls.staging ?? urls.prod ?? urls.local ?? "";
}
