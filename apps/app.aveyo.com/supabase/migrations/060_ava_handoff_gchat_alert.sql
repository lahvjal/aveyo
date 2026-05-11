-- Track when a Google Chat pending-handoff alert was sent for each request.
-- The sweep checks gchat_alerted_at IS NULL so each request is only alerted once,
-- regardless of how frequently the cron runs.

ALTER TABLE ava.handoff_requests
  ADD COLUMN IF NOT EXISTS gchat_alerted_at TIMESTAMPTZ;

-- Index to keep the alert sweep fast: only touches pending rows that haven't been alerted.
CREATE INDEX IF NOT EXISTS idx_ava_handoff_requests_pending_unalerted
  ON ava.handoff_requests (requested_at)
  WHERE status = 'pending' AND gchat_alerted_at IS NULL;
