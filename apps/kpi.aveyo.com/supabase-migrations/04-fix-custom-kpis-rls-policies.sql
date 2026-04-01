-- Migration: Fix RLS policies for custom_kpis table
-- This ensures authenticated users can create, update, and delete custom KPIs
-- Run this in Supabase SQL Editor

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Public can read active KPIs" ON custom_kpis;
DROP POLICY IF EXISTS "Public can read active non-hidden KPIs" ON custom_kpis;
DROP POLICY IF EXISTS "Authenticated can read all KPIs" ON custom_kpis;
DROP POLICY IF EXISTS "Authenticated can insert KPIs" ON custom_kpis;
DROP POLICY IF EXISTS "Authenticated can update KPIs" ON custom_kpis;
DROP POLICY IF EXISTS "Authenticated can delete KPIs" ON custom_kpis;

-- Recreate all policies

-- Public (unauthenticated) users can read active, non-hidden KPIs (for dashboard)
CREATE POLICY "Public can read active non-hidden KPIs"
  ON custom_kpis FOR SELECT
  USING (is_active = true AND is_hidden = false);

-- Authenticated users can read ALL KPIs (including hidden ones, for admin panel)
CREATE POLICY "Authenticated can read all KPIs"
  ON custom_kpis FOR SELECT
  USING (auth.role() = 'authenticated');

-- Authenticated users can insert new KPIs
CREATE POLICY "Authenticated can insert KPIs"
  ON custom_kpis FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update KPIs
CREATE POLICY "Authenticated can update KPIs"
  ON custom_kpis FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated users can delete KPIs
CREATE POLICY "Authenticated can delete KPIs"
  ON custom_kpis FOR DELETE
  TO authenticated
  USING (true);

-- Verify the policies
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'custom_kpis';
  
  RAISE NOTICE 'Total RLS policies for custom_kpis: %', policy_count;
  RAISE NOTICE 'RLS policies fixed successfully!';
  RAISE NOTICE '- Public: Read active, non-hidden KPIs';
  RAISE NOTICE '- Authenticated: Full CRUD access';
END $$;
