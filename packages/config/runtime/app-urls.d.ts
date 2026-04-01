export type RuntimeEnvironment = "local" | "dev" | "staging" | "prod";

export type AppUrlId =
  | "app"
  | "dashboard"
  | "ava"
  | "api"
  | "auth"
  | "org"
  | "kpi"
  | "aveyo"
  | "customer"
  | "widget";

export const LOCAL_APP_PORTS: Readonly<{
  app: 4004;
  dashboard: 4004;
  ava: 4001;
  api: 4002;
  auth: 4003;
  org: 4005;
  kpi: 4006;
  aveyo: 4007;
  customer: 4008;
}>;

export const LOCAL_APP_URLS: Readonly<Record<AppUrlId, string>>;

export const APP_URLS_BY_ENV: Readonly<
  Record<AppUrlId, Readonly<Record<RuntimeEnvironment, string>>>
>;

export function trimTrailingSlash(value: string): string;
export function getLocalAppUrl(appId: AppUrlId): string;
export function resolveEnvironment(hostname: string): RuntimeEnvironment;
export function getEnvironmentLabel(environment: RuntimeEnvironment): string;
export function resolveAppUrl(appId: AppUrlId, environment: RuntimeEnvironment): string;
