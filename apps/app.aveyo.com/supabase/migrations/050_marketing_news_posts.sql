-- Public marketing/news posts managed from marketing.aveyo.com
-- and rendered on aveyo.com/newsfeed.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.marketing_news_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  slug TEXT NOT NULL UNIQUE CHECK (char_length(trim(slug)) > 0),
  category TEXT NOT NULL DEFAULT 'Company' CHECK (char_length(trim(category)) > 0),
  excerpt TEXT NOT NULL CHECK (char_length(trim(excerpt)) > 0),
  hero_image_url TEXT,
  body_markdown TEXT NOT NULL DEFAULT '',
  seo_title TEXT,
  seo_description TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_news_posts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_marketing_news_posts_published_at
  ON public.marketing_news_posts (published_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_news_posts_category_published_at
  ON public.marketing_news_posts (category, published_at DESC);

DROP TRIGGER IF EXISTS update_marketing_news_posts_updated_at ON public.marketing_news_posts;
CREATE TRIGGER update_marketing_news_posts_updated_at
  BEFORE UPDATE ON public.marketing_news_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.marketing_news_posts (
  title,
  slug,
  category,
  excerpt,
  body_markdown,
  seo_title,
  seo_description,
  published_at
)
VALUES
  (
    'A New CEO',
    'a-new-ceo',
    'Leadership',
    'Today is a big day for Aveyo.',
    '# A New CEO

Today is a big day for Aveyo.',
    'A New CEO | Aveyo News',
    'Today is a big day for Aveyo.',
    now() - interval '63 days'
  ),
  (
    'Rapid Growth Requires a High-Quality COO',
    'rapid-growth-requires-a-high-quality-coo',
    'Leadership',
    'We are pleased to announce Grant Miser as Aveyo''s Chief Operating Officer.',
    '# Rapid Growth Requires a High-Quality COO

We are pleased to announce Grant Miser as Aveyo''s Chief Operating Officer.',
    'Rapid Growth Requires a High-Quality COO | Aveyo News',
    'We are pleased to announce Grant Miser as Aveyo''s Chief Operating Officer.',
    now() - interval '56 days'
  ),
  (
    'We''re Launching Ava, Our AI Chatbot',
    'were-launching-ava-our-ai-chatbot',
    'Product',
    'We''d like you to meet Ava, Aveyo''s newest innovation.',
    '# We''re Launching Ava, Our AI Chatbot

We''d like you to meet Ava, Aveyo''s newest innovation.',
    'We''re Launching Ava, Our AI Chatbot | Aveyo News',
    'We''d like you to meet Ava, Aveyo''s newest innovation.',
    now() - interval '49 days'
  ),
  (
    'Aveyo Named As UV 50''s Top Startup To Watch',
    'aveyo-named-as-uv-50s-top-startup-to-watch',
    'Company',
    'We feel incredibly honored, and a little overwhelmed, to be named UV 50''s #1 Startup to Watch.',
    '# Aveyo Named As UV 50''s Top Startup To Watch

We feel incredibly honored, and a little overwhelmed, to be named UV 50''s #1 Startup to Watch.',
    'Aveyo Named As UV 50''s Top Startup To Watch | Aveyo News',
    'Aveyo is honored to be named UV 50''s #1 Startup to Watch.',
    now() - interval '42 days'
  ),
  (
    'The Big Beautiful Bill',
    'the-big-beautiful-bill',
    'Policy',
    'Big changes ahead: what the "One Big Beautiful Bill" means for homeowners going solar.',
    '# The Big Beautiful Bill

Big changes ahead: what the "One Big Beautiful Bill" means for homeowners going solar.',
    'The Big Beautiful Bill | Aveyo News',
    'Big changes ahead: what the "One Big Beautiful Bill" means for homeowners going solar.',
    now() - interval '35 days'
  ),
  (
    'How Much Can Solar Save Me?',
    'how-much-can-solar-save-me',
    'Education',
    'A transparent look at how much solar could really save you.',
    '# How Much Can Solar Save Me?

A transparent look at how much solar could really save you.',
    'How Much Can Solar Save Me? | Aveyo News',
    'A transparent look at how much solar could really save you.',
    now() - interval '28 days'
  ),
  (
    'We Opened a New Office in Illinois',
    'we-opened-a-new-office-in-illinois',
    'Expansion',
    'To better serve our growing Illinois market, we opened a hub of operations for our Illinois-based teams.',
    '# We Opened a New Office in Illinois

To better serve our growing Illinois market, we opened a hub of operations for our Illinois-based teams.',
    'We Opened a New Office in Illinois | Aveyo News',
    'Aveyo opened a new Illinois office to support a growing market.',
    now() - interval '21 days'
  ),
  (
    'A New Site',
    'a-new-site',
    'Brand',
    'Aveyo.com — The Overhaul.',
    '# A New Site

Aveyo.com — The Overhaul.',
    'A New Site | Aveyo News',
    'Aveyo.com — The Overhaul.',
    now() - interval '14 days'
  ),
  (
    'The Problem with the Monopoly of Energy Companies',
    'the-problem-with-the-monopoly-of-energy-companies',
    'Education',
    'We''re used to having choices. Lots of choices.',
    '# The Problem with the Monopoly of Energy Companies

We''re used to having choices. Lots of choices.',
    'The Problem with the Monopoly of Energy Companies | Aveyo News',
    'We''re used to having choices. Lots of choices.',
    now() - interval '7 days'
  )
ON CONFLICT (slug) DO NOTHING;
