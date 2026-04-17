-- Admin/pastor verification review policies
-- Run this in Supabase SQL editor for existing projects.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_can_update_profiles" ON public.profiles;
CREATE POLICY "admins_can_update_profiles" ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles reviewer
      WHERE reviewer.id = auth.uid()
      AND reviewer.role IN ('admin', 'pastor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles reviewer
      WHERE reviewer.id = auth.uid()
      AND reviewer.role IN ('admin', 'pastor')
    )
  );

DROP POLICY IF EXISTS "admins_can_view_all_verification_requests" ON public.verification_requests;
CREATE POLICY "admins_can_view_all_verification_requests" ON public.verification_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles reviewer
      WHERE reviewer.id = auth.uid()
      AND reviewer.role IN ('admin', 'pastor')
    )
  );

DROP POLICY IF EXISTS "admins_can_update_verification_requests" ON public.verification_requests;
CREATE POLICY "admins_can_update_verification_requests" ON public.verification_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles reviewer
      WHERE reviewer.id = auth.uid()
      AND reviewer.role IN ('admin', 'pastor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles reviewer
      WHERE reviewer.id = auth.uid()
      AND reviewer.role IN ('admin', 'pastor')
    )
  );

DROP POLICY IF EXISTS "Admins can view all verification certificates" ON storage.objects;
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
