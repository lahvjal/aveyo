import { createClient } from "@supabase/supabase-js";
import { getSupabaseBrowserConfig } from "@/lib/config";

let cachedClient: ReturnType<typeof createClient> | undefined;

export function getSupabaseBrowserClient() {
  if (!cachedClient) {
    const { url, anonKey } = getSupabaseBrowserConfig();
    cachedClient = createClient(url, anonKey);
  }

  return cachedClient;
}
