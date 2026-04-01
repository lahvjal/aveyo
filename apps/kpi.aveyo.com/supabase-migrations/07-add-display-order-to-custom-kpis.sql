-- Migration: Add display_order column to custom_kpis table
-- This enables ordering of KPIs within each section
-- Run this in Supabase SQL Editor

-- Add display_order column
ALTER TABLE custom_kpis
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Create index for performance (section_id + display_order for ordered queries)
CREATE INDEX IF NOT EXISTS custom_kpis_display_order_idx 
  ON custom_kpis(section_id, display_order);

-- Update existing KPIs to have sequential display_order within their sections
-- This ensures existing KPIs have proper ordering based on creation time
WITH ranked_kpis AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY section_id ORDER BY created_at) as row_num
  FROM custom_kpis
)
UPDATE custom_kpis
SET display_order = ranked_kpis.row_num
FROM ranked_kpis
WHERE custom_kpis.id = ranked_kpis.id;

-- Verify the migration
DO $$
DECLARE
  kpi_count integer;
  sections_count integer;
BEGIN
  SELECT COUNT(*) INTO kpi_count FROM custom_kpis;
  SELECT COUNT(DISTINCT section_id) INTO sections_count FROM custom_kpis;
  
  RAISE NOTICE 'Display order column added successfully!';
  RAISE NOTICE 'Total KPIs: %', kpi_count;
  RAISE NOTICE 'Sections with KPIs: %', sections_count;
  RAISE NOTICE 'All KPIs now have sequential display_order within their sections';
END $$;
