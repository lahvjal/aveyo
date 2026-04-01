-- Add optional idempotency key support for customer/support-agent message sends.

ALTER TABLE ava.messages
  ADD COLUMN IF NOT EXISTS client_message_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ava_messages_client_message_id_length_check'
  ) THEN
    ALTER TABLE ava.messages
      ADD CONSTRAINT ava_messages_client_message_id_length_check
      CHECK (client_message_id IS NULL OR char_length(client_message_id) <= 128);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ava_messages_sender_idempotency
  ON ava.messages (conversation_id, sender_kind, sender_auth_user_id, client_message_id)
  WHERE client_message_id IS NOT NULL
    AND sender_auth_user_id IS NOT NULL
    AND sender_kind IN ('customer', 'support_agent');

