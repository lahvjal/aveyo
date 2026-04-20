-- Add Ava chat tables to the shared Supabase Realtime publication.
-- The browser-facing surfaces use API-authenticated SSE, but the shared source of
-- truth for invalidations is still Supabase Realtime postgres_changes.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'ava'
        AND tablename = 'messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE ava.messages;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'ava'
        AND tablename = 'handoff_events'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE ava.handoff_events;
    END IF;
  END IF;
END $$;
