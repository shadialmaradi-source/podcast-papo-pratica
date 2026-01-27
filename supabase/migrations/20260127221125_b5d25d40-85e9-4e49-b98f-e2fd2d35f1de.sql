-- Create subscriptions table for centralized subscription management
CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'promo')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  promo_code TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_video_uploads table to track personal uploads with duration
CREATE TABLE public.user_video_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES youtube_videos(id) ON DELETE CASCADE NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_uploads_user_date ON public.user_video_uploads(user_id, uploaded_at);

-- Create vocal_exercise_completions table to track usage for free tier limits
CREATE TABLE public.vocal_exercise_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES youtube_videos(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vocal_completions_user_date ON public.vocal_exercise_completions(user_id, completed_at);

-- Create promo_codes table for promotional access
CREATE TABLE public.promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('unlimited', 'duration')),
  duration_months INTEGER,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Enable RLS on all tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_video_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocal_exercise_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Subscriptions RLS policies
CREATE POLICY "Users can view own subscription" 
  ON public.subscriptions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions" 
  ON public.subscriptions FOR ALL 
  USING ((auth.jwt() ->> 'role') = 'service_role');

-- User video uploads RLS policies
CREATE POLICY "Users can view own uploads" 
  ON public.user_video_uploads FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage uploads" 
  ON public.user_video_uploads FOR ALL 
  USING ((auth.jwt() ->> 'role') = 'service_role');

-- Vocal exercise completions RLS policies
CREATE POLICY "Users can view own vocal completions" 
  ON public.vocal_exercise_completions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vocal completions" 
  ON public.vocal_exercise_completions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage vocal completions" 
  ON public.vocal_exercise_completions FOR ALL 
  USING ((auth.jwt() ->> 'role') = 'service_role');

-- Promo codes RLS policies (read for validation, service role for management)
CREATE POLICY "Anyone can read active promo codes" 
  ON public.promo_codes FOR SELECT 
  USING (active = true);

CREATE POLICY "Service role can manage promo codes" 
  ON public.promo_codes FOR ALL 
  USING ((auth.jwt() ->> 'role') = 'service_role');

-- Create trigger for updated_at on subscriptions
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();