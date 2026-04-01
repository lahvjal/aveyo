-- Safe non-production seed data.
-- This file is intentionally minimal and idempotent.

INSERT INTO public.departments (name, color, description)
VALUES
  ('Sales', '#16a34a', 'Revenue and pre-sale operations'),
  ('Customer Care', '#0284c7', 'Customer-facing support and intake'),
  ('Operations', '#9333ea', 'Project and field operations'),
  ('Finance', '#f59e0b', 'Funding and financial workflows')
ON CONFLICT (name) DO UPDATE
SET
  color = EXCLUDED.color,
  description = EXCLUDED.description;

INSERT INTO public.custom_kpis (
  kpi_id,
  name,
  description,
  format,
  formula_type,
  formula,
  section_id,
  is_active,
  show_goal,
  display_order
)
VALUES (
  'seed_pipeline_health',
  'Seed Pipeline Health',
  'Non-production KPI to validate migration and read paths.',
  'number',
  'expression',
  '0',
  'sales_stats',
  true,
  true,
  999
)
ON CONFLICT (kpi_id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  format = EXCLUDED.format,
  formula_type = EXCLUDED.formula_type,
  formula = EXCLUDED.formula,
  section_id = EXCLUDED.section_id,
  is_active = EXCLUDED.is_active,
  show_goal = EXCLUDED.show_goal,
  display_order = EXCLUDED.display_order;

INSERT INTO public.goals (kpi_id, period, value)
VALUES
  ('seed_pipeline_health', 'current_week', 1),
  ('seed_pipeline_health', 'mtd', 4),
  ('seed_pipeline_health', 'ytd', 20)
ON CONFLICT (kpi_id, period) DO UPDATE
SET value = EXCLUDED.value;
