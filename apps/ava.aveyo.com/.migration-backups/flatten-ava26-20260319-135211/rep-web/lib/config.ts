interface SupabaseBrowserConfig {
  url: string;
  anonKey: string;
}

let cachedSupabaseConfig: SupabaseBrowserConfig | undefined;

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_AVA_API_BASE_URL ?? "";
}

export function getAuthAppUrl() {
  const configured = process.env.NEXT_PUBLIC_AUTH_APP_URL?.trim();
  if (!configured) {
    return "http://localhost:3003";
  }
  return configured.replace(/\/$/, "");
}

interface BuildAuthLoginUrlOptions {
  logout?: boolean;
}

export function buildAuthLoginUrl(returnTo: string, options: BuildAuthLoginUrlOptions = {}) {
  const authUrl = new URL("/login", getAuthAppUrl());
  authUrl.searchParams.set("returnTo", returnTo);
  if (options.logout) {
    authUrl.searchParams.set("logout", "1");
  }
  return authUrl.toString();
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
