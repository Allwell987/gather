-- Adds read-receipt tracking for chat messages.
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reads_message_id ON message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON message_reads(user_id);

ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_view_message_reads" ON message_reads;
CREATE POLICY "users_can_view_message_reads" ON message_reads
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "users_can_insert_own_message_reads" ON message_reads;
CREATE POLICY "users_can_insert_own_message_reads" ON message_reads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_can_delete_own_message_reads" ON message_reads;
CREATE POLICY "users_can_delete_own_message_reads" ON message_reads
  FOR DELETE USING (auth.uid() = user_id);
