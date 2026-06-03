-- Ordered carousel posters stored on culture_events as JSONB (no separate table).

ALTER TABLE public.culture_events
ADD COLUMN IF NOT EXISTS posters JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.culture_events
DROP CONSTRAINT IF EXISTS culture_events_posters_is_array;

ALTER TABLE public.culture_events
ADD CONSTRAINT culture_events_posters_is_array
CHECK (jsonb_typeof(posters) = 'array');

UPDATE public.culture_events
SET posters = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'kind', poster_media_kind,
    'url', poster_media_url,
    'sortOrder', 0
  )
)
WHERE posters = '[]'::jsonb
  AND poster_media_kind IS NOT NULL
  AND poster_media_url IS NOT NULL
  AND char_length(trim(poster_media_url)) > 0;

-- Consolidate data if an earlier draft created culture_event_posters.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'culture_event_posters'
  ) THEN
    UPDATE public.culture_events AS events
    SET posters = poster_payload.payload
    FROM (
      SELECT
        poster_rows.event_id,
        jsonb_agg(
          jsonb_build_object(
            'id', poster_rows.id::text,
            'kind', poster_rows.poster_media_kind,
            'url', poster_rows.poster_media_url,
            'sortOrder', poster_rows.sort_order
          )
          ORDER BY poster_rows.sort_order ASC, poster_rows.poster_date ASC
        ) AS payload
      FROM public.culture_event_posters AS poster_rows
      GROUP BY poster_rows.event_id
    ) AS poster_payload
    WHERE poster_payload.event_id = events.id;

    DROP TABLE public.culture_event_posters;
  END IF;
END $$;
