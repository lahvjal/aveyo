-- Marketing site photo overrides for aveyo.com inline editing.

CREATE TABLE IF NOT EXISTS marketing_site_photos (
  slot_key TEXT PRIMARY KEY,
  default_src TEXT NOT NULL,
  media_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_site_photos_updated_at_idx
  ON marketing_site_photos (updated_at DESC);

ALTER TABLE marketing_site_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read marketing site photos" ON marketing_site_photos;
CREATE POLICY "Anyone can read marketing site photos"
  ON marketing_site_photos FOR SELECT
  USING (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-site-media', 'marketing-site-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Marketing team can upload site media" ON storage.objects;
CREATE POLICY "Marketing team can upload site media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'marketing-site-media' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.is_admin = TRUE
        OR EXISTS (
          SELECT 1 FROM departments
          WHERE departments.id = profiles.department_id
          AND lower(departments.name) LIKE '%marketing%'
        )
      )
    )
  );

DROP POLICY IF EXISTS "Marketing team can update site media" ON storage.objects;
CREATE POLICY "Marketing team can update site media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'marketing-site-media' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.is_admin = TRUE
        OR EXISTS (
          SELECT 1 FROM departments
          WHERE departments.id = profiles.department_id
          AND lower(departments.name) LIKE '%marketing%'
        )
      )
    )
  );

DROP POLICY IF EXISTS "Marketing team can delete site media" ON storage.objects;
CREATE POLICY "Marketing team can delete site media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'marketing-site-media' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.is_admin = TRUE
        OR EXISTS (
          SELECT 1 FROM departments
          WHERE departments.id = profiles.department_id
          AND lower(departments.name) LIKE '%marketing%'
        )
      )
    )
  );

DROP POLICY IF EXISTS "Anyone can view marketing site media" ON storage.objects;
CREATE POLICY "Anyone can view marketing site media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marketing-site-media');
