-- Prevent multiple open handoff requests for a single conversation.
-- "Open" requests are pending/claimed/active.

WITH ranked_open_requests AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY conversation_id
      ORDER BY requested_at DESC, id DESC
    ) AS open_rank
  FROM ava.handoff_requests
  WHERE status IN ('pending', 'claimed', 'active')
)
UPDATE ava.handoff_requests AS requests
SET
  status = 'cancelled',
  resolved_at = COALESCE(requests.resolved_at, NOW()),
  resolution_note = COALESCE(
    requests.resolution_note,
    'Auto-cancelled during migration: duplicate open handoff request.'
  )
FROM ranked_open_requests
WHERE requests.id = ranked_open_requests.id
  AND ranked_open_requests.open_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ava_handoff_requests_single_open_per_conversation
  ON ava.handoff_requests (conversation_id)
  WHERE status IN ('pending', 'claimed', 'active');

CREATE INDEX IF NOT EXISTS idx_ava_handoff_requests_id_status
  ON ava.handoff_requests (id, status);

