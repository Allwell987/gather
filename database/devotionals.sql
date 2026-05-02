-- Create devotionals table
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

-- Enable RLS
ALTER TABLE public.devotionals ENABLE ROW LEVEL SECURITY;

-- Allow public read-only access
CREATE POLICY "Allow public read-only access to devotionals"
  ON public.devotionals FOR SELECT
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_devotionals_publish_date ON devotionals(publish_date);
