-- Fix 1: Privilege escalation - remove ability for users to update their own role
DROP POLICY IF EXISTS "Users can update own role" ON public.user_roles;

-- Fix 2: Realtime channel authorization - restrict who can subscribe to which Realtime topics
-- Only allow authenticated users to subscribe to topics matching their own user id (used as topic for teacher notifications).
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to receive broadcasts only on topics that begin with their own UID.
-- This covers channels like "teacher_notifications_realtime" filtered server-side by teacher_id,
-- but also enforces that any future per-user topic must be prefixed with the user's UID.
DROP POLICY IF EXISTS "Authenticated can read own realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated can read own realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow postgres_changes events (filtered server-side by RLS on the underlying table)
  extension = 'postgres_changes'
  -- Or broadcast/presence topics that are scoped to the user's own UID
  OR topic LIKE (auth.uid()::text || ':%')
  OR topic = auth.uid()::text
);