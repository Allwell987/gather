-- Adds per-message chat reactions.
-- Safe to run multiple times.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  IF to_jsonb(NEW) ? 'updated_at' THEN
    NEW := jsonb_populate_record(NEW, jsonb_build_object('updated_at', NOW()));
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='message_reactions' AND column_name='updated_at'
  ) THEN
    ALTER TABLE message_reactions ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_view_message_reactions" ON message_reactions;
CREATE POLICY "users_can_view_message_reactions" ON message_reactions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "users_can_insert_own_message_reactions" ON message_reactions;
CREATE POLICY "users_can_insert_own_message_reactions" ON message_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_can_update_own_message_reactions" ON message_reactions;
CREATE POLICY "users_can_update_own_message_reactions" ON message_reactions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_can_delete_own_message_reactions" ON message_reactions;
CREATE POLICY "users_can_delete_own_message_reactions" ON message_reactions
  FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_message_reactions_updated_at ON message_reactions;
CREATE TRIGGER set_message_reactions_updated_at
  BEFORE UPDATE ON message_reactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
