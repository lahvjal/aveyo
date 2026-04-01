-- Migration: Add show_goal column to custom_kpis table
-- This allows each KPI to specify whether it should display goal progress

-- Add show_goal column (defaults to false for custom KPIs)
ALTER TABLE custom_kpis
ADD COLUMN IF NOT EXISTS show_goal BOOLEAN DEFAULT false;

-- Update original KPIs that should show goals
-- Based on DASHBOARD_SECTIONS in src/types/kpi.ts

UPDATE custom_kpis
SET show_goal = true
WHERE kpi_id IN (
  'total_sales',
  'installs_complete',
  'avg_days_pp_to_install',
  'avg_days_install_to_m2',
  'avg_days_pp_to_pto',
  'total_kw_scheduled',
  'total_kw_installed'
);

-- Verify the update
SELECT kpi_id, name, show_goal
FROM custom_kpis
WHERE show_goal = true
ORDER BY kpi_id;
