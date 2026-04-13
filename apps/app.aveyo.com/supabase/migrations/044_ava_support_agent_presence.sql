-- Canonical support-agent presence for Ava dashboards and manager reporting.
-- This is the single source of truth for online/offline state.

CREATE TABLE IF NOT EXISTS ava.support_agent_presence (
  agent_auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  desired_status TEXT NOT NULL DEFAULT 'online'
    CHECK (desired_status IN ('online', 'offline')),
  last_heartbeat_at TIMESTAMPTZ,
  last_transition_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ava_support_agent_presence_desired_status_heartbeat
  ON ava.support_agent_presence (desired_status, last_heartbeat_at);

DROP TRIGGER IF EXISTS update_ava_support_agent_presence_updated_at ON ava.support_agent_presence;
CREATE TRIGGER update_ava_support_agent_presence_updated_at
  BEFORE UPDATE ON ava.support_agent_presence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON ava.support_agent_presence TO authenticated;
GRANT ALL ON ava.support_agent_presence TO service_role;

ALTER TABLE ava.support_agent_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_agents_manage_own_presence" ON ava.support_agent_presence;
CREATE POLICY "support_agents_manage_own_presence"
  ON ava.support_agent_presence FOR ALL
  TO authenticated
  USING (
    public.is_ava_support_agent(auth.uid())
    AND agent_auth_user_id = auth.uid()
  )
  WITH CHECK (
    public.is_ava_support_agent(auth.uid())
    AND agent_auth_user_id = auth.uid()
  );

