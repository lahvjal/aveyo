// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// For client components (browser)
export const supabase = createClientComponentClient();

// Handle auth state changes
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      // Delete cookies on sign out
      const expires = new Date(0).toUTCString();
      document.cookie = `sb-access-token=; path=/; expires=${expires}; SameSite=Lax; secure`;
      document.cookie = `sb-refresh-token=; path=/; expires=${expires}; SameSite=Lax; secure`;
    }
  });
}

// For direct API access when needed
export const supabaseApi = createClient(supabaseUrl, supabaseAnonKey);

// Helper function for server components
export const createServerSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });
};