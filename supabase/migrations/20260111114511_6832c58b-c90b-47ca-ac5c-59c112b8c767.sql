-- Fix 1: Add search_path to generate_random_username function
CREATE OR REPLACE FUNCTION public.generate_random_username()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
DECLARE
  adjectives TEXT[] := ARRAY[
    'Swift', 'Bright', 'Quick', 'Smart', 'Clever', 'Wise', 'Bold', 
    'Brave', 'Cool', 'Happy', 'Lucky', 'Mighty', 'Noble', 'Royal',
    'Stellar', 'Cosmic', 'Epic', 'Super', 'Ultra', 'Mega'
  ];
  nouns TEXT[] := ARRAY[
    'Learner', 'Scholar', 'Student', 'Explorer', 'Pioneer', 'Champion',
    'Master', 'Expert', 'Wizard', 'Ninja', 'Dragon', 'Phoenix', 'Tiger',
    'Eagle', 'Wolf', 'Lion', 'Panda', 'Fox', 'Bear', 'Owl'
  ];
  random_username TEXT;
  username_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random username: Adjective + Noun + 3-digit number
    random_username := adjectives[1 + floor(random() * array_length(adjectives, 1))] ||
                      nouns[1 + floor(random() * array_length(nouns, 1))] ||
                      lpad(floor(random() * 1000)::TEXT, 3, '0');
    
    -- Check if username exists
    SELECT EXISTS(
      SELECT 1 FROM public.profiles WHERE username = random_username
    ) INTO username_exists;
    
    -- Exit loop if username is unique
    EXIT WHEN NOT username_exists;
  END LOOP;
  
  RETURN random_username;
END;
$function$;

-- Fix 2: Replace overly permissive INSERT policy on security_audit_log
-- The current policy uses WITH CHECK (true) which allows anyone to insert
-- Instead, restrict to service_role only (used by edge functions for audit logging)
DROP POLICY IF EXISTS "System can insert audit logs" ON public.security_audit_log;

CREATE POLICY "Only service role can insert audit logs" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);