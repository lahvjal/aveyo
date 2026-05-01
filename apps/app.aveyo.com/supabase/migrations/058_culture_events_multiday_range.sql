-- Allow culture events to span multiple calendar days.
ALTER TABLE public.culture_events
ADD COLUMN IF NOT EXISTS event_end_date DATE;

ALTER TABLE public.culture_events
DROP CONSTRAINT IF EXISTS culture_events_valid_date_range;

ALTER TABLE public.culture_events
ADD CONSTRAINT culture_events_valid_date_range
CHECK (event_end_date IS NULL OR event_end_date >= event_date);
