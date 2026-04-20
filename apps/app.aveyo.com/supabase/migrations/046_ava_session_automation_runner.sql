-- Durable, multi-instance-safe lease + batch helpers for Ava session automation.
-- This moves idle prompt/close and resolved auto-close work out of HTTP read paths.

CREATE TABLE IF NOT EXISTS ava.automation_leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_key TEXT NOT NULL UNIQUE,
  lease_owner TEXT,
  lease_expires_at TIMESTAMPTZ,
  last_started_at TIMESTAMPTZ,
  last_finished_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_ava_automation_leases_updated_at ON ava.automation_leases;
CREATE TRIGGER update_ava_automation_leases_updated_at
  BEFORE UPDATE ON ava.automation_leases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

REVOKE ALL ON ava.automation_leases FROM anon, authenticated;
GRANT ALL ON ava.automation_leases TO service_role;

ALTER TABLE ava.automation_leases DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.claim_ava_automation_lease(
  p_task_key TEXT,
  p_owner TEXT,
  p_lease_seconds INTEGER DEFAULT 90
)
RETURNS TABLE (
  acquired BOOLEAN,
  lease_expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ava
AS $$
DECLARE
  v_lease_expires_at TIMESTAMPTZ;
BEGIN
  IF COALESCE(trim(p_task_key), '') = '' THEN
    RAISE EXCEPTION 'p_task_key is required';
  END IF;

  IF COALESCE(trim(p_owner), '') = '' THEN
    RAISE EXCEPTION 'p_owner is required';
  END IF;

  WITH claimed AS (
    INSERT INTO ava.automation_leases (
      task_key,
      lease_owner,
      lease_expires_at,
      last_started_at,
      last_heartbeat_at,
      last_error
    )
    VALUES (
      trim(p_task_key),
      trim(p_owner),
      NOW() + make_interval(secs => GREATEST(COALESCE(p_lease_seconds, 90), 1)),
      NOW(),
      NOW(),
      NULL
    )
    ON CONFLICT (task_key) DO UPDATE
    SET
      lease_owner = EXCLUDED.lease_owner,
      lease_expires_at = EXCLUDED.lease_expires_at,
      last_started_at = NOW(),
      last_heartbeat_at = NOW(),
      last_error = NULL
    WHERE ava.automation_leases.lease_expires_at IS NULL
      OR ava.automation_leases.lease_expires_at < NOW()
      OR ava.automation_leases.lease_owner = EXCLUDED.lease_owner
    RETURNING ava.automation_leases.lease_expires_at
  )
  SELECT claimed.lease_expires_at
  INTO v_lease_expires_at
  FROM claimed;

  IF v_lease_expires_at IS NULL THEN
    RETURN QUERY
    SELECT
      FALSE,
      leases.lease_expires_at
    FROM ava.automation_leases AS leases
    WHERE leases.task_key = trim(p_task_key);
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, v_lease_expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_ava_automation_lease(
  p_task_key TEXT,
  p_owner TEXT,
  p_lease_seconds INTEGER DEFAULT 90
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ava
AS $$
DECLARE
  v_updated_rows INTEGER;
BEGIN
  UPDATE ava.automation_leases
  SET
    lease_expires_at = NOW() + make_interval(secs => GREATEST(COALESCE(p_lease_seconds, 90), 1)),
    last_heartbeat_at = NOW()
  WHERE task_key = trim(p_task_key)
    AND lease_owner = trim(p_owner);

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  RETURN v_updated_rows > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_ava_automation_lease(
  p_task_key TEXT,
  p_owner TEXT,
  p_error TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ava
AS $$
DECLARE
  v_updated_rows INTEGER;
BEGIN
  UPDATE ava.automation_leases
  SET
    lease_owner = NULL,
    lease_expires_at = NULL,
    last_finished_at = NOW(),
    last_heartbeat_at = NOW(),
    last_error = LEFT(NULLIF(p_error, ''), 2000)
  WHERE task_key = trim(p_task_key)
    AND lease_owner = trim(p_owner);

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  RETURN v_updated_rows > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_ava_recent_messages_for_conversations(
  p_conversation_ids UUID[],
  p_limit_per_conversation INTEGER DEFAULT 40
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  sender_kind TEXT,
  sender_auth_user_id UUID,
  body TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, ava
AS $$
  WITH ranked AS (
    SELECT
      messages.id,
      messages.conversation_id,
      messages.sender_kind,
      messages.sender_auth_user_id,
      messages.body,
      messages.payload,
      messages.created_at,
      ROW_NUMBER() OVER (
        PARTITION BY messages.conversation_id
        ORDER BY messages.created_at DESC, messages.id DESC
      ) AS row_number
    FROM ava.messages AS messages
    WHERE COALESCE(array_length(p_conversation_ids, 1), 0) > 0
      AND messages.conversation_id = ANY (p_conversation_ids)
  )
  SELECT
    ranked.id,
    ranked.conversation_id,
    ranked.sender_kind,
    ranked.sender_auth_user_id,
    ranked.body,
    ranked.payload,
    ranked.created_at
  FROM ranked
  WHERE ranked.row_number <= GREATEST(COALESCE(p_limit_per_conversation, 40), 1)
  ORDER BY ranked.conversation_id, ranked.created_at DESC, ranked.id DESC;
$$;

REVOKE ALL ON FUNCTION public.claim_ava_automation_lease(TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.heartbeat_ava_automation_lease(TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_ava_automation_lease(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_ava_recent_messages_for_conversations(UUID[], INTEGER) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_ava_automation_lease(TEXT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.heartbeat_ava_automation_lease(TEXT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_ava_automation_lease(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_ava_recent_messages_for_conversations(UUID[], INTEGER) TO service_role;

NOTIFY pgrst, 'reload schema';
