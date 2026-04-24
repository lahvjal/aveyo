-- Internal culture events and announcements managed from marketing.aveyo.com

CREATE TABLE IF NOT EXISTS public.culture_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  location TEXT NOT NULL CHECK (char_length(trim(location)) > 0),
  owner_name TEXT NOT NULL CHECK (char_length(trim(owner_name)) > 0),
  description TEXT NOT NULL CHECK (char_length(trim(description)) > 0),
  poster_media_kind TEXT CHECK (poster_media_kind IN ('image', 'video')),
  poster_media_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT culture_events_poster_media_pair CHECK (
    (poster_media_kind IS NULL AND poster_media_url IS NULL)
    OR (poster_media_kind IS NOT NULL AND char_length(trim(coalesce(poster_media_url, ''))) > 0)
  )
);

CREATE TABLE IF NOT EXISTS public.culture_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  message TEXT NOT NULL CHECK (char_length(trim(message)) > 0),
  author_name TEXT NOT NULL CHECK (char_length(trim(author_name)) > 0),
  author_initials TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.culture_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.culture_announcements ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_culture_events_event_date_time
  ON public.culture_events (event_date ASC, event_time ASC);

CREATE INDEX IF NOT EXISTS idx_culture_announcements_published_at
  ON public.culture_announcements (published_at DESC);

DROP TRIGGER IF EXISTS update_culture_events_updated_at ON public.culture_events;
CREATE TRIGGER update_culture_events_updated_at
  BEFORE UPDATE ON public.culture_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_culture_announcements_updated_at ON public.culture_announcements;
CREATE TRIGGER update_culture_announcements_updated_at
  BEFORE UPDATE ON public.culture_announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.culture_events (
  id,
  title,
  event_date,
  event_time,
  location,
  owner_name,
  description
)
VALUES
  (
    'd4cb2ad0-0bc5-4732-a01c-cd4bbd6e1001',
    'Quarterly Kickoff',
    DATE '2026-04-15',
    TIME '09:30',
    'HQ Auditorium + Zoom',
    'Marketing Ops',
    'Quarterly goals, campaign calendar review, and cross-team planning for launch milestones.'
  ),
  (
    'd4cb2ad0-0bc5-4732-a01c-cd4bbd6e1002',
    'Community Volunteer Day',
    DATE '2026-04-26',
    TIME '11:00',
    'Downtown Community Center',
    'People Team',
    'Company-wide volunteer event with partner organizations. Lunch and transportation are provided.'
  ),
  (
    'd4cb2ad0-0bc5-4732-a01c-cd4bbd6e1003',
    'Product & Culture Showcase',
    DATE '2026-05-03',
    TIME '15:00',
    'Main Office, Floor 3',
    'Internal Comms',
    'Showcase ongoing initiatives, celebrate team wins, and collect feedback for next sprint planning.'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.culture_announcements (
  id,
  title,
  message,
  author_name,
  author_initials,
  published_at
)
VALUES
  (
    'e11ff955-b3e1-48f6-9691-4e1c26a81001',
    'Bathrooms update!',
    'Bathrooms will be closed from 2pm - 5pm. If you really need to go this afternoon, please use our nextdoor neighbors'' bathroom.',
    'Dave Miser',
    'DM',
    now() - interval '1 hour'
  ),
  (
    'e11ff955-b3e1-48f6-9691-4e1c26a81002',
    'Bathrooms update!',
    'Bathrooms will be closed from 2pm - 5pm. If you really need to go this afternoon, please use our nextdoor neighbors'' bathroom.',
    'Dave Miser',
    'DM',
    now() - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;
