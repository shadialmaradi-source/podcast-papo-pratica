CREATE TABLE IF NOT EXISTS public.landing_feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT,
  email TEXT,
  category TEXT NOT NULL CHECK (category IN ('feedback', 'bug', 'feature_request')),
  message TEXT NOT NULL,
  source_page TEXT,
  user_agent TEXT,
  submitted_at_client TIMESTAMPTZ,
  honeypot TEXT
);

ALTER TABLE public.landing_feedback_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anyone to insert landing feedback"
ON public.landing_feedback_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  category IN ('feedback', 'bug', 'feature_request')
  AND length(trim(message)) > 0
  AND (email IS NULL OR email ~* '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$')
  AND coalesce(honeypot, '') = ''
);
