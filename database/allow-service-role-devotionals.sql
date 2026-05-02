-- Allow service role (Edge Function) to insert into devotionals
CREATE POLICY "Allow service role insert" ON public.devotionals
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Allow service role to update devotionals (for upsert)
CREATE POLICY "Allow service role update" ON public.devotionals
  FOR UPDATE USING (auth.role() = 'service_role');
