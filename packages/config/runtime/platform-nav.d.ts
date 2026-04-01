export type RuntimeEnvironment = "local" | "dev" | "staging" | "prod";

export type PlatformNavIconKey =
  | "dashboard"
  | "org"
  | "operations"
  | "kpi"
  | "ava"
  | "paychex"
  | "marketing"
  | "assets"
  | "culture"
  | "manager"
  | "admin"
  | "settings";

export type ExternalAppKey = "dashboard" | "org" | "operations" | "kpi" | "ava";

export interface PlatformPrimaryNavItem {
  id: string;
  label: string;
  icon: PlatformNavIconKey;
  externalAppKey?: ExternalAppKey;
  href?: string;
}

export interface PlatformUtilityNavItem {
  id: string;
  label: string;
  icon: PlatformNavIconKey;
}

export interface ResolvePlatformNavHrefOptions {
  sameAppHrefByItemId?: Record<string, string>;
}

export interface PlatformNavIconSrcOptions {
  prefix?: string;
}

export const PLATFORM_PRIMARY_NAV_ITEMS: readonly PlatformPrimaryNavItem[];
export const PLATFORM_UTILITY_NAV_ITEMS: readonly PlatformUtilityNavItem[];

export function resolvePlatformNavHref(
  item: PlatformPrimaryNavItem,
  environment: RuntimeEnvironment,
  options?: ResolvePlatformNavHrefOptions
): string;

export function getAveyoSiteUrl(
  environment: RuntimeEnvironment,
  configuredAveyoAppUrl?: string
): string;

export function getPlatformNavIconSrc(
  iconKey: PlatformNavIconKey,
  options?: PlatformNavIconSrcOptions
): string;
