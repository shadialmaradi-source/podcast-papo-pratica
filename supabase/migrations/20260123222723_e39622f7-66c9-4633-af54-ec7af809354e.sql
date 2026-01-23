-- Create table to track anonymous speech analysis attempts
CREATE TABLE public.anonymous_speech_attempts (
  session_id TEXT PRIMARY KEY,
  attempt_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (no policies needed - only accessed by edge function with service role)
ALTER TABLE public.anonymous_speech_attempts ENABLE ROW LEVEL SECURITY;

-- Add index for cleanup queries
CREATE INDEX idx_anonymous_speech_updated_at ON public.anonymous_speech_attempts(updated_at);

-- Comment for documentation
COMMENT ON TABLE public.anonymous_speech_attempts IS 'Tracks anonymous user speech analysis attempts for rate limiting during onboarding. Sessions expire after 7 days.';