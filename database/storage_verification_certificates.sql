-- Gather App verification certificate storage setup
-- Run this after database/schema.sql in your Supabase SQL editor.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'verification-certificates',
  'verification-certificates',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users can view own verification certificates" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all verification certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own verification certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own verification certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own verification certificates" ON storage.objects;

CREATE POLICY "Users can view own verification certificates" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-certificates'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins can view all verification certificates" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-certificates'
    AND EXISTS (
      SELECT 1 FROM public.profiles reviewer
      WHERE reviewer.id = auth.uid()
      AND reviewer.role IN ('admin', 'pastor')
    )
  );

CREATE POLICY "Users can upload own verification certificates" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-certificates'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own verification certificates" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'verification-certificates'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'verification-certificates'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own verification certificates" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'verification-certificates'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
