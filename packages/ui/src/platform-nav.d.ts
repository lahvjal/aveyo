declare module "@ava/config/runtime/platform-nav" {
  export type RuntimeEnvironment = "local" | "dev" | "staging" | "prod";

  export interface PlatformPrimaryNavItem {
    id: string;
    label: string;
    icon: string;
    externalAppKey?: string;
    href?: string;
  }

  export interface PlatformUtilityNavItem {
    id: string;
    label: string;
    icon: string;
  }

  export const PLATFORM_PRIMARY_NAV_ITEMS: readonly PlatformPrimaryNavItem[];
  export const PLATFORM_UTILITY_NAV_ITEMS: readonly PlatformUtilityNavItem[];

  export function resolvePlatformNavHref(
    item: PlatformPrimaryNavItem,
    environment: RuntimeEnvironment,
    options?: { sameAppHrefByItemId?: Record<string, string> }
  ): string;

  export function getAveyoSiteUrl(
    environment: RuntimeEnvironment,
    configuredAveyoAppUrl?: string
  ): string;

  export function getPlatformNavIconSrc(
    iconKey: string,
    options?: { prefix?: string }
  ): string;
}
