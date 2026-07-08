-- Quarterly anonymous employee survey with eNPS scoring.
--
-- Anonymity model:
--   * employee_survey_responses stores answers with NO profile linkage.
--     created_at is truncated to a date so it cannot be correlated with the
--     timestamped completion row.
--   * employee_survey_completions stores WHO completed a quarter (no answers),
--     so admins can track participation without seeing individual responses.
--   * Both rows are written atomically by the SECURITY DEFINER RPC
--     submit_employee_survey(); direct INSERTs are denied by RLS/grants.

-- ── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.employee_survey_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quarter TEXT NOT NULL CHECK (quarter ~ '^[0-9]{4}-Q[1-4]$'),
  tenure TEXT NOT NULL CHECK (
    tenure IN ('3_plus_years', '2_years', '1_year', '6_months', 'less_than_6_months')
  ),
  enps_score INTEGER NOT NULL CHECK (enps_score BETWEEN 0 AND 10),
  tools_freedom INTEGER NOT NULL CHECK (tools_freedom BETWEEN 1 AND 5),
  lives_values INTEGER NOT NULL CHECK (lives_values BETWEEN 1 AND 5),
  safe_seen INTEGER NOT NULL CHECK (safe_seen BETWEEN 1 AND 5),
  comment TEXT,
  -- Date only (no time) to prevent timestamp correlation with completions.
  created_on DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_employee_survey_responses_quarter
  ON public.employee_survey_responses (quarter);

CREATE TABLE IF NOT EXISTS public.employee_survey_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quarter TEXT NOT NULL CHECK (quarter ~ '^[0-9]{4}-Q[1-4]$'),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, quarter)
);

CREATE INDEX IF NOT EXISTS idx_employee_survey_completions_quarter
  ON public.employee_survey_completions (quarter);

-- ── Quarter helpers ──────────────────────────────────────────────────────────

-- Label for the current calendar quarter, e.g. '2026-Q3'.
CREATE OR REPLACE FUNCTION public.current_survey_quarter()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT to_char(NOW(), 'YYYY') || '-Q' || to_char(NOW(), 'Q');
$$;

-- Survey window: opens on day 1 of each calendar quarter, stays open 30 days.
CREATE OR REPLACE FUNCTION public.is_survey_window_open()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT NOW() < date_trunc('quarter', NOW()) + INTERVAL '30 days';
$$;

GRANT EXECUTE ON FUNCTION public.current_survey_quarter() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_survey_window_open() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.current_survey_quarter() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_survey_window_open() FROM PUBLIC, anon;

-- ── Submission RPC ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_employee_survey(
  p_tenure TEXT,
  p_enps_score INTEGER,
  p_tools_freedom INTEGER,
  p_lives_values INTEGER,
  p_safe_seen INTEGER,
  p_comment TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_quarter TEXT := public.current_survey_quarter();
  v_comment TEXT := NULLIF(TRIM(COALESCE(p_comment, '')), '');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_user_id
      AND COALESCE(p.employment_status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Only active employees can submit the survey' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_survey_window_open() THEN
    RAISE EXCEPTION 'The survey window for % is closed', v_quarter USING ERRCODE = 'P0001';
  END IF;

  -- Record completion first; the unique constraint enforces one submission per quarter.
  BEGIN
    INSERT INTO public.employee_survey_completions (profile_id, quarter)
    VALUES (v_user_id, v_quarter);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'You have already completed the % survey', v_quarter USING ERRCODE = 'P0002';
  END;

  -- Anonymous response: intentionally not linked to the caller.
  INSERT INTO public.employee_survey_responses (
    quarter, tenure, enps_score, tools_freedom, lives_values, safe_seen, comment
  )
  VALUES (
    v_quarter, p_tenure, p_enps_score, p_tools_freedom, p_lives_values, p_safe_seen, v_comment
  );

  RETURN v_quarter;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_employee_survey(TEXT, INTEGER, INTEGER, INTEGER, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_employee_survey(TEXT, INTEGER, INTEGER, INTEGER, INTEGER, TEXT) TO authenticated;

-- ── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.employee_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_survey_completions ENABLE ROW LEVEL SECURITY;

-- Responses: admins can read aggregates/comments (rows carry no identity).
-- No INSERT/UPDATE/DELETE policies: writes only happen via the definer RPC.
DROP POLICY IF EXISTS "Admins can view survey responses" ON public.employee_survey_responses;
CREATE POLICY "Admins can view survey responses"
  ON public.employee_survey_responses
  FOR SELECT
  TO authenticated
  USING (public.is_admin_like(auth.uid()));

-- Completions: admins see the roster; users can see their own completion rows.
DROP POLICY IF EXISTS "Admins and owners can view survey completions" ON public.employee_survey_completions;
CREATE POLICY "Admins and owners can view survey completions"
  ON public.employee_survey_completions
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin_like(auth.uid()));

REVOKE ALL ON TABLE public.employee_survey_responses FROM anon;
REVOKE ALL ON TABLE public.employee_survey_completions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.employee_survey_responses FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.employee_survey_completions FROM authenticated;
GRANT SELECT ON TABLE public.employee_survey_responses TO authenticated;
GRANT SELECT ON TABLE public.employee_survey_completions TO authenticated;
