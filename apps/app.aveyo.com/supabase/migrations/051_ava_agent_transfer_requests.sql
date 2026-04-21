-- Agent-to-agent transfer requests for active Ava handoffs.

CREATE TABLE IF NOT EXISTS ava.agent_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_request_id UUID NOT NULL REFERENCES ava.handoff_requests(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES ava.conversations(id) ON DELETE CASCADE,
  requested_by_auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  note TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (requested_by_auth_user_id <> target_auth_user_id)
);

CREATE INDEX IF NOT EXISTS idx_ava_agent_transfer_requests_handoff_status
  ON ava.agent_transfer_requests (handoff_request_id, status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_ava_agent_transfer_requests_target_status
  ON ava.agent_transfer_requests (target_auth_user_id, status, requested_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ava_agent_transfer_requests_single_pending
  ON ava.agent_transfer_requests (handoff_request_id)
  WHERE status = 'pending';

DROP TRIGGER IF EXISTS update_ava_agent_transfer_requests_updated_at ON ava.agent_transfer_requests;
CREATE TRIGGER update_ava_agent_transfer_requests_updated_at
  BEFORE UPDATE ON ava.agent_transfer_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

REVOKE ALL ON ava.agent_transfer_requests FROM anon, authenticated;
GRANT ALL ON ava.agent_transfer_requests TO service_role;

ALTER TABLE ava.agent_transfer_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversation_participants_view_agent_transfer_requests"
  ON ava.agent_transfer_requests;
CREATE POLICY "conversation_participants_view_agent_transfer_requests"
  ON ava.agent_transfer_requests FOR SELECT
  TO authenticated
  USING (ava.can_access_conversation(conversation_id));

DROP POLICY IF EXISTS "support_agents_manage_agent_transfer_requests"
  ON ava.agent_transfer_requests;
CREATE POLICY "support_agents_manage_agent_transfer_requests"
  ON ava.agent_transfer_requests FOR ALL
  TO authenticated
  USING (public.is_ava_support_agent(auth.uid()))
  WITH CHECK (public.is_ava_support_agent(auth.uid()));

NOTIFY pgrst, 'reload schema';
