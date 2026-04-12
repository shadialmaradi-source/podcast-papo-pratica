ALTER TABLE public.teacher_profiles
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE TABLE IF NOT EXISTS public.account_deletion_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  notes text
);

ALTER TABLE public.account_deletion_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage account deletion queue" ON public.account_deletion_queue;

CREATE POLICY "Service role can manage account deletion queue"
ON public.account_deletion_queue
FOR ALL
USING ((auth.jwt() ->> 'role') = 'service_role')
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
