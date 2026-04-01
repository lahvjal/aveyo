-- Migration: Seed original (built-in) KPIs
-- This migrates all built-in KPIs from TypeScript code to the database
-- Run this in Supabase SQL Editor AFTER running migration 02

-- IMPORTANT: This migration follows a specific order:
-- 1. Component KPIs (hidden) - used by other KPIs
-- 2. Simple SQL KPIs
-- 3. Complex expression KPIs (use components)
-- 4. Goal KPIs (hidden)

-- ===========================================================================
-- COMPONENT KPIs (Hidden - used in other formulas)
-- ===========================================================================

-- M2/M3 Outstanding Components
INSERT INTO custom_kpis (
  kpi_id, name, description, format, formula_type, formula, field_mappings,
  available_periods, section_id, is_original, is_active, is_hidden
) VALUES
(
  'ar_m2_outstanding',
  'M2 Outstanding',
  'M2 milestone amount (80%) submitted but not received',
  'currency',
  'sql',
  'SELECT SUM(f.`contract-price` * 0.8) as value
   FROM funding f
   LEFT JOIN `timeline` t ON f.project_ids = t.`project-dev-id`
   WHERE f.`m2-submitted-date` IS NOT NULL
     AND f.`m2-received-date` IS NULL
     AND f.`project-status-2` IN (''Active'', ''New Lender'', ''Finance Hold'', ''Pre-Approvals'')
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')',
  '{}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'residential_financials',
  true,
  true,
  true
),
(
  'ar_m3_outstanding',
  'M3 Outstanding',
  'M3 milestone amount (20%) submitted but not received',
  'currency',
  'sql',
  'SELECT SUM(f.`contract-price` * 0.2) as value
   FROM funding f
   LEFT JOIN `timeline` t ON f.project_ids = t.`project-dev-id`
   WHERE f.`m3-submitted-date` IS NOT NULL
     AND f.`m3-received-date` IS NULL
     AND f.`project-status-2` IN (''Active'', ''New Lender'', ''Finance Hold'', ''Pre-Approvals'')
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')',
  '{}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'residential_financials',
  true,
  true,
  true
),

-- Revenue Components
(
  'revenue_m1',
  'M1 Revenue',
  'M1 milestone revenue (20%) received in period',
  'currency',
  'sql',
  'SELECT SUM(pd.`contract-price` * 0.2) as value
   FROM `project-data` pd
   LEFT JOIN `timeline` t ON pd.`project-dev-id` = t.`project-dev-id`
   WHERE pd.`m1-received-date` IS NOT NULL
     AND {{dateFilter}}
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')',
  '{"dateField": "pd.`m1-received-date`"}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'residential_financials',
  true,
  true,
  true
),
(
  'revenue_m2',
  'M2 Revenue',
  'M2 milestone revenue (80%) received in period',
  'currency',
  'sql',
  'SELECT SUM(pd.`contract-price` * 0.8) as value
   FROM `project-data` pd
   LEFT JOIN `timeline` t ON pd.`project-dev-id` = t.`project-dev-id`
   WHERE pd.`m2-received-date` IS NOT NULL
     AND {{dateFilter}}
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')',
  '{"dateField": "pd.`m2-received-date`"}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'residential_financials',
  true,
  true,
  true
);

-- ===========================================================================
-- SIMPLE SQL KPIs
-- ===========================================================================

INSERT INTO custom_kpis (
  kpi_id, name, description, format, formula_type, formula, field_mappings,
  available_periods, section_id, is_original, is_active, is_hidden
) VALUES

-- Sales Stats
(
  'total_sales',
  'Total Sales',
  'Number of residential contracts sold',
  'number',
  'sql',
  'SELECT COUNT(*) as value
   FROM `timeline` t
   LEFT JOIN `project-data` pd ON t.`project-dev-id` = pd.`project-dev-id`
   WHERE t.`contract-signed` IS NOT NULL
     AND pd.`project-status` != ''Cancelled''
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND {{dateFilter}}',
  '{"dateField": "t.`contract-signed`"}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'sales_stats',
  true,
  true,
  false
),
(
  'aveyo_approved',
  'Aveyo Approved',
  'Sales that passed internal QA/validation',
  'number',
  'sql',
  'SELECT COUNT(DISTINCT sow.`project-id`) as value
   FROM `customer-sow` sow
   LEFT JOIN `project-data` pd ON sow.`project-id` = pd.`project-id`
   WHERE sow.`sow-approved-timestamp` IS NOT NULL
     AND pd.`project-status` != ''Cancelled''
     AND {{dateFilter}}',
  '{"dateField": "sow.`sow-approved-timestamp`"}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'sales_stats',
  true,
  true,
  false
),

-- Operations Stats
(
  'jobs_on_hold',
  'Jobs Placed ON HOLD',
  'Jobs paused due to outstanding requirements',
  'number',
  'sql',
  'SELECT COUNT(*) as value
   FROM `project-data` pd
   LEFT JOIN `timeline` t ON pd.`project-dev-id` = t.`project-dev-id`
   WHERE pd.`project-status` = ''On Hold''
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')',
  '{}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'operations_stats',
  true,
  true,
  false
),
(
  'installs_complete',
  'Installs Complete',
  'Total installations completed',
  'number',
  'sql',
  'SELECT COUNT(*) as value
   FROM `timeline` t
   WHERE t.`install-complete` IS NOT NULL
     AND t.`install-stage-status` = ''Complete''
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND {{dateFilter}}',
  '{"dateField": "t.`install-complete`"}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'operations_stats',
  true,
  true,
  false
),
(
  'install_complete_no_pto',
  'Install Complete NO PTO',
  'Installs finished but awaiting Permission to Operate',
  'number',
  'sql',
  'SELECT COUNT(*) as value
   FROM `timeline` t
   WHERE t.`install-complete` IS NOT NULL
     AND t.`pto-received` IS NULL
     AND t.`install-stage-status` = ''Complete''
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND {{dateFilter}}',
  '{"dateField": "t.`install-complete`"}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'operations_stats',
  true,
  true,
  false
),
(
  'install_scheduled',
  'Install Scheduled',
  'Future installations on calendar',
  'number',
  'sql',
  'SELECT COUNT(*) as value
   FROM `timeline` t
   WHERE t.`install-appointment` IS NOT NULL
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND {{dateFilter}}',
  '{"dateField": "t.`install-appointment`"}',
  ARRAY['current_week', 'previous_week', 'next_week'],
  'operations_stats',
  true,
  true,
  false
),
(
  'pto_received_count',
  'PTO Received',
  'Number of PTOs received in period',
  'number',
  'sql',
  'SELECT COUNT(*) as value
   FROM `timeline` t
   WHERE t.`pto-received` IS NOT NULL
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND {{dateFilter}}',
  '{"dateField": "t.`pto-received`"}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'operations_stats',
  true,
  true,
  false
),
(
  'active_install_not_started',
  '# of Active Jobs; Install Not Started',
  'Active jobs without an install appointment scheduled',
  'number',
  'sql',
  'SELECT COUNT(*) as value
   FROM `project-data` pd
   LEFT JOIN `timeline` t ON pd.`project-dev-id` = t.`project-dev-id`
   WHERE pd.`project-status` = ''Active''
     AND t.`install-appointment` IS NULL
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')',
  '{}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'operations_stats',
  true,
  true,
  false
),

-- Active Pipeline
(
  'active_no_pto',
  'Active Pipeline (Active NO PTO)',
  'Active jobs that haven''t achieved PTO',
  'number',
  'sql',
  'SELECT COUNT(*) as value
   FROM `project-data` pd
   LEFT JOIN `timeline` t ON pd.`project-dev-id` = t.`project-dev-id`
   WHERE pd.`project-status` IN (''Active'', ''Complete'', ''Pre-Approvals'', ''New Lender'', ''Finance Hold'')
     AND t.`pto-received` IS NULL
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')',
  '{}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'active_pipeline',
  true,
  true,
  false
),

-- Cycle Times
(
  'avg_days_pp_to_install',
  'Avg Days PP → Install Start',
  'Time from Perfect Packet to install start',
  'days',
  'sql',
  'SELECT AVG(DATEDIFF(t.`install-appointment`, t.`packet-approval`)) as value
   FROM `timeline` t
   WHERE t.`packet-approval` IS NOT NULL
     AND t.`install-appointment` IS NOT NULL
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND {{dateFilter}}',
  '{"dateField": "t.`install-appointment`"}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'cycle_times',
  true,
  true,
  false
),
(
  'avg_days_install_to_m2',
  'Avg Days Install → M2 Approved',
  'Time from install appointment to M2 milestone',
  'days',
  'sql',
  'SELECT AVG(DATEDIFF(pd.`m2-approved`, t.`install-appointment`)) as value
   FROM `timeline` t
   INNER JOIN `project-data` pd ON t.`project-dev-id` = pd.`project-dev-id`
   WHERE t.`install-appointment` IS NOT NULL
     AND pd.`m2-approved` IS NOT NULL
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND {{dateFilter}}',
  '{"dateField": "pd.`m2-approved`"}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'cycle_times',
  true,
  true,
  false
),
(
  'avg_days_pp_to_pto',
  'Avg Days PP → PTO',
  'Total time from PP submission to PTO',
  'days',
  'sql',
  'SELECT AVG(DATEDIFF(t.`pto-received`, t.`packet-approval`)) as value
   FROM `timeline` t
   WHERE t.`packet-approval` IS NOT NULL
     AND t.`pto-received` IS NOT NULL
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND {{dateFilter}}',
  '{"dateField": "t.`pto-received`"}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'cycle_times',
  true,
  true,
  false
),
(
  'avg_sale_to_glass',
  'Avg Days Sale → Glass on Roof',
  'Time from contract signing to panel installation',
  'days',
  'sql',
  'SELECT AVG(DATEDIFF(t.`panel-install-complete`, t.`contract-signed`)) as value
   FROM `timeline` t
   LEFT JOIN `project-data` pd ON t.`project-dev-id` = pd.`project-dev-id`
   WHERE t.`contract-signed` IS NOT NULL
     AND t.`panel-install-complete` IS NOT NULL
     AND pd.`project-status` != ''Cancelled''
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND {{dateFilter}}',
  '{"dateField": "t.`panel-install-complete`"}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'cycle_times',
  true,
  true,
  false
),
(
  'avg_sale_to_pto',
  'Avg Days Sale → PTO',
  'Complete cycle time from contract to energization approval',
  'days',
  'sql',
  'SELECT AVG(DATEDIFF(t.`pto-received`, t.`contract-signed`)) as value
   FROM `timeline` t
   LEFT JOIN `project-data` pd ON t.`project-dev-id` = pd.`project-dev-id`
   WHERE t.`contract-signed` IS NOT NULL
     AND t.`pto-received` IS NOT NULL
     AND pd.`project-status` != ''Cancelled''
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND {{dateFilter}}',
  '{"dateField": "t.`pto-received`"}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'cycle_times',
  true,
  true,
  false
),

-- Commercial Division
(
  'total_kw_scheduled',
  'Total KW Scheduled',
  'KW capacity scheduled for installation',
  'number',
  'sql',
  'SELECT SUM(pd.`system-size`) as value
   FROM `timeline` t
   INNER JOIN `project-data` pd ON t.`project-dev-id` = pd.`project-dev-id`
   WHERE t.`install-appointment` IS NOT NULL
     AND t.`install-complete` IS NULL
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND {{dateFilter}}',
  '{"dateField": "t.`install-appointment`"}',
  ARRAY['current_week', 'previous_week', 'next_week'],
  'commercial',
  true,
  true,
  false
),
(
  'total_kw_installed',
  'Total KW Installed',
  'KW capacity actually installed',
  'number',
  'sql',
  'SELECT SUM(pd.`system-size`) as value
   FROM `timeline` t
   INNER JOIN `project-data` pd ON t.`project-dev-id` = pd.`project-dev-id`
   WHERE t.`install-complete` IS NOT NULL
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND {{dateFilter}}',
  '{"dateField": "t.`install-complete`"}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'commercial',
  true,
  true,
  false
);

-- ===========================================================================
-- COMPLEX EXPRESSION KPIs (use component KPIs)
-- ===========================================================================

INSERT INTO custom_kpis (
  kpi_id, name, description, format, formula_type, formula, field_mappings,
  available_periods, section_id, is_original, is_active, is_hidden,
  secondary_formula, secondary_format
) VALUES
(
  'ar_m2_m3',
  'A/R (M2/M3 Submitted Not Received)',
  'Outstanding accounts receivable from M2 and M3 milestones',
  'currency',
  'expression',
  '@ar_m2_outstanding + @ar_m3_outstanding',
  '{}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'residential_financials',
  true,
  true,
  false,
  'SELECT 
    COUNT(DISTINCT f.project_ids) as total_count,
    SUM(CASE WHEN f.`m2-submitted-date` IS NOT NULL AND f.`m2-received-date` IS NULL THEN 1 ELSE 0 END) as m2_count,
    SUM(CASE WHEN f.`m3-submitted-date` IS NOT NULL AND f.`m3-received-date` IS NULL THEN 1 ELSE 0 END) as m3_count
   FROM funding f
   LEFT JOIN `timeline` t ON f.project_ids = t.`project-dev-id`
   WHERE f.`project-status-2` IN (''Active'', ''New Lender'', ''Finance Hold'', ''Pre-Approvals'')
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND ((f.`m2-submitted-date` IS NOT NULL AND f.`m2-received-date` IS NULL)
       OR (f.`m3-submitted-date` IS NOT NULL AND f.`m3-received-date` IS NULL))',
  'breakdown'
),
(
  'revenue_received',
  'Revenue Received',
  'Payments received in period from M1 and M2 milestones',
  'currency',
  'expression',
  '@revenue_m1 + @revenue_m2',
  '{}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'residential_financials',
  true,
  true,
  false,
  'SELECT COUNT(DISTINCT pd.`project-dev-id`) as value
   FROM `project-data` pd
   LEFT JOIN `timeline` t ON pd.`project-dev-id` = t.`project-dev-id`
   WHERE ((pd.`m1-received-date` IS NOT NULL AND {{dateFilter}})
      OR (pd.`m2-received-date` IS NOT NULL AND {{dateFilter}}))
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')',
  'count'
);

-- ===========================================================================
-- PERCENTAGE KPIs (with breakdowns)
-- ===========================================================================

INSERT INTO custom_kpis (
  kpi_id, name, description, format, formula_type, formula, field_mappings,
  available_periods, section_id, is_original, is_active, is_hidden,
  secondary_formula, secondary_format
) VALUES
(
  'pull_through_rate',
  'Pull Through Rate',
  'Jobs with Install Complete / Total Jobs (for selected period)',
  'percentage',
  'sql',
  'SELECT 
    (COUNT(CASE WHEN t.`install-complete` IS NOT NULL THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as value
   FROM `timeline` t
   LEFT JOIN `project-data` pd ON t.`project-dev-id` = pd.`project-dev-id`
   WHERE t.`contract-signed` IS NOT NULL
     AND pd.`project-status` != ''Cancelled''
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND {{dateFilter}}',
  '{"dateField": "t.`contract-signed`"}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'sales_stats',
  true,
  true,
  false,
  'SELECT 
    COUNT(CASE WHEN t.`install-complete` IS NOT NULL THEN 1 END) as complete_count,
    COUNT(*) as total_count
   FROM `timeline` t
   LEFT JOIN `project-data` pd ON t.`project-dev-id` = pd.`project-dev-id`
   WHERE t.`contract-signed` IS NOT NULL
     AND pd.`project-status` != ''Cancelled''
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND {{dateFilter}}',
  'breakdown'
),
(
  'battery_percentage',
  '% Jobs with Battery',
  'Percentage of sold jobs that include battery storage',
  'percentage',
  'sql',
  'SELECT 
    (COUNT(CASE WHEN pd.`battery-count` > 0 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as value
   FROM `project-data` pd
   INNER JOIN `timeline` t ON pd.`project-dev-id` = t.`project-dev-id`
   WHERE t.`contract-signed` IS NOT NULL
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND {{dateFilter}}',
  '{"dateField": "t.`contract-signed`"}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'sales_stats',
  true,
  true,
  false,
  'SELECT 
    COUNT(CASE WHEN pd.`battery-count` > 0 THEN 1 END) as battery_count,
    COUNT(*) as total_count
   FROM `project-data` pd
   INNER JOIN `timeline` t ON pd.`project-dev-id` = t.`project-dev-id`
   WHERE t.`contract-signed` IS NOT NULL
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND {{dateFilter}}',
  'breakdown'
),
(
  'packet_approval_percentage',
  '% of Packet Approvals',
  'Percentage of sales that received packet approval',
  'percentage',
  'sql',
  'SELECT 
    (COUNT(CASE WHEN t.`packet-approval` IS NOT NULL THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as value
   FROM `timeline` t
   LEFT JOIN `project-data` pd ON t.`project-dev-id` = pd.`project-dev-id`
   WHERE t.`contract-signed` IS NOT NULL
     AND pd.`project-status` != ''Cancelled''
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND {{dateFilter}}',
  '{"dateField": "t.`contract-signed`"}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'sales_stats',
  true,
  true,
  false,
  'SELECT 
    COUNT(CASE WHEN t.`packet-approval` IS NOT NULL THEN 1 END) as approved_count,
    COUNT(*) as total_count
   FROM `timeline` t
   LEFT JOIN `project-data` pd ON t.`project-dev-id` = pd.`project-dev-id`
   WHERE t.`contract-signed` IS NOT NULL
     AND pd.`project-status` != ''Cancelled''
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND {{dateFilter}}',
  'breakdown'
);

-- ===========================================================================
-- ROLLING AVERAGE KPIs
-- ===========================================================================

INSERT INTO custom_kpis (
  kpi_id, name, description, format, formula_type, formula, field_mappings,
  available_periods, section_id, is_original, is_active, is_hidden,
  secondary_formula, secondary_format
) VALUES
(
  'pull_through_rolling_6m',
  'Pull Through % (Rolling 6M)',
  'Percentage of jobs sold 61-180 days ago that reached install complete',
  'percentage',
  'sql',
  'SELECT 
    (COUNT(CASE WHEN t.`install-complete` IS NOT NULL THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as value
   FROM `timeline` t
   LEFT JOIN `project-data` pd ON t.`project-dev-id` = pd.`project-dev-id`
   WHERE t.`contract-signed` BETWEEN DATE_SUB(CURDATE(), INTERVAL 180 DAY) AND DATE_SUB(CURDATE(), INTERVAL 61 DAY)
     AND pd.`project-status` != ''Cancelled''
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')',
  '{}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'sales_stats',
  true,
  true,
  false,
  'SELECT 
    COUNT(CASE WHEN t.`install-complete` IS NOT NULL THEN 1 END) as complete_count,
    COUNT(*) as total_count
   FROM `timeline` t
   LEFT JOIN `project-data` pd ON t.`project-dev-id` = pd.`project-dev-id`
   WHERE t.`contract-signed` BETWEEN DATE_SUB(CURDATE(), INTERVAL 180 DAY) AND DATE_SUB(CURDATE(), INTERVAL 61 DAY)
     AND pd.`project-status` != ''Cancelled''
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')',
  'breakdown'
),
(
  'max_pull_through_rolling_6m',
  'Max Pull Through % (Rolling 6M)',
  'Percentage of jobs sold 61-180 days ago that are still active or complete',
  'percentage',
  'sql',
  'SELECT 
    (COUNT(CASE WHEN pd.`project-status` IN (''Active'', ''Complete'', ''Pre-Approvals'', ''New Lender'', ''Finance Hold'') THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as value
   FROM `timeline` t
   LEFT JOIN `project-data` pd ON t.`project-dev-id` = pd.`project-dev-id`
   WHERE t.`contract-signed` BETWEEN DATE_SUB(CURDATE(), INTERVAL 180 DAY) AND DATE_SUB(CURDATE(), INTERVAL 61 DAY)
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')',
  '{}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'sales_stats',
  true,
  true,
  false,
  'SELECT 
    COUNT(CASE WHEN pd.`project-status` IN (''Active'', ''Complete'', ''Pre-Approvals'', ''New Lender'', ''Finance Hold'') THEN 1 END) as active_count,
    COUNT(*) as total_count
   FROM `timeline` t
   LEFT JOIN `project-data` pd ON t.`project-dev-id` = pd.`project-dev-id`
   WHERE t.`contract-signed` BETWEEN DATE_SUB(CURDATE(), INTERVAL 180 DAY) AND DATE_SUB(CURDATE(), INTERVAL 61 DAY)
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')',
  'breakdown'
);

-- ===========================================================================
-- FINANCE BUCKET KPIs
-- ===========================================================================

INSERT INTO custom_kpis (
  kpi_id, name, description, format, formula_type, formula, field_mappings,
  available_periods, section_id, is_original, is_active, is_hidden,
  secondary_formula, secondary_format
) VALUES
(
  'install_started_m2_not_received',
  'Install Started – M2 Not Received',
  'Amount owed for completed installs pending M2 payment',
  'currency',
  'sql',
  'SELECT SUM(f.`contract-price` * 0.8) as value
   FROM `timeline` t
   INNER JOIN funding f ON t.`project-dev-id` = f.project_ids
   LEFT JOIN `project-data` pd ON t.`project-dev-id` = pd.`project-dev-id`
   WHERE t.`install-complete` IS NOT NULL
     AND f.`m2-received-date` IS NULL
     AND pd.`project-status` IN (''Active'', ''Complete'', ''Pre-Approvals'', ''New Lender'', ''Finance Hold'')
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')',
  '{}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'finance',
  true,
  true,
  false,
  'SELECT COUNT(DISTINCT t.`project-dev-id`) as value
   FROM `timeline` t
   INNER JOIN funding f ON t.`project-dev-id` = f.project_ids
   LEFT JOIN `project-data` pd ON t.`project-dev-id` = pd.`project-dev-id`
   WHERE t.`install-complete` IS NOT NULL
     AND f.`m2-received-date` IS NULL
     AND pd.`project-status` IN (''Active'', ''Complete'', ''Pre-Approvals'', ''New Lender'', ''Finance Hold'')
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')',
  'count'
),
(
  'pto_received_m3_not_received',
  'PTO Received – M3 Not Received',
  'Amount owed for PTO-complete projects pending M3 payment',
  'currency',
  'sql',
  'SELECT SUM(f.`contract-price` * 0.2) as value
   FROM `timeline` t
   INNER JOIN funding f ON t.`project-dev-id` = f.project_ids
   LEFT JOIN `project-data` pd ON t.`project-dev-id` = pd.`project-dev-id`
   WHERE t.`pto-received` IS NOT NULL
     AND f.`m3-received-date` IS NULL
     AND pd.`project-status` IN (''Active'', ''Complete'', ''Pre-Approvals'', ''New Lender'', ''Finance Hold'')
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')',
  '{}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'finance',
  true,
  true,
  false,
  'SELECT COUNT(DISTINCT t.`project-dev-id`) as value
   FROM `timeline` t
   INNER JOIN funding f ON t.`project-dev-id` = f.project_ids
   LEFT JOIN `project-data` pd ON t.`project-dev-id` = pd.`project-dev-id`
   WHERE t.`pto-received` IS NOT NULL
     AND f.`m3-received-date` IS NULL
     AND pd.`project-status` IN (''Active'', ''Complete'', ''Pre-Approvals'', ''New Lender'', ''Finance Hold'')
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')',
  'count'
),
(
  'install_m2_not_approved',
  'Install Complete M2 Not Approved',
  'Financial backlog - install done but M2 incomplete',
  'currency',
  'sql',
  'SELECT SUM(pd.`contract-price` * 0.8) as value
   FROM `timeline` t
   INNER JOIN `project-data` pd ON t.`project-dev-id` = pd.`project-dev-id`
   WHERE t.`install-complete` IS NOT NULL
     AND pd.`m2-approved` IS NULL
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')',
  '{}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'residential_financials',
  true,
  true,
  false,
  NULL,
  NULL
);

-- ===========================================================================
-- SALES STATS - Additional KPIs
-- ===========================================================================

INSERT INTO custom_kpis (
  kpi_id, name, description, format, formula_type, formula, field_mappings,
  available_periods, section_id, is_original, is_active, is_hidden,
  secondary_formula, secondary_format
) VALUES
(
  'reps_with_sale',
  'Reps with a Sale',
  'Number of unique sales reps (closers + setters) who closed deals',
  'number',
  'sql',
  'SELECT 
    (COUNT(DISTINCT pd.`sales-rep-id`) + COUNT(DISTINCT pd.`setter-id`)) as value
   FROM `project-data` pd
   INNER JOIN `timeline` t ON pd.`project-dev-id` = t.`project-dev-id`
   WHERE t.`contract-signed` IS NOT NULL
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND {{dateFilter}}',
  '{"dateField": "t.`contract-signed`"}',
  ARRAY['current_week', 'previous_week', 'mtd', 'ytd'],
  'sales_stats',
  true,
  true,
  false,
  'SELECT 
    COUNT(DISTINCT pd.`sales-rep-id`) as closer_count,
    COUNT(DISTINCT pd.`setter-id`) as setter_count
   FROM `project-data` pd
   INNER JOIN `timeline` t ON pd.`project-dev-id` = t.`project-dev-id`
   WHERE t.`contract-signed` IS NOT NULL
     AND (t.`cancellation-reason` IS NULL OR t.`cancellation-reason` != ''Duplicate Project (Error)'')
     AND {{dateFilter}}',
  'breakdown'
);

-- ===========================================================================
-- GOAL KPIs (Hidden - only used for comparisons)
-- ===========================================================================

-- NOTE: Goal KPIs require special handling as they fetch from goals table
-- These are placeholders. Actual goal fetching happens via getGoal() function
-- For now, these remain in TypeScript until we implement goal fetch via SQL

-- ===========================================================================
-- MIGRATION VERIFICATION
-- ===========================================================================

DO $$
DECLARE
  kpi_count INTEGER;
  original_count INTEGER;
  hidden_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO kpi_count FROM custom_kpis WHERE is_original = true;
  SELECT COUNT(*) INTO original_count FROM custom_kpis WHERE is_original = true AND is_hidden = false;
  SELECT COUNT(*) INTO hidden_count FROM custom_kpis WHERE is_original = true AND is_hidden = true;
  
  RAISE NOTICE '================================================================================';
  RAISE NOTICE 'KPI Seeding Migration Completed!';
  RAISE NOTICE '================================================================================';
  RAISE NOTICE 'Total Original KPIs: %', kpi_count;
  RAISE NOTICE 'Visible Original KPIs: %', original_count;
  RAISE NOTICE 'Hidden Component KPIs: %', hidden_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Test KPIs via /kpis admin interface';
  RAISE NOTICE '2. Verify values match TypeScript versions';
  RAISE NOTICE '3. Continue adding remaining KPIs using admin interface';
  RAISE NOTICE '4. Run validation tests when complete';
  RAISE NOTICE '================================================================================';
END $$;
