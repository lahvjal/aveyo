-- Migration: Extend custom_kpis table for original KPIs
-- This adds support for:
-- - Distinguishing original (built-in) vs custom KPIs
-- - Hiding component KPIs from dashboard
-- - Secondary formulas and values
-- Run this in Supabase SQL Editor

-- Add new columns
ALTER TABLE custom_kpis
  ADD COLUMN IF NOT EXISTS is_original boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS secondary_formula text,
  ADD COLUMN IF NOT EXISTS secondary_format text CHECK (secondary_format IN ('count', 'breakdown', 'text'));

-- Add comments for documentation
COMMENT ON COLUMN custom_kpis.is_original IS 'True for built-in KPIs, false for user-created custom KPIs';
COMMENT ON COLUMN custom_kpis.is_hidden IS 'Hide from dashboard but available for use in formulas (like component KPIs)';
COMMENT ON COLUMN custom_kpis.secondary_formula IS 'Optional SQL query for secondary value (e.g., project count, breakdown)';
COMMENT ON COLUMN custom_kpis.secondary_format IS 'How to format secondary value: count, breakdown, or text';

-- Update RLS policy to respect hidden flag for public reads
-- Drop existing policy
DROP POLICY IF EXISTS "Public can read active KPIs" ON custom_kpis;

-- Recreate with hidden flag filter
CREATE POLICY "Public can read active non-hidden KPIs"
  ON custom_kpis FOR SELECT
  USING (is_active = true AND is_hidden = false);

-- Admin view: Authenticated users can see all KPIs including hidden ones
CREATE POLICY "Authenticated can read all KPIs"
  ON custom_kpis FOR SELECT
  USING (auth.role() = 'authenticated');

-- Update indexes for new columns
CREATE INDEX IF NOT EXISTS custom_kpis_is_original_idx ON custom_kpis(is_original);
CREATE INDEX IF NOT EXISTS custom_kpis_is_hidden_idx ON custom_kpis(is_hidden);

-- Create composite index for common query pattern
CREATE INDEX IF NOT EXISTS custom_kpis_active_visible_idx 
  ON custom_kpis(is_active, is_hidden) 
  WHERE is_active = true AND is_hidden = false;

-- Verify changes
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'New columns added: is_original, is_hidden, secondary_formula, secondary_format';
  RAISE NOTICE 'RLS policies updated to respect hidden flag';
  RAISE NOTICE 'Indexes created for performance';
END $$;
