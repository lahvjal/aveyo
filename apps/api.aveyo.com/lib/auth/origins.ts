import { APP_URLS_BY_ENV } from "@ava/config/runtime/app-urls";

const PLATFORM_BROWSER_APP_IDS = [
  "app",
  "auth",
  "ava",
  "customer",
  "org",
  "kpi",
  "marketing",
  "aveyo"
] as const;
const PLATFORM_ENVIRONMENTS = ["local", "dev", "staging", "prod"] as const;

function toOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

export function getDefaultAllowedOrigins() {
  const origins = new Set<string>();

  for (const appId of PLATFORM_BROWSER_APP_IDS) {
    const urls = APP_URLS_BY_ENV[appId];
    if (!urls) {
      continue;
    }

    for (const environment of PLATFORM_ENVIRONMENTS) {
      const url = urls[environment];
      const origin = typeof url === "string" ? toOrigin(url) : "";
      if (origin) {
        origins.add(origin);
      }
    }
  }

  // Support the common production alias even though the canonical registry entry is aveyo.com.
  origins.add("https://www.aveyo.com");
  return Array.from(origins);
}

export function getAllowedOrigins(rawAllowedOrigins = process.env.AVA_ALLOWED_ORIGINS) {
  const defaults = getDefaultAllowedOrigins();
  if (!rawAllowedOrigins) {
    return defaults;
  }

  const parsed = rawAllowedOrigins
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (parsed.length === 0) {
    return defaults;
  }

  return Array.from(new Set([...defaults, ...parsed]));
}

export function isAllowedLocalDevOrigin(origin: string) {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.trim().toLowerCase();
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    if (host === "localhost" || host === "0.0.0.0" || host === "::1" || host.endsWith(".local")) {
      return true;
    }
    if (/^127(?:\.\d{1,3}){3}$/.test(host)) {
      return true;
    }
    if (/^10(?:\.\d{1,3}){3}$/.test(host)) {
      return true;
    }
    if (/^172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}$/.test(host)) {
      return true;
    }
    if (/^192\.168(?:\.\d{1,3}){2}$/.test(host)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
