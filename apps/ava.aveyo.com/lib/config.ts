interface SupabaseBrowserConfig {
  url: string;
  anonKey: string;
}

import {
  buildPlatformAuthLoginUrl,
  resolvePlatformApiBaseUrl,
  resolvePlatformAuthAppBaseUrl
} from "@ava/auth";

let cachedSupabaseConfig: SupabaseBrowserConfig | undefined;

export function getApiBaseUrl() {
  return resolvePlatformApiBaseUrl({
    configuredPlatformApiBaseUrl: process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL,
    configuredAvaApiBaseUrl: process.env.NEXT_PUBLIC_AVA_API_BASE_URL
  });
}

export function getAuthAppUrl() {
  return resolvePlatformAuthAppBaseUrl({
    configuredAuthAppUrl: process.env.NEXT_PUBLIC_AUTH_APP_URL
  });
}

interface BuildAuthLoginUrlOptions {
  logout?: boolean;
}

export function buildAuthLoginUrl(returnTo: string, options: BuildAuthLoginUrlOptions = {}) {
  return buildPlatformAuthLoginUrl(returnTo, {
    configuredAuthAppUrl: process.env.NEXT_PUBLIC_AUTH_APP_URL,
    authAppUrl: getAuthAppUrl(),
    logout: options.logout
  });
}

export function getSupabaseBrowserConfig(): SupabaseBrowserConfig {
  if (cachedSupabaseConfig) {
    return cachedSupabaseConfig;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase browser configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  cachedSupabaseConfig = { url, anonKey };
  return cachedSupabaseConfig;
}
