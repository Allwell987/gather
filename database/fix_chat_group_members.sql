-- Repair script for environments where chat_group_members was not created.

ALTER TABLE chat_groups
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_picture_url TEXT;

UPDATE chat_groups
SET
  member_count = COALESCE(member_count, 0),
  is_private = COALESCE(is_private, false);

ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_creators_can_update_chat_groups" ON chat_groups;
CREATE POLICY "group_creators_can_update_chat_groups" ON chat_groups
  FOR UPDATE USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE TABLE IF NOT EXISTS chat_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id TEXT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_group_members_group_id ON chat_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_members_user_id ON chat_group_members(user_id);

ALTER TABLE chat_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_view_chat_group_members" ON chat_group_members;
CREATE POLICY "users_can_view_chat_group_members" ON chat_group_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "users_can_join_chat_group_members" ON chat_group_members;
CREATE POLICY "users_can_join_chat_group_members" ON chat_group_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      EXISTS (
        SELECT 1 FROM chat_groups
        WHERE chat_groups.id = group_id
        AND chat_groups.is_private = false
      )
      OR
      EXISTS (
        SELECT 1 FROM chat_groups
        WHERE chat_groups.id = group_id
        AND chat_groups.created_by = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "users_can_leave_chat_group_members" ON chat_group_members;
CREATE POLICY "users_can_leave_chat_group_members" ON chat_group_members
  FOR DELETE USING (auth.uid() = user_id);