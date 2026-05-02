-- Gather App chat image storage setup
-- Run this after database/schema.sql in your Supabase SQL editor.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'chat-images',
  'chat-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Chat images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own chat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chat images" ON storage.objects;

CREATE POLICY "Chat images are publicly accessible" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'chat-images');

CREATE POLICY "Users can upload chat images" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users can update their own chat images" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'chat-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own chat images" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

