


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."ensure_group_creator_is_admin"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."ensure_group_creator_is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."handle_new_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_last_group_admin_removal"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."prevent_last_group_admin_removal"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_campaign_on_donation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'success' THEN
    UPDATE public.campaigns
    SET raised_amount = raised_amount + NEW.amount,
        updated_at = NOW()
    WHERE id IN (
      SELECT id FROM public.campaigns
      WHERE is_active = true
      ORDER BY created_at ASC
      LIMIT 1
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_campaign_on_donation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF to_jsonb(NEW) ? 'updated_at' THEN
    NEW := jsonb_populate_record(NEW, jsonb_build_object('updated_at', NOW()));
  END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_streak"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    last_date DATE;
    current_streak INTEGER;
    today DATE;
BEGIN
    -- Get the user's current streak info from profiles
    SELECT streak_last_date, streak_count
    INTO last_date, current_streak
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- Use the date the devotional was read (in UTC)
    today := (NEW.read_at AT TIME ZONE 'UTC')::date;

    IF last_date IS NULL THEN
        -- First time reading, start streak at 1
        UPDATE public.profiles
        SET streak_count = 1, streak_last_date = today
        WHERE id = NEW.user_id;
    ELSIF today > last_date THEN
        IF today = last_date + INTERVAL '1 day' THEN
            -- Read yesterday, increment streak
            UPDATE public.profiles
            SET streak_count = current_streak + 1, streak_last_date = today
            WHERE id = NEW.user_id;
        ELSE
            -- Streak broken (last read was before yesterday), reset to 1
            UPDATE public.profiles
            SET streak_count = 1, streak_last_date = today
            WHERE id = NEW.user_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_streak"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bible_highlights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "book" "text" NOT NULL,
    "chapter" integer NOT NULL,
    "verse_start" integer NOT NULL,
    "verse_end" integer,
    "color" "text" DEFAULT 'yellow'::"text",
    "text" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."bible_highlights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bible_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "book" "text" NOT NULL,
    "chapter" integer NOT NULL,
    "verse_start" integer NOT NULL,
    "verse_end" integer,
    "note" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."bible_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "emoji" "text" DEFAULT '🙏'::"text",
    "bg_color" "text" DEFAULT '#f0f0f0'::"text",
    "raised_amount" numeric(12,2) DEFAULT 0,
    "goal_amount" numeric(12,2) NOT NULL,
    "contributors_count" integer DEFAULT 0,
    "progress_color" "text" DEFAULT '#1a56db'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_group_admin_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "text" NOT NULL,
    "actor_user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "target_user_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."chat_group_admin_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_group_admins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."chat_group_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_group_join_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."chat_group_join_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_group_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."chat_group_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_groups" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "emoji" "text" DEFAULT '👥'::"text",
    "description" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "created_by" "uuid",
    "member_count" integer DEFAULT 0,
    "is_private" boolean DEFAULT false,
    "display_picture_url" "text",
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."chat_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_verses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "publish_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "text" "text" NOT NULL,
    "reference" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."daily_verses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."devotional_reads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "devotional_id" "uuid" NOT NULL,
    "read_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."devotional_reads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."devotionals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "publish_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "title" "text" NOT NULL,
    "anchor_scripture" "text" NOT NULL,
    "opening_charge" "text" NOT NULL,
    "core_teaching" "text" NOT NULL,
    "supporting_scriptures" "text"[] NOT NULL,
    "spiritual_insight" "text" NOT NULL,
    "biblical_example" "text" NOT NULL,
    "warning_correction" "text" NOT NULL,
    "declaration" "text" NOT NULL,
    "summary" "text" NOT NULL,
    "theme" "text" NOT NULL,
    "month_focus" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."devotionals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_rsvps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_rsvps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "cover_url" "text",
    "category" "text" DEFAULT 'worship'::"text",
    "start_time" timestamp without time zone NOT NULL,
    "end_time" timestamp without time zone NOT NULL,
    "location" "text",
    "capacity" integer DEFAULT 300,
    "is_live" boolean DEFAULT false,
    "live_url" "text",
    "created_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."giving" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'NGN'::"text",
    "category" "text" DEFAULT 'app_maintenance'::"text",
    "payment_reference" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "transaction_id" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."giving" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reaction" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."message_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_reads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "read_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."message_reads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "deleted_at" timestamp without time zone,
    "reply_to_message_id" "uuid"
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prayer_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category" "text" DEFAULT 'general'::"text",
    "title" "text" NOT NULL,
    "description" "text",
    "is_anonymous" boolean DEFAULT false,
    "prayer_count" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'open'::"text"
);


ALTER TABLE "public"."prayer_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prayer_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prayer_request_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."prayer_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "church_id" "uuid",
    "role" "text" DEFAULT 'member'::"text",
    "bible_version" "text" DEFAULT 'niv'::"text",
    "reminder_time" "text" DEFAULT '06:00'::"text",
    "streak_count" integer DEFAULT 0,
    "streak_last_date" "date",
    "push_token" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "is_verified" boolean DEFAULT false,
    "address" "text",
    "birthday" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."verification_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "reason" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "verification_level" "text" DEFAULT 'level_2'::"text",
    "certificate_bucket" "text",
    "certificate_path" "text",
    "certificate_file_name" "text",
    "submitted_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."verification_requests" OWNER TO "postgres";


ALTER TABLE ONLY "public"."bible_highlights"
    ADD CONSTRAINT "bible_highlights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bible_notes"
    ADD CONSTRAINT "bible_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_group_admin_audit_logs"
    ADD CONSTRAINT "chat_group_admin_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_group_admins"
    ADD CONSTRAINT "chat_group_admins_group_id_user_id_key" UNIQUE ("group_id", "user_id");



ALTER TABLE ONLY "public"."chat_group_admins"
    ADD CONSTRAINT "chat_group_admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_group_join_requests"
    ADD CONSTRAINT "chat_group_join_requests_group_id_user_id_key" UNIQUE ("group_id", "user_id");



ALTER TABLE ONLY "public"."chat_group_join_requests"
    ADD CONSTRAINT "chat_group_join_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_group_members"
    ADD CONSTRAINT "chat_group_members_group_id_user_id_key" UNIQUE ("group_id", "user_id");



ALTER TABLE ONLY "public"."chat_group_members"
    ADD CONSTRAINT "chat_group_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_groups"
    ADD CONSTRAINT "chat_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_verses"
    ADD CONSTRAINT "daily_verses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_verses"
    ADD CONSTRAINT "daily_verses_publish_date_key" UNIQUE ("publish_date");



ALTER TABLE ONLY "public"."devotional_reads"
    ADD CONSTRAINT "devotional_reads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."devotional_reads"
    ADD CONSTRAINT "devotional_reads_user_id_devotional_id_key" UNIQUE ("user_id", "devotional_id");



ALTER TABLE ONLY "public"."devotionals"
    ADD CONSTRAINT "devotionals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."devotionals"
    ADD CONSTRAINT "devotionals_publish_date_key" UNIQUE ("publish_date");



ALTER TABLE ONLY "public"."event_rsvps"
    ADD CONSTRAINT "event_rsvps_event_id_user_id_key" UNIQUE ("event_id", "user_id");



ALTER TABLE ONLY "public"."event_rsvps"
    ADD CONSTRAINT "event_rsvps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."giving"
    ADD CONSTRAINT "giving_payment_reference_key" UNIQUE ("payment_reference");



ALTER TABLE ONLY "public"."giving"
    ADD CONSTRAINT "giving_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_message_id_user_id_key" UNIQUE ("message_id", "user_id");



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_reads"
    ADD CONSTRAINT "message_reads_message_id_user_id_key" UNIQUE ("message_id", "user_id");



ALTER TABLE ONLY "public"."message_reads"
    ADD CONSTRAINT "message_reads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prayer_requests"
    ADD CONSTRAINT "prayer_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prayer_responses"
    ADD CONSTRAINT "prayer_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."verification_requests"
    ADD CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."verification_requests"
    ADD CONSTRAINT "verification_requests_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_bible_highlights_book_chapter" ON "public"."bible_highlights" USING "btree" ("book", "chapter");



CREATE INDEX "idx_bible_highlights_user_id" ON "public"."bible_highlights" USING "btree" ("user_id");



CREATE INDEX "idx_bible_notes_book_chapter" ON "public"."bible_notes" USING "btree" ("book", "chapter");



CREATE INDEX "idx_bible_notes_user_id" ON "public"."bible_notes" USING "btree" ("user_id");



CREATE INDEX "idx_chat_group_admin_audit_logs_actor_user_id" ON "public"."chat_group_admin_audit_logs" USING "btree" ("actor_user_id");



CREATE INDEX "idx_chat_group_admin_audit_logs_created_at" ON "public"."chat_group_admin_audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_chat_group_admin_audit_logs_group_id" ON "public"."chat_group_admin_audit_logs" USING "btree" ("group_id");



CREATE INDEX "idx_chat_group_admins_group_id" ON "public"."chat_group_admins" USING "btree" ("group_id");



CREATE INDEX "idx_chat_group_admins_user_id" ON "public"."chat_group_admins" USING "btree" ("user_id");



CREATE INDEX "idx_chat_group_join_requests_group_id" ON "public"."chat_group_join_requests" USING "btree" ("group_id");



CREATE INDEX "idx_chat_group_join_requests_status" ON "public"."chat_group_join_requests" USING "btree" ("status");



CREATE INDEX "idx_chat_group_join_requests_user_id" ON "public"."chat_group_join_requests" USING "btree" ("user_id");



CREATE INDEX "idx_chat_group_members_group_id" ON "public"."chat_group_members" USING "btree" ("group_id");



CREATE INDEX "idx_chat_group_members_user_id" ON "public"."chat_group_members" USING "btree" ("user_id");



CREATE INDEX "idx_daily_verses_publish_date" ON "public"."daily_verses" USING "btree" ("publish_date");



CREATE INDEX "idx_devotional_reads_devotional_id" ON "public"."devotional_reads" USING "btree" ("devotional_id");



CREATE INDEX "idx_devotional_reads_user_id" ON "public"."devotional_reads" USING "btree" ("user_id");



CREATE INDEX "idx_devotionals_publish_date" ON "public"."devotionals" USING "btree" ("publish_date");



CREATE INDEX "idx_event_rsvps_event_id" ON "public"."event_rsvps" USING "btree" ("event_id");



CREATE INDEX "idx_event_rsvps_user_id" ON "public"."event_rsvps" USING "btree" ("user_id");



CREATE INDEX "idx_events_category" ON "public"."events" USING "btree" ("category");



CREATE INDEX "idx_events_start_time" ON "public"."events" USING "btree" ("start_time");



CREATE INDEX "idx_giving_created_at" ON "public"."giving" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_giving_status" ON "public"."giving" USING "btree" ("status");



CREATE INDEX "idx_giving_user_id" ON "public"."giving" USING "btree" ("user_id");



CREATE INDEX "idx_message_reactions_message_id" ON "public"."message_reactions" USING "btree" ("message_id");



CREATE INDEX "idx_message_reactions_user_id" ON "public"."message_reactions" USING "btree" ("user_id");



CREATE INDEX "idx_message_reads_message_id" ON "public"."message_reads" USING "btree" ("message_id");



CREATE INDEX "idx_message_reads_user_id" ON "public"."message_reads" USING "btree" ("user_id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_messages_group_id_created_at" ON "public"."messages" USING "btree" ("group_id", "created_at" DESC);



CREATE INDEX "idx_messages_reply_to_message_id" ON "public"."messages" USING "btree" ("reply_to_message_id");



CREATE INDEX "idx_messages_user_id" ON "public"."messages" USING "btree" ("user_id");



CREATE INDEX "idx_prayer_requests_category" ON "public"."prayer_requests" USING "btree" ("category");



CREATE INDEX "idx_prayer_requests_created_at" ON "public"."prayer_requests" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_prayer_requests_user_id" ON "public"."prayer_requests" USING "btree" ("user_id");



CREATE INDEX "idx_prayer_responses_request_id" ON "public"."prayer_responses" USING "btree" ("prayer_request_id");



CREATE INDEX "idx_prayer_responses_user_id" ON "public"."prayer_responses" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "before_chat_group_admin_deleted" BEFORE DELETE ON "public"."chat_group_admins" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_last_group_admin_removal"();



CREATE OR REPLACE TRIGGER "on_chat_group_created_admin" AFTER INSERT ON "public"."chat_groups" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_group_creator_is_admin"();



CREATE OR REPLACE TRIGGER "on_devotional_read_update_streak" AFTER INSERT OR UPDATE ON "public"."devotional_reads" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_streak"();



CREATE OR REPLACE TRIGGER "on_giving_success_update_campaign" AFTER INSERT ON "public"."giving" FOR EACH ROW EXECUTE FUNCTION "public"."update_campaign_on_donation"();



CREATE OR REPLACE TRIGGER "set_chat_group_join_requests_updated_at" BEFORE UPDATE ON "public"."chat_group_join_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_chat_groups_updated_at" BEFORE UPDATE ON "public"."chat_groups" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_event_rsvps_updated_at" BEFORE UPDATE ON "public"."event_rsvps" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_events_updated_at" BEFORE UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_giving_updated_at" BEFORE UPDATE ON "public"."giving" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_message_reactions_updated_at" BEFORE UPDATE ON "public"."message_reactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_messages_updated_at" BEFORE UPDATE ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_prayer_requests_updated_at" BEFORE UPDATE ON "public"."prayer_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_verification_requests_updated_at" BEFORE UPDATE ON "public"."verification_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."bible_highlights"
    ADD CONSTRAINT "bible_highlights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bible_notes"
    ADD CONSTRAINT "bible_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_group_admin_audit_logs"
    ADD CONSTRAINT "chat_group_admin_audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_group_admin_audit_logs"
    ADD CONSTRAINT "chat_group_admin_audit_logs_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."chat_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_group_admin_audit_logs"
    ADD CONSTRAINT "chat_group_admin_audit_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_group_admins"
    ADD CONSTRAINT "chat_group_admins_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."chat_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_group_admins"
    ADD CONSTRAINT "chat_group_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_group_join_requests"
    ADD CONSTRAINT "chat_group_join_requests_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."chat_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_group_join_requests"
    ADD CONSTRAINT "chat_group_join_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_group_members"
    ADD CONSTRAINT "chat_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."chat_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_group_members"
    ADD CONSTRAINT "chat_group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_groups"
    ADD CONSTRAINT "chat_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."devotional_reads"
    ADD CONSTRAINT "devotional_reads_devotional_id_fkey" FOREIGN KEY ("devotional_id") REFERENCES "public"."devotionals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."devotional_reads"
    ADD CONSTRAINT "devotional_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_rsvps"
    ADD CONSTRAINT "event_rsvps_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_rsvps"
    ADD CONSTRAINT "event_rsvps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."giving"
    ADD CONSTRAINT "giving_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reads"
    ADD CONSTRAINT "message_reads_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reads"
    ADD CONSTRAINT "message_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."chat_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_reply_to_message_id_fkey" FOREIGN KEY ("reply_to_message_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prayer_requests"
    ADD CONSTRAINT "prayer_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prayer_responses"
    ADD CONSTRAINT "prayer_responses_prayer_request_id_fkey" FOREIGN KEY ("prayer_request_id") REFERENCES "public"."prayer_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prayer_responses"
    ADD CONSTRAINT "prayer_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."verification_requests"
    ADD CONSTRAINT "verification_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Allow public read-only access to active campaigns" ON "public"."campaigns" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Allow public read-only access to daily_verses" ON "public"."daily_verses" FOR SELECT USING (true);



CREATE POLICY "Allow public read-only access to devotionals" ON "public"."devotionals" FOR SELECT USING (true);



CREATE POLICY "Allow service role insert" ON "public"."devotionals" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Allow service role update" ON "public"."devotionals" FOR UPDATE USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can insert own devotional reads" ON "public"."devotional_reads" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own devotional reads" ON "public"."devotional_reads" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "admins_can_manage_events" ON "public"."events" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'pastor'::"text", 'leader'::"text"]))))));



CREATE POLICY "admins_can_update_profiles" ON "public"."profiles" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "reviewer"
  WHERE (("reviewer"."id" = "auth"."uid"()) AND ("reviewer"."role" = ANY (ARRAY['admin'::"text", 'pastor'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "reviewer"
  WHERE (("reviewer"."id" = "auth"."uid"()) AND ("reviewer"."role" = ANY (ARRAY['admin'::"text", 'pastor'::"text"]))))));



CREATE POLICY "admins_can_update_verification_requests" ON "public"."verification_requests" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "reviewer"
  WHERE (("reviewer"."id" = "auth"."uid"()) AND ("reviewer"."role" = ANY (ARRAY['admin'::"text", 'pastor'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "reviewer"
  WHERE (("reviewer"."id" = "auth"."uid"()) AND ("reviewer"."role" = ANY (ARRAY['admin'::"text", 'pastor'::"text"]))))));



CREATE POLICY "admins_can_view_all_giving" ON "public"."giving" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'pastor'::"text"]))))));



CREATE POLICY "admins_can_view_all_verification_requests" ON "public"."verification_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "reviewer"
  WHERE (("reviewer"."id" = "auth"."uid"()) AND ("reviewer"."role" = ANY (ARRAY['admin'::"text", 'pastor'::"text"]))))));



ALTER TABLE "public"."bible_highlights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bible_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_group_admin_audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_group_admins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_group_join_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_group_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_verses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."devotional_reads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."devotionals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_rsvps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."giving" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "group_admins_can_delete_chat_group_admins" ON "public"."chat_group_admins" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."chat_group_admins" "current_admins"
  WHERE (("current_admins"."group_id" = "chat_group_admins"."group_id") AND ("current_admins"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."chat_groups"
  WHERE (("chat_groups"."id" = "chat_group_admins"."group_id") AND ("chat_groups"."created_by" = "auth"."uid"()))))));



CREATE POLICY "group_admins_can_insert_chat_group_admin_audit_logs" ON "public"."chat_group_admin_audit_logs" FOR INSERT WITH CHECK ((("actor_user_id" = "auth"."uid"()) AND ((EXISTS ( SELECT 1
   FROM "public"."chat_groups"
  WHERE (("chat_groups"."id" = "chat_group_admin_audit_logs"."group_id") AND ("chat_groups"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."chat_group_admins"
  WHERE (("chat_group_admins"."group_id" = "chat_group_admin_audit_logs"."group_id") AND ("chat_group_admins"."user_id" = "auth"."uid"())))))));



CREATE POLICY "group_admins_can_insert_chat_group_admins" ON "public"."chat_group_admins" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."chat_group_admins" "current_admins"
  WHERE (("current_admins"."group_id" = "chat_group_admins"."group_id") AND ("current_admins"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."chat_groups"
  WHERE (("chat_groups"."id" = "chat_group_admins"."group_id") AND ("chat_groups"."created_by" = "auth"."uid"()))))));



CREATE POLICY "group_admins_can_update_chat_groups" ON "public"."chat_groups" FOR UPDATE USING ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."chat_group_admins"
  WHERE (("chat_group_admins"."group_id" = "chat_groups"."id") AND ("chat_group_admins"."user_id" = "auth"."uid"())))))) WITH CHECK ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."chat_group_admins"
  WHERE (("chat_group_admins"."group_id" = "chat_groups"."id") AND ("chat_group_admins"."user_id" = "auth"."uid"()))))));



CREATE POLICY "group_admins_can_view_chat_group_admin_audit_logs" ON "public"."chat_group_admin_audit_logs" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."chat_groups"
  WHERE (("chat_groups"."id" = "chat_group_admin_audit_logs"."group_id") AND ("chat_groups"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."chat_group_admins"
  WHERE (("chat_group_admins"."group_id" = "chat_group_admin_audit_logs"."group_id") AND ("chat_group_admins"."user_id" = "auth"."uid"()))))));



CREATE POLICY "group_creators_can_manage_join_requests" ON "public"."chat_group_join_requests" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."chat_groups"
  WHERE (("chat_groups"."id" = "chat_group_join_requests"."group_id") AND ("chat_groups"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."chat_group_admins"
  WHERE (("chat_group_admins"."group_id" = "chat_group_join_requests"."group_id") AND ("chat_group_admins"."user_id" = "auth"."uid"()))))));



CREATE POLICY "group_creators_can_update_chat_groups" ON "public"."chat_groups" FOR UPDATE USING ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."chat_group_admins"
  WHERE (("chat_group_admins"."group_id" = "chat_groups"."id") AND ("chat_group_admins"."user_id" = "auth"."uid"())))))) WITH CHECK ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."chat_group_admins"
  WHERE (("chat_group_admins"."group_id" = "chat_groups"."id") AND ("chat_group_admins"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."message_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_reads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prayer_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prayer_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_can_delete_own_event_rsvps" ON "public"."event_rsvps" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_delete_own_highlights" ON "public"."bible_highlights" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_delete_own_message_reactions" ON "public"."message_reactions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_delete_own_message_reads" ON "public"."message_reads" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_delete_own_messages" ON "public"."messages" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_delete_own_notes" ON "public"."bible_notes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_delete_own_requests" ON "public"."prayer_requests" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_delete_own_responses" ON "public"."prayer_responses" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_insert_giving" ON "public"."giving" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_insert_highlights" ON "public"."bible_highlights" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_insert_messages" ON "public"."messages" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_insert_notes" ON "public"."bible_notes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_insert_own_event_rsvps" ON "public"."event_rsvps" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_insert_own_message_reactions" ON "public"."message_reactions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_insert_own_message_reads" ON "public"."message_reads" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_insert_own_profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "users_can_insert_own_requests" ON "public"."verification_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_insert_prayer_requests" ON "public"."prayer_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_insert_responses" ON "public"."prayer_responses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_join_chat_group_members" ON "public"."chat_group_members" FOR INSERT WITH CHECK (((("auth"."uid"() = "user_id") AND ((EXISTS ( SELECT 1
   FROM "public"."chat_groups"
  WHERE (("chat_groups"."id" = "chat_group_members"."group_id") AND ("chat_groups"."is_private" = false)))) OR (EXISTS ( SELECT 1
   FROM "public"."chat_groups"
  WHERE (("chat_groups"."id" = "chat_group_members"."group_id") AND ("chat_groups"."created_by" = "auth"."uid"())))))) OR (EXISTS ( SELECT 1
   FROM "public"."chat_group_admins"
  WHERE (("chat_group_admins"."group_id" = "chat_group_members"."group_id") AND ("chat_group_admins"."user_id" = "auth"."uid"()))))));



CREATE POLICY "users_can_leave_chat_group_members" ON "public"."chat_group_members" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_request_to_join_private_groups" ON "public"."chat_group_join_requests" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."chat_groups"
  WHERE (("chat_groups"."id" = "chat_group_join_requests"."group_id") AND ("chat_groups"."is_private" = true))))));



CREATE POLICY "users_can_update_own_giving" ON "public"."giving" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_update_own_highlights" ON "public"."bible_highlights" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_update_own_message_reactions" ON "public"."message_reactions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_update_own_messages" ON "public"."messages" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_update_own_notes" ON "public"."bible_notes" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_update_own_profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "users_can_update_own_requests" ON "public"."prayer_requests" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_update_own_responses" ON "public"."prayer_responses" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_view_all_profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "users_can_view_chat_group_admins" ON "public"."chat_group_admins" FOR SELECT USING (true);



CREATE POLICY "users_can_view_chat_group_members" ON "public"."chat_group_members" FOR SELECT USING (true);



CREATE POLICY "users_can_view_chat_groups" ON "public"."chat_groups" FOR SELECT USING (true);



CREATE POLICY "users_can_view_event_rsvps" ON "public"."event_rsvps" FOR SELECT USING (true);



CREATE POLICY "users_can_view_events" ON "public"."events" FOR SELECT USING (true);



CREATE POLICY "users_can_view_message_reactions" ON "public"."message_reactions" FOR SELECT USING (true);



CREATE POLICY "users_can_view_message_reads" ON "public"."message_reads" FOR SELECT USING (true);



CREATE POLICY "users_can_view_messages" ON "public"."messages" FOR SELECT USING (true);



CREATE POLICY "users_can_view_own_giving" ON "public"."giving" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_view_own_highlights" ON "public"."bible_highlights" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_view_own_join_requests" ON "public"."chat_group_join_requests" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."chat_groups"
  WHERE (("chat_groups"."id" = "chat_group_join_requests"."group_id") AND ("chat_groups"."created_by" = "auth"."uid"()))))));



CREATE POLICY "users_can_view_own_notes" ON "public"."bible_notes" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_view_own_profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "users_can_view_own_requests" ON "public"."verification_requests" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_view_prayer_requests" ON "public"."prayer_requests" FOR SELECT USING (true);



CREATE POLICY "users_can_view_responses" ON "public"."prayer_responses" FOR SELECT USING (true);



ALTER TABLE "public"."verification_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "verified_users_can_create_chat_groups" ON "public"."chat_groups" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_verified" = true)))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."event_rsvps";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."message_reactions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."message_reads";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."prayer_requests";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."prayer_responses";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."ensure_group_creator_is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_group_creator_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_group_creator_is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_last_group_admin_removal"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_last_group_admin_removal"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_last_group_admin_removal"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_campaign_on_donation"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_campaign_on_donation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_campaign_on_donation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_streak"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_streak"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_streak"() TO "service_role";
























GRANT ALL ON TABLE "public"."bible_highlights" TO "anon";
GRANT ALL ON TABLE "public"."bible_highlights" TO "authenticated";
GRANT ALL ON TABLE "public"."bible_highlights" TO "service_role";



GRANT ALL ON TABLE "public"."bible_notes" TO "anon";
GRANT ALL ON TABLE "public"."bible_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."bible_notes" TO "service_role";



GRANT ALL ON TABLE "public"."campaigns" TO "anon";
GRANT ALL ON TABLE "public"."campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."chat_group_admin_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."chat_group_admin_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_group_admin_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."chat_group_admins" TO "anon";
GRANT ALL ON TABLE "public"."chat_group_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_group_admins" TO "service_role";



GRANT ALL ON TABLE "public"."chat_group_join_requests" TO "anon";
GRANT ALL ON TABLE "public"."chat_group_join_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_group_join_requests" TO "service_role";



GRANT ALL ON TABLE "public"."chat_group_members" TO "anon";
GRANT ALL ON TABLE "public"."chat_group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_group_members" TO "service_role";



GRANT ALL ON TABLE "public"."chat_groups" TO "anon";
GRANT ALL ON TABLE "public"."chat_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_groups" TO "service_role";



GRANT ALL ON TABLE "public"."daily_verses" TO "anon";
GRANT ALL ON TABLE "public"."daily_verses" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_verses" TO "service_role";



GRANT ALL ON TABLE "public"."devotional_reads" TO "anon";
GRANT ALL ON TABLE "public"."devotional_reads" TO "authenticated";
GRANT ALL ON TABLE "public"."devotional_reads" TO "service_role";



GRANT ALL ON TABLE "public"."devotionals" TO "anon";
GRANT ALL ON TABLE "public"."devotionals" TO "authenticated";
GRANT ALL ON TABLE "public"."devotionals" TO "service_role";



GRANT ALL ON TABLE "public"."event_rsvps" TO "anon";
GRANT ALL ON TABLE "public"."event_rsvps" TO "authenticated";
GRANT ALL ON TABLE "public"."event_rsvps" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."giving" TO "anon";
GRANT ALL ON TABLE "public"."giving" TO "authenticated";
GRANT ALL ON TABLE "public"."giving" TO "service_role";



GRANT ALL ON TABLE "public"."message_reactions" TO "anon";
GRANT ALL ON TABLE "public"."message_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."message_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."message_reads" TO "anon";
GRANT ALL ON TABLE "public"."message_reads" TO "authenticated";
GRANT ALL ON TABLE "public"."message_reads" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."prayer_requests" TO "anon";
GRANT ALL ON TABLE "public"."prayer_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."prayer_requests" TO "service_role";



GRANT ALL ON TABLE "public"."prayer_responses" TO "anon";
GRANT ALL ON TABLE "public"."prayer_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."prayer_responses" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."verification_requests" TO "anon";
GRANT ALL ON TABLE "public"."verification_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."verification_requests" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































