-- =============================================================================
-- KPI Dashboard — Complete Migration for org-chart Supabase Project
-- =============================================================================
-- Run this in the org-chart Supabase SQL editor ONCE.
-- Target project: https://semzdcsumfnmjnhzhtst.supabase.co
--
-- Prerequisites:
--   - `profiles` table with `is_admin` column already exists (from org-chart)
--   - `auth.users` table already exists (from Supabase)
--
-- This file consolidates all KPI dashboard migrations in order:
--   01  create-custom-kpis-table.sql
--   02  extend-custom-kpis-for-originals.sql
--   03  seed-original-kpis.sql  (skipped — data will be imported from export)
--   04  fix-custom-kpis-rls-policies.sql
--   05  create-section-order-table.sql
--   06  add-show-goal-to-custom-kpis.sql
--   07  add-display-order-to-custom-kpis.sql
--       goals table (new — was missing from original migrations)
-- =============================================================================


-- ============================================================
-- HELPER: updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 01: custom_kpis table
-- ============================================================
CREATE TABLE IF NOT EXISTS custom_kpis (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_id            text        UNIQUE NOT NULL,
  name              text        NOT NULL,
  description       text,
  format            text        NOT NULL CHECK (format IN ('number', 'currency', 'percentage', 'days')),
  formula_type      text        NOT NULL CHECK (formula_type IN ('sql', 'expression')),
  formula           text        NOT NULL,
  field_mappings    jsonb       DEFAULT '{}'::jsonb,
  available_periods text[]      NOT NULL DEFAULT ARRAY['current_week', 'previous_week', 'mtd', 'ytd']::text[],
  section_id        text        NOT NULL,
  is_active         boolean     DEFAULT true,
  created_by        uuid        REFERENCES auth.users(id),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE custom_kpis ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS custom_kpis_kpi_id_idx     ON custom_kpis(kpi_id);
CREATE INDEX IF NOT EXISTS custom_kpis_section_id_idx ON custom_kpis(section_id);
CREATE INDEX IF NOT EXISTS custom_kpis_is_active_idx  ON custom_kpis(is_active);

CREATE TRIGGER update_custom_kpis_updated_at
  BEFORE UPDATE ON custom_kpis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 02: Extend custom_kpis for original KPIs
-- ============================================================
ALTER TABLE custom_kpis
  ADD COLUMN IF NOT EXISTS is_original       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_hidden         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS secondary_formula text,
  ADD COLUMN IF NOT EXISTS secondary_format  text CHECK (secondary_format IN ('count', 'breakdown', 'text'));

CREATE INDEX IF NOT EXISTS custom_kpis_is_original_idx      ON custom_kpis(is_original);
CREATE INDEX IF NOT EXISTS custom_kpis_is_hidden_idx        ON custom_kpis(is_hidden);
CREATE INDEX IF NOT EXISTS custom_kpis_active_visible_idx   ON custom_kpis(is_active, is_hidden)
  WHERE is_active = true AND is_hidden = false;


-- ============================================================
-- 04: RLS policies (clean slate)
-- ============================================================
DROP POLICY IF EXISTS "Public can read active KPIs"             ON custom_kpis;
DROP POLICY IF EXISTS "Public can read active non-hidden KPIs"  ON custom_kpis;
DROP POLICY IF EXISTS "Authenticated can read all KPIs"         ON custom_kpis;
DROP POLICY IF EXISTS "Authenticated can insert KPIs"           ON custom_kpis;
DROP POLICY IF EXISTS "Authenticated can update KPIs"           ON custom_kpis;
DROP POLICY IF EXISTS "Authenticated can delete KPIs"           ON custom_kpis;

-- Authenticated users can read all KPIs
CREATE POLICY "Authenticated can read all KPIs"
  ON custom_kpis FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can mutate
CREATE POLICY "Admins can insert KPIs"
  ON custom_kpis FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update KPIs"
  ON custom_kpis FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete KPIs"
  ON custom_kpis FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );


-- ============================================================
-- 05: section_order table
-- ============================================================
CREATE TABLE IF NOT EXISTS section_order (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id    text        UNIQUE NOT NULL,
  display_order integer     NOT NULL,
  is_active     boolean     DEFAULT true,
  updated_by    uuid        REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE section_order ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read section order"          ON section_order;
DROP POLICY IF EXISTS "Authenticated can insert section order" ON section_order;
DROP POLICY IF EXISTS "Authenticated can update section order" ON section_order;
DROP POLICY IF EXISTS "Authenticated can delete section order" ON section_order;

CREATE POLICY "Authenticated can read section order"
  ON section_order FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert section order"
  ON section_order FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update section order"
  ON section_order FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete section order"
  ON section_order FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE INDEX IF NOT EXISTS section_order_display_order_idx ON section_order(display_order);
CREATE INDEX IF NOT EXISTS section_order_section_id_idx    ON section_order(section_id);

CREATE TRIGGER update_section_order_updated_at
  BEFORE UPDATE ON section_order
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Default rows (will be overwritten by data import if it already has data)
INSERT INTO section_order (section_id, display_order, is_active) VALUES
  ('sales_stats',            1, true),
  ('operations_stats',       2, true),
  ('cycle_times',            3, true),
  ('residential_financials', 4, true),
  ('active_pipeline',        5, true),
  ('finance',                6, true),
  ('commercial',             7, true)
ON CONFLICT (section_id) DO NOTHING;


-- ============================================================
-- 06: show_goal column
-- ============================================================
ALTER TABLE custom_kpis
  ADD COLUMN IF NOT EXISTS show_goal boolean DEFAULT false;


-- ============================================================
-- 07: display_order column
-- ============================================================
ALTER TABLE custom_kpis
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS custom_kpis_display_order_idx
  ON custom_kpis(section_id, display_order);


-- ============================================================
-- NEW: goals table
-- ============================================================
CREATE TABLE IF NOT EXISTS goals (
  id         bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kpi_id     text        NOT NULL REFERENCES custom_kpis(kpi_id) ON DELETE CASCADE,
  period     text        NOT NULL,
  value      numeric     NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (kpi_id, period)
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read goals"
  ON goals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert goals"
  ON goals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update goals"
  ON goals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete goals"
  ON goals FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE INDEX IF NOT EXISTS goals_kpi_id_idx ON goals(kpi_id);
CREATE INDEX IF NOT EXISTS goals_period_idx ON goals(period);

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
