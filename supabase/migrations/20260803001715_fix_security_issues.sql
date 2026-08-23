-- Fix 1: Replace deprecated auth.role() with TO clause on devotionals policies
DROP POLICY IF EXISTS "Allow service role insert" ON "public"."devotionals";
CREATE POLICY "Allow service role insert" ON "public"."devotionals"
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service role update" ON "public"."devotionals";
CREATE POLICY "Allow service role update" ON "public"."devotionals"
  FOR UPDATE TO service_role USING (true);

-- Fix 2: Prevent users from escalating their own role via profile update.
-- The users_can_update_own_profile policy allows full-row updates, which includes
-- the role column. A trigger silently reverts any self-initiated role change.
CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- If a user is updating their own profile and changing the role column, revert it.
  -- Admins updating OTHER users' profiles (auth.uid() != NEW.id) are unaffected.
  IF auth.uid() = NEW.id AND OLD.role IS DISTINCT FROM NEW.role THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_no_self_role_change ON public.profiles;
CREATE TRIGGER enforce_no_self_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_change();
