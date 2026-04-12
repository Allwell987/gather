-- Create devotional_reads table
CREATE TABLE IF NOT EXISTS public.devotional_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  devotional_id UUID NOT NULL REFERENCES devotionals(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, devotional_id)
);

-- Enable RLS
ALTER TABLE public.devotional_reads ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own read records
CREATE POLICY "Users can view own devotional reads"
  ON public.devotional_reads FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to mark devotionals as read
CREATE POLICY "Users can insert own devotional reads"
  ON public.devotional_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_devotional_reads_user_id ON devotional_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_devotional_reads_devotional_id ON devotional_reads(devotional_id);
