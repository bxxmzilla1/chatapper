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
  sender_type      TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
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
CREATE POLICY "Public insert conversations"
  ON public.conversations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow reading conversations (required for realtime)
CREATE POLICY "Public read conversations"
  ON public.conversations FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow updating conversations (unread count, last message)
CREATE POLICY "Public update conversations"
  ON public.conversations FOR UPDATE
  TO anon, authenticated
  USING (true);

-- Allow inserting messages
CREATE POLICY "Public insert messages"
  ON public.messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow reading messages
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
CREATE POLICY "Public upload chat-media"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'chat-media');

-- Storage policy: allow public reads
CREATE POLICY "Public read chat-media"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'chat-media');

-- 6. Enable Realtime for both tables
-- Go to Supabase Dashboard → Database → Replication
-- and enable realtime for: conversations, messages
-- OR run:
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
