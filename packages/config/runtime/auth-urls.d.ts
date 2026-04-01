export interface ResolveAuthAppUrlOptions {
  configuredAuthAppUrl?: string;
  fallbackAuthAppUrl?: string;
}

export interface ResolveApiBaseUrlOptions {
  configuredPlatformApiBaseUrl?: string;
  configuredAvaApiBaseUrl?: string;
  fallbackApiBaseUrl?: string;
}

export interface ResolvePlatformAppUrlOptions {
  configuredPlatformAppUrl?: string;
  fallbackPlatformAppUrl?: string;
}

export interface BuildAuthLoginUrlOptions {
  configuredAuthAppUrl?: string;
  authAppUrl?: string;
  logout?: boolean;
}

export function resolveAuthAppUrl(options?: ResolveAuthAppUrlOptions): string;
export function resolveApiBaseUrl(options?: ResolveApiBaseUrlOptions): string;
export function resolvePlatformAppUrl(options?: ResolvePlatformAppUrlOptions): string;
export function buildAuthLoginUrl(
  returnTo: string,
  options?: BuildAuthLoginUrlOptions
): string;
