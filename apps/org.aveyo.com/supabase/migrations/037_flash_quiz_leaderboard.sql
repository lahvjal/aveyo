-- Shared flash-quiz leaderboard for org chart flash cards.
-- Stores completed run scores for cross-device / multi-user competition.

CREATE TABLE IF NOT EXISTS public.org_chart_flash_quiz_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  correct_count INTEGER NOT NULL CHECK (correct_count >= 0),
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  average_response_ms NUMERIC(10,2) NOT NULL CHECK (average_response_ms >= 0),
  accuracy_pct NUMERIC(5,2) NOT NULL CHECK (accuracy_pct >= 0 AND accuracy_pct <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flash_quiz_scores_rank
  ON public.org_chart_flash_quiz_scores (correct_count DESC, accuracy_pct DESC, average_response_ms ASC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_flash_quiz_scores_profile_id
  ON public.org_chart_flash_quiz_scores (profile_id);

ALTER TABLE public.org_chart_flash_quiz_scores ENABLE ROW LEVEL SECURITY;

-- Everyone signed in can view shared leaderboard.
DROP POLICY IF EXISTS "Authenticated users can view flash quiz scores" ON public.org_chart_flash_quiz_scores;
CREATE POLICY "Authenticated users can view flash quiz scores"
  ON public.org_chart_flash_quiz_scores
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can submit only their own score rows.
DROP POLICY IF EXISTS "Users can insert their own flash quiz scores" ON public.org_chart_flash_quiz_scores;
CREATE POLICY "Users can insert their own flash quiz scores"
  ON public.org_chart_flash_quiz_scores
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND profile_id = auth.uid()
  );

REVOKE INSERT, UPDATE, DELETE ON TABLE public.org_chart_flash_quiz_scores FROM anon;
REVOKE SELECT ON TABLE public.org_chart_flash_quiz_scores FROM anon;
GRANT SELECT, INSERT ON TABLE public.org_chart_flash_quiz_scores TO authenticated;
