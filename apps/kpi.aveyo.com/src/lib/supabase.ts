import { createClient } from '@supabase/supabase-js';
import { supabaseCookieStorage } from './cookie-storage';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file');
}

// Client for browser/client-side — uses shared .aveyo.com cookie so session
// is readable by both kpi.aveyo.com and orgchart.aveyo.com
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: supabaseCookieStorage,
    storageKey: 'sb-aveyo-auth',
    autoRefreshToken: true,
    persistSession: true,
  },
});

// Service role client for server-side admin/internal reads (bypasses RLS)
export const getServiceRoleClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// Database types
export interface GoalRecord {
  id: number;
  kpi_id: string;
  period: string;
  value: number;
  created_at: string;
  updated_at: string;
}

export interface GoalsTable {
  Row: GoalRecord;
  Insert: Omit<GoalRecord, 'id' | 'created_at' | 'updated_at'>;
  Update: Partial<Omit<GoalRecord, 'id' | 'created_at' | 'updated_at'>>;
}

export interface CustomKPIRecord {
  id: string;
  kpi_id: string;
  name: string;
  description: string | null;
  format: 'number' | 'currency' | 'percentage' | 'days';
  formula_type: 'sql' | 'expression';
  formula: string;
  field_mappings: Record<string, any>;
  available_periods: string[];
  section_id: string;
  is_active: boolean;
  is_original: boolean;
  is_hidden: boolean;
  show_goal: boolean;
  display_order: number;
  secondary_formula: string | null;
  secondary_format: 'count' | 'breakdown' | 'text' | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomKPIsTable {
  Row: CustomKPIRecord;
  Insert: Omit<CustomKPIRecord, 'id' | 'created_at' | 'updated_at'>;
  Update: Partial<Omit<CustomKPIRecord, 'id' | 'created_at' | 'updated_at'>>;
}

export interface Database {
  public: {
    Tables: {
      goals: GoalsTable;
      custom_kpis: CustomKPIsTable;
    };
  };
}



