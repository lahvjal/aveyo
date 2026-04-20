-- Durable Ava reply queue with cross-instance claiming and lease-based retries.

CREATE TABLE IF NOT EXISTS ava.reply_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ava.conversations(id) ON DELETE CASCADE,
  trigger_message_id UUID NOT NULL REFERENCES ava.messages(id) ON DELETE CASCADE,
  requested_by_auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_by TEXT,
  claimed_at TIMESTAMPTZ,
  lease_expires_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error TEXT,
  reply_message_id UUID REFERENCES ava.messages(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ava_reply_jobs_trigger_message_id
  ON ava.reply_jobs (trigger_message_id);

CREATE INDEX IF NOT EXISTS idx_ava_reply_jobs_claimable
  ON ava.reply_jobs (status, available_at, created_at);

CREATE INDEX IF NOT EXISTS idx_ava_reply_jobs_conversation_created_at
  ON ava.reply_jobs (conversation_id, created_at DESC);

DROP TRIGGER IF EXISTS update_ava_reply_jobs_updated_at ON ava.reply_jobs;
CREATE TRIGGER update_ava_reply_jobs_updated_at
  BEFORE UPDATE ON ava.reply_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

REVOKE ALL ON ava.reply_jobs FROM anon, authenticated;
GRANT ALL ON ava.reply_jobs TO service_role;

ALTER TABLE ava.reply_jobs DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.claim_ava_reply_jobs(
  p_owner TEXT,
  p_limit INTEGER DEFAULT 10,
  p_lease_seconds INTEGER DEFAULT 120,
  p_conversation_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  trigger_message_id UUID,
  requested_by_auth_user_id UUID,
  status TEXT,
  available_at TIMESTAMPTZ,
  claimed_by TEXT,
  claimed_at TIMESTAMPTZ,
  lease_expires_at TIMESTAMPTZ,
  attempts INTEGER,
  last_error TEXT,
  reply_message_id UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ava
AS $$
BEGIN
  IF COALESCE(trim(p_owner), '') = '' THEN
    RAISE EXCEPTION 'p_owner is required';
  END IF;

  RETURN QUERY
  WITH latest_candidates AS (
    SELECT jobs.id
    FROM ava.reply_jobs AS jobs
    WHERE (p_conversation_id IS NULL OR jobs.conversation_id = p_conversation_id)
      AND jobs.available_at <= NOW()
      AND (
        jobs.status IN ('pending', 'failed')
        OR (
          jobs.status = 'processing'
          AND jobs.lease_expires_at IS NOT NULL
          AND jobs.lease_expires_at < NOW()
        )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM ava.reply_jobs AS newer
        WHERE newer.conversation_id = jobs.conversation_id
          AND newer.id <> jobs.id
          AND newer.available_at <= NOW()
          AND (
            newer.status IN ('pending', 'failed')
            OR (
              newer.status = 'processing'
              AND newer.lease_expires_at IS NOT NULL
              AND newer.lease_expires_at < NOW()
            )
          )
          AND (newer.created_at, newer.id) > (jobs.created_at, jobs.id)
      )
    ORDER BY jobs.available_at ASC, jobs.created_at ASC
    LIMIT GREATEST(COALESCE(p_limit, 10), 1)
    FOR UPDATE OF jobs SKIP LOCKED
  ),
  claimed AS (
    UPDATE ava.reply_jobs AS jobs
    SET
      status = 'processing',
      claimed_by = trim(p_owner),
      claimed_at = NOW(),
      lease_expires_at = NOW() + make_interval(secs => GREATEST(COALESCE(p_lease_seconds, 120), 1)),
      attempts = jobs.attempts + 1,
      last_error = NULL
    FROM latest_candidates
    WHERE jobs.id = latest_candidates.id
    RETURNING jobs.*
  ),
  cancelled AS (
    UPDATE ava.reply_jobs AS stale
    SET
      status = 'cancelled',
      claimed_by = NULL,
      claimed_at = NULL,
      lease_expires_at = NULL,
      completed_at = NOW(),
      last_error = 'Superseded by a newer customer message.'
    WHERE EXISTS (
      SELECT 1
      FROM claimed
      WHERE claimed.conversation_id = stale.conversation_id
        AND claimed.id <> stale.id
        AND (stale.created_at, stale.id) < (claimed.created_at, claimed.id)
    )
      AND (
        stale.status IN ('pending', 'failed')
        OR (
          stale.status = 'processing'
          AND stale.lease_expires_at IS NOT NULL
          AND stale.lease_expires_at < NOW()
        )
      )
  )
  SELECT
    claimed.id,
    claimed.conversation_id,
    claimed.trigger_message_id,
    claimed.requested_by_auth_user_id,
    claimed.status,
    claimed.available_at,
    claimed.claimed_by,
    claimed.claimed_at,
    claimed.lease_expires_at,
    claimed.attempts,
    claimed.last_error,
    claimed.reply_message_id,
    claimed.completed_at,
    claimed.created_at,
    claimed.updated_at
  FROM claimed
  ORDER BY claimed.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_ava_reply_jobs(TEXT, INTEGER, INTEGER, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ava_reply_jobs(TEXT, INTEGER, INTEGER, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
