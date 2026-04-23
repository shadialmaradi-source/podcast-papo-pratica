-- Security hardening based on scan findings.

-- 1) promo_codes: restrict SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can read active promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Authenticated users can read active promo codes" ON public.promo_codes;

CREATE POLICY "Authenticated users can read active promo codes"
  ON public.promo_codes
  FOR SELECT
  TO authenticated
  USING (active = true);

-- 2) user_roles: drop any INSERT policy so users cannot self-assign roles
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT polname
    FROM pg_policy
    WHERE polrelid = 'public.user_roles'::regclass
      AND polcmd = 'a'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', pol.polname);
  END LOOP;
END $$;

-- 3) youtube_exercises: add explicit authenticated SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read youtube exercises" ON public.youtube_exercises;

CREATE POLICY "Authenticated users can read youtube exercises"
  ON public.youtube_exercises
  FOR SELECT
  TO authenticated
  USING (true);