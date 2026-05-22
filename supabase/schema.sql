-- ============================================================
-- ChatUp — Supabase Schema
-- Run this in the Supabase SQL Editor (supabase.com/dashboard)
-- ============================================================

-- 1. Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_username    TEXT NOT NULL,
  admin_username   TEXT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  last_message     TEXT,
  last_message_at  TIMESTAMPTZ DEFAULT NOW(),
  unread_count     INT DEFAULT 0
);

-- 2. Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  content          TEXT,
  sender_type      TEXT NOT NULL CHECK (sender_type IN ('user', 'admin', 'system')),
  file_url         TEXT,
  file_type        TEXT CHECK (file_type IN ('image', 'video')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

-- 4. Row Level Security (allow public read/insert via anon key)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert a new conversation (starting a chat)
DROP POLICY IF EXISTS "Public insert conversations" ON public.conversations;
CREATE POLICY "Public insert conversations"
  ON public.conversations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow reading conversations (required for realtime)
DROP POLICY IF EXISTS "Public read conversations" ON public.conversations;
CREATE POLICY "Public read conversations"
  ON public.conversations FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow updating conversations (unread count, last message)
DROP POLICY IF EXISTS "Public update conversations" ON public.conversations;
CREATE POLICY "Public update conversations"
  ON public.conversations FOR UPDATE
  TO anon, authenticated
  USING (true);

-- Allow deleting conversations (admin delete chat)
DROP POLICY IF EXISTS "Public delete conversations" ON public.conversations;
CREATE POLICY "Public delete conversations"
  ON public.conversations FOR DELETE
  TO anon, authenticated
  USING (true);

-- Allow inserting messages
DROP POLICY IF EXISTS "Public insert messages" ON public.messages;
CREATE POLICY "Public insert messages"
  ON public.messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow reading messages
DROP POLICY IF EXISTS "Public read messages" ON public.messages;
CREATE POLICY "Public read messages"
  ON public.messages FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. Storage bucket for media uploads
-- Run this in the Supabase SQL editor OR create bucket manually in Storage tab:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','video/quicktime']
)
ON CONFLICT DO NOTHING;

-- Storage policy: allow public uploads
DROP POLICY IF EXISTS "Public upload chat-media" ON storage.objects;
CREATE POLICY "Public upload chat-media"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'chat-media');

-- Storage policy: allow public reads
DROP POLICY IF EXISTS "Public read chat-media" ON storage.objects;
CREATE POLICY "Public read chat-media"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'chat-media');

-- 6. Enable Realtime for both tables
-- Go to Supabase Dashboard → Database → Replication
-- and enable realtime for: conversations, messages
-- OR run:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- ============================================================
-- MIGRATION 1: Run this if you already ran the schema above
-- Adds 'system' sender_type for match-switch events
-- ============================================================
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_sender_type_check;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_type_check
  CHECK (sender_type IN ('user', 'admin', 'system'));

-- ============================================================
-- MIGRATION 2: Add user location columns to conversations
-- ============================================================
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS user_city         TEXT,
  ADD COLUMN IF NOT EXISTS user_country      TEXT,
  ADD COLUMN IF NOT EXISTS user_country_code TEXT;

-- ============================================================
-- MIGRATION 3: Model profiles (custom landing page links)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.model_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  subtitle    TEXT NOT NULL DEFAULT 'Meet people near you',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.model_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read model_profiles" ON public.model_profiles;
CREATE POLICY "Public read model_profiles"
  ON public.model_profiles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public insert model_profiles" ON public.model_profiles;
CREATE POLICY "Public insert model_profiles"
  ON public.model_profiles FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete model_profiles" ON public.model_profiles;
CREATE POLICY "Public delete model_profiles"
  ON public.model_profiles FOR DELETE TO anon, authenticated USING (true);

-- Link conversations to which model page generated them
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS model_slug TEXT;

-- ============================================================
-- MIGRATION 4: Redirect URL for model profiles
-- ============================================================
ALTER TABLE public.model_profiles
  ADD COLUMN IF NOT EXISTS redirect_url TEXT;

DROP POLICY IF EXISTS "Public update model_profiles" ON public.model_profiles;
CREATE POLICY "Public update model_profiles"
  ON public.model_profiles FOR UPDATE TO anon, authenticated USING (true);

-- ============================================================
-- MIGRATION 5: Landing page settings (background video + overlay)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  id                    TEXT PRIMARY KEY DEFAULT 'landing',
  background_video_url  TEXT,
  overlay_opacity       REAL NOT NULL DEFAULT 0.55,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.app_settings (id, overlay_opacity)
VALUES ('landing', 0.55)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read app_settings" ON public.app_settings;
CREATE POLICY "Public read app_settings"
  ON public.app_settings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public insert app_settings" ON public.app_settings;
CREATE POLICY "Public insert app_settings"
  ON public.app_settings FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Public update app_settings" ON public.app_settings;
CREATE POLICY "Public update app_settings"
  ON public.app_settings FOR UPDATE TO anon, authenticated USING (true);

-- ============================================================
-- MIGRATION 6: Cache model avatar on conversation for faster chat load
-- ============================================================
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS model_avatar_url TEXT;

-- ============================================================
-- MIGRATION 7: Persona mode + global user chat lock popup
-- ============================================================
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS persona_mode TEXT NOT NULL DEFAULT 'random';

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS fixed_persona_name TEXT;

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS chat_locked BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS lock_contact_name TEXT DEFAULT 'her';

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS lock_button_url TEXT;

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS lock_button_label TEXT DEFAULT 'Message on OnlyFans';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'app_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
  END IF;
END $$;
