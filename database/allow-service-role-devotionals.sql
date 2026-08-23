-- Allow service role (Edge Function) to insert into devotionals
CREATE POLICY "Allow service role insert" ON public.devotionals
  FOR INSERT TO service_role WITH CHECK (true);

-- Allow service role to update devotionals (for upsert)
CREATE POLICY "Allow service role update" ON public.devotionals
  FOR UPDATE TO service_role USING (true);
