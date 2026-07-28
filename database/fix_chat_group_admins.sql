-- Adds group-level admins and grants admin permissions for managing chat groups.

CREATE TABLE IF NOT EXISTS chat_group_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id TEXT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_group_admins_group_id ON chat_group_admins(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_admins_user_id ON chat_group_admins(user_id);

ALTER TABLE chat_group_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_view_chat_group_admins" ON chat_group_admins;
CREATE POLICY "users_can_view_chat_group_admins" ON chat_group_admins
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "group_admins_can_insert_chat_group_admins" ON chat_group_admins;
CREATE POLICY "group_admins_can_insert_chat_group_admins" ON chat_group_admins
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_group_admins current_admins
      WHERE current_admins.group_id = chat_group_admins.group_id
      AND current_admins.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM chat_groups
      WHERE chat_groups.id = chat_group_admins.group_id
      AND chat_groups.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "group_admins_can_delete_chat_group_admins" ON chat_group_admins;
CREATE POLICY "group_admins_can_delete_chat_group_admins" ON chat_group_admins
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM chat_group_admins current_admins
      WHERE current_admins.group_id = chat_group_admins.group_id
      AND current_admins.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM chat_groups
      WHERE chat_groups.id = chat_group_admins.group_id
      AND chat_groups.created_by = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.prevent_last_group_admin_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count
  FROM chat_group_admins
  WHERE group_id = OLD.group_id;

  IF admin_count <= 1 THEN
    RAISE EXCEPTION 'Cannot remove the last admin from a group.';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS before_chat_group_admin_deleted ON chat_group_admins;
CREATE TRIGGER before_chat_group_admin_deleted
  BEFORE DELETE ON chat_group_admins
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_group_admin_removal();

CREATE TABLE IF NOT EXISTS chat_group_admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id TEXT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_group_admin_audit_logs_group_id ON chat_group_admin_audit_logs(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_admin_audit_logs_actor_user_id ON chat_group_admin_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_admin_audit_logs_created_at ON chat_group_admin_audit_logs(created_at DESC);

ALTER TABLE chat_group_admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_admins_can_view_chat_group_admin_audit_logs" ON chat_group_admin_audit_logs;
CREATE POLICY "group_admins_can_view_chat_group_admin_audit_logs" ON chat_group_admin_audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_groups
      WHERE chat_groups.id = chat_group_admin_audit_logs.group_id
      AND chat_groups.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM chat_group_admins
      WHERE chat_group_admins.group_id = chat_group_admin_audit_logs.group_id
      AND chat_group_admins.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "group_admins_can_insert_chat_group_admin_audit_logs" ON chat_group_admin_audit_logs;
CREATE POLICY "group_admins_can_insert_chat_group_admin_audit_logs" ON chat_group_admin_audit_logs
  FOR INSERT WITH CHECK (
    actor_user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM chat_groups
        WHERE chat_groups.id = chat_group_admin_audit_logs.group_id
        AND chat_groups.created_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM chat_group_admins
        WHERE chat_group_admins.group_id = chat_group_admin_audit_logs.group_id
        AND chat_group_admins.user_id = auth.uid()
      )
    )
  );

CREATE OR REPLACE FUNCTION public.ensure_group_creator_is_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.chat_group_admins (group_id, user_id)
    VALUES (NEW.id, NEW.created_by)
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_chat_group_created_admin ON chat_groups;
CREATE TRIGGER on_chat_group_created_admin
  AFTER INSERT ON chat_groups
  FOR EACH ROW EXECUTE FUNCTION public.ensure_group_creator_is_admin();

INSERT INTO chat_group_admins (group_id, user_id)
SELECT id, created_by
FROM chat_groups
WHERE created_by IS NOT NULL
ON CONFLICT (group_id, user_id) DO NOTHING;

DROP POLICY IF EXISTS "group_creators_can_update_chat_groups" ON chat_groups;
CREATE POLICY "group_creators_can_update_chat_groups" ON chat_groups
  FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_group_admins
      WHERE chat_group_admins.group_id = chat_groups.id
      AND chat_group_admins.user_id = auth.uid()
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_group_admins
      WHERE chat_group_admins.group_id = chat_groups.id
      AND chat_group_admins.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users_can_join_chat_group_members" ON chat_group_members;
CREATE POLICY "users_can_join_chat_group_members" ON chat_group_members
  FOR INSERT WITH CHECK (
    (
      auth.uid() = user_id AND (
        EXISTS (
          SELECT 1 FROM chat_groups
          WHERE chat_groups.id = group_id
          AND chat_groups.is_private = false
        )
        OR EXISTS (
          SELECT 1 FROM chat_groups
          WHERE chat_groups.id = group_id
          AND chat_groups.created_by = auth.uid()
        )
      )
    )
    OR EXISTS (
      SELECT 1 FROM chat_group_admins
      WHERE chat_group_admins.group_id = chat_group_members.group_id
      AND chat_group_admins.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "group_creators_can_manage_join_requests" ON chat_group_join_requests;
CREATE POLICY "group_creators_can_manage_join_requests" ON chat_group_join_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM chat_groups
      WHERE chat_groups.id = group_id
      AND chat_groups.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM chat_group_admins
      WHERE chat_group_admins.group_id = chat_group_join_requests.group_id
      AND chat_group_admins.user_id = auth.uid()
    )
  );
