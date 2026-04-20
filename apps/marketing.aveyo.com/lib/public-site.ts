import { resolveAppUrl, resolveEnvironment, trimTrailingSlash } from "@ava/config/runtime/app-urls";

export function getAveyoSiteBaseUrl() {
  const environment =
    typeof window === "undefined" ? "local" : resolveEnvironment(window.location.hostname);

  return trimTrailingSlash(resolveAppUrl("aveyo", environment));
}

export function buildAveyoSiteUrl(pathname: string) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${getAveyoSiteBaseUrl()}${normalizedPath}`;
}
