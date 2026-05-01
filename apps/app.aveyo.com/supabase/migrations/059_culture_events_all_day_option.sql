-- Add all-day scheduling support for culture events.
ALTER TABLE public.culture_events
ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN NOT NULL DEFAULT false;
