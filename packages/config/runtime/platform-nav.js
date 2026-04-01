import { resolveAppUrl, trimTrailingSlash } from "./app-urls.js";

const EXTERNAL_APP_ID_BY_KEY = Object.freeze({
  dashboard: "dashboard",
  org: "org",
  operations: "org",
  kpi: "kpi",
  ava: "ava"
});

const ICON_FILE_BY_KEY = Object.freeze({
  dashboard: "dashboard",
  org: "org",
  operations: "process",
  kpi: "kpi",
  ava: "ava",
  paychex: "paychex",
  marketing: "marketing",
  assets: "assets",
  culture: "culture",
  manager: "manager",
  admin: "admin",
  settings: "settings"
});

const PRIMARY_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard", externalAppKey: "dashboard" },
  { id: "org", label: "Org Chart", icon: "org", externalAppKey: "org" },
  { id: "operations", label: "Operations", icon: "operations", externalAppKey: "operations" },
  { id: "kpi", label: "KPI Dashboard", icon: "kpi", externalAppKey: "kpi" },
  { id: "ava", label: "Ava", icon: "ava", externalAppKey: "ava" },
  { id: "paychex", label: "Paychex", icon: "paychex" },
  { id: "marketing", label: "Marketing", icon: "marketing" },
  { id: "assets", label: "Asset Library", icon: "assets" },
  { id: "culture", label: "Culture", icon: "culture" }
];

const UTILITY_NAV_ITEMS = [
  { id: "manager", label: "Manager Panel", icon: "manager" },
  { id: "admin", label: "Admin Panel", icon: "admin" },
  { id: "settings", label: "Settings", icon: "settings" }
];

export const PLATFORM_PRIMARY_NAV_ITEMS = Object.freeze(
  PRIMARY_NAV_ITEMS.map((item) => Object.freeze({ ...item }))
);
export const PLATFORM_UTILITY_NAV_ITEMS = Object.freeze(
  UTILITY_NAV_ITEMS.map((item) => Object.freeze({ ...item }))
);

function withPath(baseUrl, pathname) {
  const normalizedBase = trimTrailingSlash(baseUrl);
  if (!normalizedBase) {
    return "";
  }
  if (!pathname || pathname === "/") {
    return normalizedBase;
  }
  return `${normalizedBase}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export function resolvePlatformNavHref(item, environment, options = {}) {
  const sameAppHrefByItemId = options.sameAppHrefByItemId ?? {};
  const sameAppHref = sameAppHrefByItemId[item.id];
  if (sameAppHref) {
    return sameAppHref;
  }

  if (item.href) {
    return item.href;
  }

  if (!item.externalAppKey) {
    return "";
  }

  const appId = EXTERNAL_APP_ID_BY_KEY[item.externalAppKey];
  if (!appId) {
    return "";
  }

  const baseUrl = resolveAppUrl(appId, environment);
  if (!baseUrl) {
    return "";
  }

  if (item.externalAppKey === "operations") {
    return withPath(baseUrl, "/processes");
  }

  return trimTrailingSlash(baseUrl);
}

export function getAveyoSiteUrl(environment, configuredAveyoAppUrl) {
  const configured = typeof configuredAveyoAppUrl === "string" ? configuredAveyoAppUrl.trim() : "";
  if (configured) {
    return trimTrailingSlash(configured);
  }
  return resolveAppUrl("aveyo", environment);
}

export function getPlatformNavIconSrc(iconKey, options = {}) {
  const iconFile = ICON_FILE_BY_KEY[iconKey];
  if (!iconFile) {
    return "";
  }
  const prefix = options.prefix ?? "/";
  const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
  return `${normalizedPrefix}icon=${iconFile}, state=active.svg`;
}
