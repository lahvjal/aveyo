-- Enforce one live customer session across Ava conversations.
-- "Live" sessions are open/pending_handoff/active_handoff and exclude impersonation.

WITH ranked_live_conversations AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY customer_auth_user_id
      ORDER BY COALESCE(last_message_at, updated_at, created_at) DESC, created_at DESC, id DESC
    ) AS live_rank
  FROM ava.conversations
  WHERE status IN ('open', 'pending_handoff', 'active_handoff')
    AND COALESCE(channel, 'widget') <> 'agent_impersonation'
)
UPDATE ava.conversations AS conversations
SET
  status = 'closed',
  handoff_state = 'resolved',
  active_support_agent_auth_user_id = NULL,
  updated_at = NOW(),
  last_message_at = COALESCE(conversations.last_message_at, NOW())
FROM ranked_live_conversations
WHERE conversations.id = ranked_live_conversations.id
  AND ranked_live_conversations.live_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ava_conversations_single_live_session_per_customer
  ON ava.conversations (customer_auth_user_id)
  WHERE status IN ('open', 'pending_handoff', 'active_handoff')
    AND COALESCE(channel, 'widget') <> 'agent_impersonation';

