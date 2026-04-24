-- Storage for culture event images and looping videos.

INSERT INTO storage.buckets (id, name, public)
VALUES ('culture-event-media', 'culture-event-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins can upload culture event media" ON storage.objects;
CREATE POLICY "Admins can upload culture event media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'culture-event-media' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "Admins can update culture event media" ON storage.objects;
CREATE POLICY "Admins can update culture event media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'culture-event-media' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "Admins can delete culture event media" ON storage.objects;
CREATE POLICY "Admins can delete culture event media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'culture-event-media' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "Anyone can view culture event media" ON storage.objects;
CREATE POLICY "Anyone can view culture event media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'culture-event-media');
