-- Fix 1: Remove overly permissive UPDATE policy on user_roles (prevents self-escalation)
DROP POLICY IF EXISTS "Users can update own role" ON public.user_roles;

-- Fix 2: Replace permissive youtube_exercises SELECT policy with service-role-only
DROP POLICY IF EXISTS "YouTube exercises are viewable by everyone" ON public.youtube_exercises;

CREATE POLICY "Service role full access on youtube_exercises"
  ON public.youtube_exercises FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role');
