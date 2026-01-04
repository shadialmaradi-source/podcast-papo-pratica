-- Add YouTube subscription fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS youtube_credits_used integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS youtube_credits_reset_at timestamp with time zone DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free';