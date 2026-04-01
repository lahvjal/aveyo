import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerConfig, getSupabaseServiceRoleKey } from "./config";

let cachedClient: SupabaseClient | undefined;
let cachedServiceRoleClient: SupabaseClient | undefined;

function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseServerConfig();
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export function getSupabaseServerClient(): SupabaseClient {
  if (!cachedClient) {
    cachedClient = createSupabaseServerClient();
  }

  return cachedClient;
}

export function getSupabaseServiceRoleClient(): SupabaseClient {
  if (!cachedServiceRoleClient) {
    const { url } = getSupabaseServerConfig();
    const serviceRoleKey = getSupabaseServiceRoleKey();
    cachedServiceRoleClient = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return cachedServiceRoleClient;
}
