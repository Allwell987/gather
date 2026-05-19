-- Gather App Database Schema
-- Created for The Wealth Reality Church — Warri, Delta State, Nigeria

-- ============================================================================
-- 0. UTILS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  IF to_jsonb(NEW) ? 'updated_at' THEN
    NEW := jsonb_populate_record(NEW, jsonb_build_object('updated_at', NOW()));
  END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- 1. PROFILES TABLE (User profiles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  address TEXT,
  birthday TEXT,
  church_id UUID,
  role TEXT DEFAULT 'member', -- 'member', 'leader', 'pastor', 'admin'
  is_verified BOOLEAN DEFAULT false,
  bible_version TEXT DEFAULT 'niv',
  reminder_time TEXT DEFAULT '06:00',
  streak_count INTEGER DEFAULT 0,
  streak_last_date DATE,
  push_token TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add is_verified if it doesn't exist (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_verified') THEN
        ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;
    END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='address') THEN
        ALTER TABLE profiles ADD COLUMN address TEXT;
    END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='birthday') THEN
        ALTER TABLE profiles ADD COLUMN birthday TEXT;
    END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='updated_at') THEN
    ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_view_own_profile" ON profiles;
CREATE POLICY "users_can_view_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_can_update_own_profile" ON profiles;
CREATE POLICY "users_can_update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "admins_can_update_profiles" ON profiles;
CREATE POLICY "admins_can_update_profiles" ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles reviewer
      WHERE reviewer.id = auth.uid()
      AND reviewer.role IN ('admin', 'pastor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles reviewer
      WHERE reviewer.id = auth.uid()
      AND reviewer.role IN ('admin', 'pastor')
    )
  );

DROP POLICY IF EXISTS "users_can_insert_own_profile" ON profiles;
CREATE POLICY "users_can_insert_own_profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_can_view_all_profiles" ON profiles;
CREATE POLICY "users_can_view_all_profiles" ON profiles
  FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    role,
    is_verified,
    bible_version,
    reminder_time,
    streak_count
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, CONCAT(NEW.id::text, '@placeholder.local')),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.raw_user_meta_data ->> 'avatar_url',
    'member',
    false,
    'niv',
    '06:00',
    0
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. VERIFICATION_REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  verification_level TEXT DEFAULT 'level_2',
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  certificate_bucket TEXT,
  certificate_path TEXT,
  certificate_file_name TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

DO $$
BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='verification_requests' AND column_name='updated_at'
    ) THEN
        ALTER TABLE verification_requests ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='verification_requests' AND column_name='verification_level'
    ) THEN
        ALTER TABLE verification_requests ADD COLUMN verification_level TEXT DEFAULT 'level_2';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='verification_requests' AND column_name='certificate_bucket'
    ) THEN
        ALTER TABLE verification_requests ADD COLUMN certificate_bucket TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='verification_requests' AND column_name='certificate_path'
    ) THEN
        ALTER TABLE verification_requests ADD COLUMN certificate_path TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='verification_requests' AND column_name='certificate_file_name'
    ) THEN
        ALTER TABLE verification_requests ADD COLUMN certificate_file_name TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='verification_requests' AND column_name='submitted_at'
    ) THEN
        ALTER TABLE verification_requests ADD COLUMN submitted_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_view_own_requests" ON verification_requests;
CREATE POLICY "users_can_view_own_requests" ON verification_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_can_insert_own_requests" ON verification_requests;
CREATE POLICY "users_can_insert_own_requests" ON verification_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_can_view_all_verification_requests" ON verification_requests;
CREATE POLICY "admins_can_view_all_verification_requests" ON verification_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles reviewer
      WHERE reviewer.id = auth.uid()
      AND reviewer.role IN ('admin', 'pastor')
    )
  );

DROP POLICY IF EXISTS "admins_can_update_verification_requests" ON verification_requests;
CREATE POLICY "admins_can_update_verification_requests" ON verification_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles reviewer
      WHERE reviewer.id = auth.uid()
      AND reviewer.role IN ('admin', 'pastor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles reviewer
      WHERE reviewer.id = auth.uid()
      AND reviewer.role IN ('admin', 'pastor')
    )
  );

DROP TRIGGER IF EXISTS set_verification_requests_updated_at ON verification_requests;
CREATE TRIGGER set_verification_requests_updated_at
  BEFORE UPDATE ON verification_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. CHAT_GROUPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '👥',
  description TEXT,
  display_picture_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  member_count INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_groups' AND column_name='updated_at') THEN
        ALTER TABLE chat_groups ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_view_chat_groups" ON chat_groups;
CREATE POLICY "users_can_view_chat_groups" ON chat_groups
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "verified_users_can_create_chat_groups" ON chat_groups;
CREATE POLICY "verified_users_can_create_chat_groups" ON chat_groups
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_verified = true
    )
  );

DROP POLICY IF EXISTS "group_creators_can_update_chat_groups" ON chat_groups;
CREATE POLICY "group_creators_can_update_chat_groups" ON chat_groups
  FOR UPDATE USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP TRIGGER IF EXISTS set_chat_groups_updated_at ON chat_groups;
CREATE TRIGGER set_chat_groups_updated_at
  BEFORE UPDATE ON chat_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO chat_groups (id, name, emoji, description)
VALUES
  ('young-adults', 'Young Adults', '👨‍👩‍👧', 'Young adults fellowship chat'),
  ('mens-bible-study', 'Men''s Bible Study', '📖', 'Men''s Bible study group chat')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  emoji = EXCLUDED.emoji,
  description = EXCLUDED.description;

-- ============================================================================
-- 4. CHAT_GROUP_MEMBERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id TEXT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- ============================================================================
-- 4.2. CHAT_GROUP_ADMINS TABLE
-- ============================================================================
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

-- ============================================================================
-- 4.3. CHAT_GROUP_ADMIN_AUDIT_LOGS TABLE
-- ============================================================================
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
SECURITY DEFINER
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

CREATE INDEX IF NOT EXISTS idx_chat_group_members_group_id ON chat_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_members_user_id ON chat_group_members(user_id);

ALTER TABLE chat_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_view_chat_group_members" ON chat_group_members;
CREATE POLICY "users_can_view_chat_group_members" ON chat_group_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "users_can_join_chat_group_members" ON chat_group_members;
CREATE POLICY "users_can_join_chat_group_members" ON chat_group_members
  FOR INSERT WITH CHECK (
    (
      auth.uid() = user_id AND (
        -- Allow join if group is public
        EXISTS (
          SELECT 1 FROM chat_groups
          WHERE chat_groups.id = group_id
          AND chat_groups.is_private = false
        )
        OR
        -- Allow join if user created the group
        EXISTS (
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

DROP POLICY IF EXISTS "users_can_leave_chat_group_members" ON chat_group_members;
CREATE POLICY "users_can_leave_chat_group_members" ON chat_group_members
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 4.5. CHAT_GROUP_JOIN_REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_group_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id TEXT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

DO $$
BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='chat_group_join_requests' AND column_name='updated_at'
    ) THEN
        ALTER TABLE chat_group_join_requests ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_group_join_requests_group_id ON chat_group_join_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_join_requests_user_id ON chat_group_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_join_requests_status ON chat_group_join_requests(status);

ALTER TABLE chat_group_join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_view_own_join_requests" ON chat_group_join_requests;
CREATE POLICY "users_can_view_own_join_requests" ON chat_group_join_requests
  FOR SELECT USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM chat_groups
      WHERE chat_groups.id = group_id
      AND chat_groups.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users_can_request_to_join_private_groups" ON chat_group_join_requests;
CREATE POLICY "users_can_request_to_join_private_groups" ON chat_group_join_requests
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM chat_groups
      WHERE chat_groups.id = group_id
      AND chat_groups.is_private = true
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

DROP TRIGGER IF EXISTS set_chat_group_join_requests_updated_at ON chat_group_join_requests;
CREATE TRIGGER set_chat_group_join_requests_updated_at
  BEFORE UPDATE ON chat_group_join_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id TEXT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='updated_at') THEN
        ALTER TABLE messages ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

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

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_view_messages" ON messages;
CREATE POLICY "users_can_view_messages" ON messages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "users_can_insert_messages" ON messages;
CREATE POLICY "users_can_insert_messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_can_update_own_messages" ON messages;
CREATE POLICY "users_can_update_own_messages" ON messages
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_can_delete_own_messages" ON messages;
CREATE POLICY "users_can_delete_own_messages" ON messages
  FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_messages_updated_at ON messages;
CREATE TRIGGER set_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5.5. MESSAGE_REACTIONS TABLE
-- ============================================================================
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

-- ============================================================================
-- 5.6. MESSAGE_READS TABLE
-- Tracks which users have read which messages (read receipts).
-- ============================================================================
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

-- ============================================================================
-- 6. PRAYER_REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT DEFAULT 'general',
  title TEXT NOT NULL,
  description TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  prayer_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open', -- 'open', 'answered', 'urgent'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prayer_requests' AND column_name='updated_at') THEN
        ALTER TABLE prayer_requests ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_view_prayer_requests" ON prayer_requests;
CREATE POLICY "users_can_view_prayer_requests" ON prayer_requests
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "users_can_insert_prayer_requests" ON prayer_requests;
CREATE POLICY "users_can_insert_prayer_requests" ON prayer_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_can_update_own_requests" ON prayer_requests;
CREATE POLICY "users_can_update_own_requests" ON prayer_requests
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_can_delete_own_requests" ON prayer_requests;
CREATE POLICY "users_can_delete_own_requests" ON prayer_requests
  FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_prayer_requests_updated_at ON prayer_requests;
CREATE TRIGGER set_prayer_requests_updated_at
  BEFORE UPDATE ON prayer_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. EVENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  category TEXT DEFAULT 'worship',
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  location TEXT,
  capacity INTEGER DEFAULT 300,
  is_live BOOLEAN DEFAULT false,
  live_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='updated_at') THEN
        ALTER TABLE events ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_view_events" ON events;
CREATE POLICY "users_can_view_events" ON events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admins_can_manage_events" ON events;
CREATE POLICY "admins_can_manage_events" ON events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'pastor', 'leader')
    )
  );

DROP TRIGGER IF EXISTS set_events_updated_at ON events;
CREATE TRIGGER set_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. EVENT_RSVPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_rsvps' AND column_name='updated_at') THEN
        ALTER TABLE event_rsvps ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_view_event_rsvps" ON event_rsvps;
CREATE POLICY "users_can_view_event_rsvps" ON event_rsvps
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "users_can_insert_own_event_rsvps" ON event_rsvps;
CREATE POLICY "users_can_insert_own_event_rsvps" ON event_rsvps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_can_delete_own_event_rsvps" ON event_rsvps;
CREATE POLICY "users_can_delete_own_event_rsvps" ON event_rsvps
  FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_event_rsvps_updated_at ON event_rsvps;
CREATE TRIGGER set_event_rsvps_updated_at
  BEFORE UPDATE ON event_rsvps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. GIVING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS giving (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'NGN',
  category TEXT DEFAULT 'app_maintenance',
  payment_reference TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  transaction_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='giving' AND column_name='updated_at') THEN
        ALTER TABLE giving ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

ALTER TABLE giving ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_view_own_giving" ON giving;
CREATE POLICY "users_can_view_own_giving" ON giving
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_can_insert_giving" ON giving;
CREATE POLICY "users_can_insert_giving" ON giving
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_can_update_own_giving" ON giving;
CREATE POLICY "users_can_update_own_giving" ON giving
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_can_view_all_giving" ON giving;
CREATE POLICY "admins_can_view_all_giving" ON giving
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'pastor')
    )
  );

DROP TRIGGER IF EXISTS set_giving_updated_at ON giving;
CREATE TRIGGER set_giving_updated_at
  BEFORE UPDATE ON giving
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_group_id_created_at ON messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_user_id ON prayer_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_giving_user_id ON giving(user_id);

-- ============================================================================
-- 11. DEVOTIONALS & READS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.devotionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publish_date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  anchor_scripture TEXT NOT NULL,
  opening_charge TEXT NOT NULL,
  core_teaching TEXT NOT NULL,
  supporting_scriptures TEXT[] NOT NULL,
  spiritual_insight TEXT NOT NULL,
  biblical_example TEXT NOT NULL,
  warning_correction TEXT NOT NULL,
  declaration TEXT NOT NULL,
  summary TEXT NOT NULL,
  theme TEXT NOT NULL,
  month_focus TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.devotionals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read-only access to devotionals" ON public.devotionals;
CREATE POLICY "Allow public read-only access to devotionals"
  ON public.devotionals FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_devotionals_publish_date ON devotionals(publish_date);

CREATE TABLE IF NOT EXISTS public.devotional_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  devotional_id UUID NOT NULL REFERENCES devotionals(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, devotional_id)
);

ALTER TABLE public.devotional_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own devotional reads" ON public.devotional_reads;
CREATE POLICY "Users can view own devotional reads"
  ON public.devotional_reads FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own devotional reads" ON public.devotional_reads;
CREATE POLICY "Users can insert own devotional reads"
  ON public.devotional_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_devotional_reads_user_id ON devotional_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_devotional_reads_devotional_id ON devotional_reads(devotional_id);

-- ============================================================================
-- 12. DAILY VERSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_verses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publish_date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  text TEXT NOT NULL,
  reference TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.daily_verses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read-only access to daily_verses" ON public.daily_verses;
CREATE POLICY "Allow public read-only access to daily_verses"
  ON public.daily_verses FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_daily_verses_publish_date ON daily_verses(publish_date);
