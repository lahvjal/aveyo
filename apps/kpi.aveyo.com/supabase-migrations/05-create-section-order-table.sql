-- Migration: Create section_order table
-- This table stores the display order of dashboard sections
-- Run this in Supabase SQL Editor

-- Create the table
CREATE TABLE IF NOT EXISTS section_order (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id text UNIQUE NOT NULL,
  display_order integer NOT NULL,
  is_active boolean DEFAULT true,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add comments for documentation
COMMENT ON TABLE section_order IS 'Stores the display order of dashboard sections';
COMMENT ON COLUMN section_order.section_id IS 'Section identifier (e.g., sales_stats, operations_stats)';
COMMENT ON COLUMN section_order.display_order IS 'Order in which the section should appear (lower = first)';
COMMENT ON COLUMN section_order.is_active IS 'Whether the section is visible on the dashboard';

-- Enable RLS
ALTER TABLE section_order ENABLE ROW LEVEL SECURITY;

-- Public can read active sections (for dashboard)
CREATE POLICY "Public can read section order"
  ON section_order FOR SELECT
  USING (is_active = true);

-- Authenticated users can manage section order
CREATE POLICY "Authenticated can insert section order"
  ON section_order FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update section order"
  ON section_order FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete section order"
  ON section_order FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS section_order_display_order_idx ON section_order(display_order);
CREATE INDEX IF NOT EXISTS section_order_section_id_idx ON section_order(section_id);
CREATE INDEX IF NOT EXISTS section_order_active_idx ON section_order(is_active);

-- Add updated_at trigger
CREATE TRIGGER update_section_order_updated_at
  BEFORE UPDATE ON section_order
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default section order
INSERT INTO section_order (section_id, display_order, is_active) VALUES
  ('sales_stats', 1, true),
  ('operations_stats', 2, true),
  ('cycle_times', 3, true),
  ('residential_financials', 4, true),
  ('active_pipeline', 5, true),
  ('finance', 6, true),
  ('commercial', 7, true)
ON CONFLICT (section_id) DO NOTHING;

-- Verify
DO $$
DECLARE
  section_count integer;
BEGIN
  SELECT COUNT(*) INTO section_count FROM section_order;
  
  RAISE NOTICE 'Section order table created successfully!';
  RAISE NOTICE 'Total sections: %', section_count;
  RAISE NOTICE 'RLS policies enabled';
END $$;
