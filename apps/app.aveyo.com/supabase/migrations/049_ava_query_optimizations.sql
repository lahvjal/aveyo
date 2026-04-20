-- Purpose-built queue lookups and proven hot-path indexes for manager and thread hydration.

CREATE INDEX IF NOT EXISTS idx_ava_conversations_open_ai_only_updated_at
  ON ava.conversations (updated_at DESC)
  WHERE status = 'open'
    AND handoff_state = 'none'
    AND channel <> 'agent_impersonation';

CREATE INDEX IF NOT EXISTS idx_ava_conversations_resolved_non_impersonation_updated_at
  ON ava.conversations (updated_at DESC)
  WHERE status IN ('resolved', 'closed')
    AND handoff_state = 'resolved'
    AND channel <> 'agent_impersonation';

CREATE INDEX IF NOT EXISTS idx_ava_handoff_requests_non_cancelled_requested_at
  ON ava.handoff_requests (requested_at DESC, id DESC)
  WHERE status <> 'cancelled';

CREATE INDEX IF NOT EXISTS idx_ava_handoff_requests_conversation_requested_at
  ON ava.handoff_requests (conversation_id, requested_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_ava_handoff_requests_pending_queue_order
  ON ava.handoff_requests (requested_at ASC, id ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_ava_handoff_events_request_event_created_at
  ON ava.handoff_events (handoff_request_id, event_type, created_at DESC);

CREATE OR REPLACE FUNCTION public.list_ava_latest_handoff_requests(
  p_conversation_ids UUID[]
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  status TEXT,
  reason TEXT,
  requested_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  claimed_by_auth_user_id UUID,
  resolved_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, ava
AS $$
  SELECT DISTINCT ON (requests.conversation_id)
    requests.id,
    requests.conversation_id,
    requests.status,
    requests.reason,
    requests.requested_at,
    requests.claimed_at,
    requests.claimed_by_auth_user_id,
    requests.resolved_at
  FROM ava.handoff_requests AS requests
  WHERE array_length(COALESCE(p_conversation_ids, ARRAY[]::UUID[]), 1) IS NOT NULL
    AND requests.conversation_id = ANY(p_conversation_ids)
  ORDER BY requests.conversation_id, requests.requested_at DESC, requests.id DESC;
$$;

REVOKE ALL ON FUNCTION public.list_ava_latest_handoff_requests(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_ava_latest_handoff_requests(UUID[]) TO service_role;

CREATE OR REPLACE FUNCTION public.list_ava_pending_queue_positions(
  p_request_ids UUID[]
)
RETURNS TABLE (
  id UUID,
  queue_position INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, ava
AS $$
  WITH pending_queue AS (
    SELECT
      requests.id,
      row_number() OVER (ORDER BY requests.requested_at ASC, requests.id ASC)::INTEGER AS queue_position
    FROM ava.handoff_requests AS requests
    WHERE requests.status = 'pending'
  )
  SELECT
    pending_queue.id,
    pending_queue.queue_position
  FROM pending_queue
  WHERE array_length(COALESCE(p_request_ids, ARRAY[]::UUID[]), 1) IS NOT NULL
    AND pending_queue.id = ANY(p_request_ids);
$$;

REVOKE ALL ON FUNCTION public.list_ava_pending_queue_positions(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_ava_pending_queue_positions(UUID[]) TO service_role;

NOTIFY pgrst, 'reload schema';
