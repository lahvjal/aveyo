interface SupabaseServerConfig {
  url: string;
  anonKey: string;
}

let cachedConfig: SupabaseServerConfig | undefined;
let cachedServiceRoleKey: string | undefined;

export function getSupabaseServerConfig(): SupabaseServerConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  cachedConfig = { url, anonKey };
  return cachedConfig;
}

export function getSupabaseServiceRoleKey(): string {
  if (cachedServiceRoleKey) {
    return cachedServiceRoleKey;
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Set it in api.aveyo.com/.env.local for service-role database access."
    );
  }

  cachedServiceRoleKey = serviceRoleKey;
  return cachedServiceRoleKey;
}
