-- Shared typing transport and atomic handoff claim/resolve transitions.

CREATE TABLE IF NOT EXISTS ava.typing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ava.conversations(id) ON DELETE CASCADE,
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('customer', 'representative', 'ava')),
  actor_auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_typing BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ava_typing_events_conversation_created_at
  ON ava.typing_events (conversation_id, created_at DESC);

REVOKE ALL ON ava.typing_events FROM anon, authenticated;
GRANT ALL ON ava.typing_events TO service_role;

ALTER TABLE ava.typing_events DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'ava'
        AND tablename = 'typing_events'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE ava.typing_events;
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.claim_ava_handoff_request(
  p_request_id UUID,
  p_actor_user_id UUID,
  p_representative_name TEXT,
  p_representative_avatar_url TEXT DEFAULT NULL
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ava
AS $$
DECLARE
  v_request ava.handoff_requests%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_system_message_id UUID;
  v_elapsed_wait_seconds INTEGER;
BEGIN
  IF p_request_id IS NULL OR p_actor_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT *
  INTO v_request
  FROM ava.handoff_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND OR v_request.status <> 'pending' THEN
    RETURN;
  END IF;

  v_elapsed_wait_seconds := GREATEST(
    0,
    FLOOR(EXTRACT(EPOCH FROM (v_now - v_request.requested_at)))::INTEGER
  );

  UPDATE ava.handoff_requests
  SET
    status = 'active',
    claimed_by_auth_user_id = p_actor_user_id,
    claimed_at = v_now
  WHERE id = v_request.id;

  UPDATE ava.conversations
  SET
    status = 'active_handoff',
    handoff_state = 'active',
    active_support_agent_auth_user_id = p_actor_user_id,
    updated_at = v_now,
    last_message_at = v_now
  WHERE id = v_request.conversation_id;

  INSERT INTO ava.messages (
    conversation_id,
    sender_kind,
    sender_auth_user_id,
    body,
    payload
  )
  VALUES (
    v_request.conversation_id,
    'system',
    p_actor_user_id,
    format('Connected with %s!', COALESCE(NULLIF(trim(p_representative_name), ''), 'Representative')),
    jsonb_build_object(
      'systemEvent', 'connected',
      'queue', jsonb_build_object(
        'requestId', v_request.id,
        'position', 0,
        'estimatedWaitSeconds', 0,
        'elapsedWaitSeconds', v_elapsed_wait_seconds,
        'reason', v_request.reason
      )
    )
  )
  RETURNING id INTO v_system_message_id;

  INSERT INTO ava.handoff_events (
    handoff_request_id,
    conversation_id,
    event_type,
    actor_auth_user_id,
    payload
  )
  VALUES
    (
      v_request.id,
      v_request.conversation_id,
      'claimed',
      p_actor_user_id,
      jsonb_build_object(
        'representative', jsonb_build_object(
          'id', p_actor_user_id,
          'name', COALESCE(NULLIF(trim(p_representative_name), ''), 'Representative'),
          'avatarUrl', NULLIF(trim(COALESCE(p_representative_avatar_url, '')), '')
        )
      )
    ),
    (
      v_request.id,
      v_request.conversation_id,
      'activated',
      p_actor_user_id,
      jsonb_build_object(
        'representative', jsonb_build_object(
          'id', p_actor_user_id,
          'name', COALESCE(NULLIF(trim(p_representative_name), ''), 'Representative'),
          'avatarUrl', NULLIF(trim(COALESCE(p_representative_avatar_url, '')), '')
        ),
        'systemMessageId', v_system_message_id
      )
    );

  RETURN QUERY
  SELECT
    requests.id,
    requests.conversation_id,
    requests.status,
    requests.reason,
    requests.requested_at,
    requests.claimed_at,
    requests.claimed_by_auth_user_id,
    requests.resolved_at
  FROM ava.handoff_requests AS requests
  WHERE requests.id = v_request.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_ava_handoff_request(
  p_conversation_id UUID,
  p_actor_user_id UUID,
  p_allow_admin_override BOOLEAN DEFAULT FALSE,
  p_resolution_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  request_id UUID,
  conversation_id UUID,
  claimed_by_auth_user_id UUID,
  requested_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ava
AS $$
DECLARE
  v_request ava.handoff_requests%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_disconnect_message_id UUID;
  v_rating_prompt_message_id UUID;
  v_representative_name TEXT := 'your representative';
  v_conversation_exists BOOLEAN;
BEGIN
  IF p_conversation_id IS NULL OR p_actor_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT TRUE
  INTO v_conversation_exists
  FROM ava.conversations
  WHERE id = p_conversation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT *
  INTO v_request
  FROM ava.handoff_requests
  WHERE conversation_id = p_conversation_id
    AND status IN ('pending', 'claimed', 'active')
  ORDER BY requested_at DESC, id DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF v_request.claimed_by_auth_user_id IS NOT NULL
      AND v_request.claimed_by_auth_user_id <> p_actor_user_id
      AND NOT COALESCE(p_allow_admin_override, FALSE) THEN
      RETURN;
    END IF;

    UPDATE ava.handoff_requests
    SET
      status = 'resolved',
      resolved_at = v_now,
      resolution_note = p_resolution_note
    WHERE id = v_request.id;

    IF v_request.claimed_by_auth_user_id IS NOT NULL THEN
      SELECT COALESCE(NULLIF(trim(preferred_name), ''), NULLIF(trim(full_name), ''), 'your representative')
      INTO v_representative_name
      FROM public.profiles
      WHERE id = v_request.claimed_by_auth_user_id;
    END IF;
  END IF;

  UPDATE ava.conversations
  SET
    status = 'resolved',
    handoff_state = 'resolved',
    active_support_agent_auth_user_id = NULL,
    updated_at = v_now,
    last_message_at = v_now
  WHERE id = p_conversation_id;

  INSERT INTO ava.messages (
    conversation_id,
    sender_kind,
    sender_auth_user_id,
    body,
    payload
  )
  VALUES (
    p_conversation_id,
    'system',
    p_actor_user_id,
    CASE
      WHEN v_request.id IS NOT NULL THEN format('Disconnected from %s', v_representative_name)
      ELSE 'Disconnected from representative'
    END,
    jsonb_build_object('systemEvent', 'disconnected')
  )
  RETURNING id INTO v_disconnect_message_id;

  IF v_request.id IS NOT NULL THEN
    INSERT INTO ava.messages (
      conversation_id,
      sender_kind,
      sender_auth_user_id,
      body,
      payload
    )
    VALUES (
      p_conversation_id,
      'system',
      NULL,
      format('Rate your experience with %s', v_representative_name),
      jsonb_build_object(
        'systemEvent', 'queue_update',
        'feedbackRequest', jsonb_build_object(
          'type', 'handoff_rating',
          'requestId', v_request.id,
          'representativeName', v_representative_name
        )
      )
    )
    RETURNING id INTO v_rating_prompt_message_id;

    INSERT INTO ava.handoff_events (
      handoff_request_id,
      conversation_id,
      event_type,
      actor_auth_user_id,
      payload
    )
    VALUES (
      v_request.id,
      p_conversation_id,
      'resolved',
      p_actor_user_id,
      jsonb_build_object(
        'resolutionNote', COALESCE(p_resolution_note, ''),
        'systemMessageId', v_disconnect_message_id,
        'ratingPromptMessageId', v_rating_prompt_message_id
      )
    );
  END IF;

  RETURN QUERY
  SELECT
    v_request.id,
    p_conversation_id,
    v_request.claimed_by_auth_user_id,
    v_request.requested_at,
    v_request.claimed_at,
    CASE
      WHEN v_request.id IS NOT NULL THEN v_now
      ELSE NULL
    END;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_ava_handoff_request(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_ava_handoff_request(UUID, UUID, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_ava_handoff_request(UUID, UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_ava_handoff_request(UUID, UUID, BOOLEAN, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
