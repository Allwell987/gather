-- Level 2 verification request fields
-- Run this in Supabase SQL editor for existing projects.

ALTER TABLE public.verification_requests
  ADD COLUMN IF NOT EXISTS verification_level TEXT DEFAULT 'level_2',
  ADD COLUMN IF NOT EXISTS certificate_bucket TEXT,
  ADD COLUMN IF NOT EXISTS certificate_path TEXT,
  ADD COLUMN IF NOT EXISTS certificate_file_name TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP DEFAULT NOW();
