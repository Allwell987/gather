-- Adds reply support to chat messages.
-- Safe to run multiple times.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'messages'
      AND column_name = 'reply_to_message_id'
  ) THEN
    ALTER TABLE messages
      ADD COLUMN reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to_message_id ON messages(reply_to_message_id);
