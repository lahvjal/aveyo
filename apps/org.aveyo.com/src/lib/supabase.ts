import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { supabaseCookieStorage } from './supabaseCookieStorage'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// Uses shared .aveyo.com cookie so session is readable by both
// orgchart.aveyo.com and kpi.aveyo.com simultaneously
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: supabaseCookieStorage,
    storageKey: 'sb-aveyo-auth',
    autoRefreshToken: true,
    persistSession: true,
  },
})
