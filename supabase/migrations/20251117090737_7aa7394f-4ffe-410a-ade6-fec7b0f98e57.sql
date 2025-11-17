-- Fix notification policies to restrict to service role only

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can update notification status" ON public.notifications;

-- Create restrictive policy for inserts (service role only)
CREATE POLICY "Only service role can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role'
);

-- Create policy for updates (service role or owner can update)
CREATE POLICY "Service role and owner can update notifications"
ON public.notifications
FOR UPDATE
USING (
  auth.jwt() ->> 'role' = 'service_role'
  OR auth.uid() = user_id
);