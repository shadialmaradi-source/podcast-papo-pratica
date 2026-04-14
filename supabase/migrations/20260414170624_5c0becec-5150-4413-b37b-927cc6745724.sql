CREATE TABLE public.landing_feedback_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  email TEXT,
  category TEXT NOT NULL DEFAULT 'feedback',
  message TEXT NOT NULL,
  source_page TEXT,
  user_agent TEXT,
  submitted_at_client TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_feedback_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert feedback"
  ON public.landing_feedback_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);