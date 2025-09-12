-- Create table for daily/weekly challenges
CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('daily', 'weekly')),
  target_type TEXT NOT NULL CHECK (target_type IN ('xp', 'exercises', 'streak', 'episodes')),
  target_value INTEGER NOT NULL,
  bonus_xp INTEGER NOT NULL DEFAULT 0,
  badge_reward TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for user challenge progress
CREATE TABLE public.user_challenge_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id),
  current_progress INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- Create table for user badges/achievements
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id TEXT NOT NULL,
  badge_title TEXT NOT NULL,
  badge_description TEXT NOT NULL,
  badge_icon TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  badge_category TEXT DEFAULT 'general',
  UNIQUE(user_id, badge_id)
);

-- Create table for streak freeze system
CREATE TABLE public.user_streak_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  streak_freezes_available INTEGER NOT NULL DEFAULT 0,
  streak_freezes_used INTEGER NOT NULL DEFAULT 0,
  last_freeze_used_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for activity history
CREATE TABLE public.user_activity_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('exercise_completed', 'episode_started', 'episode_completed', 'challenge_completed', 'badge_earned', 'streak_milestone')),
  activity_data JSONB,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streak_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for challenges (public read)
CREATE POLICY "Challenges are viewable by everyone" 
ON public.challenges 
FOR SELECT 
USING (is_active = true);

-- Create RLS policies for user_challenge_progress
CREATE POLICY "Users can view their own challenge progress" 
ON public.user_challenge_progress 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenge progress" 
ON public.user_challenge_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge progress" 
ON public.user_challenge_progress 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for user_badges
CREATE POLICY "Users can view their own badges" 
ON public.user_badges 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges" 
ON public.user_badges 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for user_streak_data
CREATE POLICY "Users can view their own streak data" 
ON public.user_streak_data 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streak data" 
ON public.user_streak_data 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak data" 
ON public.user_streak_data 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for user_activity_history
CREATE POLICY "Users can view their own activity history" 
ON public.user_activity_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity history" 
ON public.user_activity_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at on user_streak_data
CREATE TRIGGER update_user_streak_data_updated_at
BEFORE UPDATE ON public.user_streak_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample daily challenges
INSERT INTO public.challenges (title, description, challenge_type, target_type, target_value, bonus_xp, start_date, end_date) VALUES
('Daily Practice', 'Complete 2 exercises today', 'daily', 'exercises', 2, 20, CURRENT_DATE, CURRENT_DATE),
('XP Hunter', 'Earn 50 XP today', 'daily', 'xp', 50, 25, CURRENT_DATE, CURRENT_DATE),
('Intense Training', 'Complete 1 intense exercise today', 'daily', 'exercises', 1, 30, CURRENT_DATE, CURRENT_DATE);

-- Insert some sample weekly challenges
INSERT INTO public.challenges (title, description, challenge_type, target_type, target_value, bonus_xp, start_date, end_date) VALUES
('Weekly Warrior', 'Earn 300 XP this week', 'weekly', 'xp', 300, 100, DATE_TRUNC('week', CURRENT_DATE), DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days'),
('Episode Explorer', 'Complete 3 episodes this week', 'weekly', 'episodes', 3, 150, DATE_TRUNC('week', CURRENT_DATE), DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days'),
('Consistency Champion', 'Maintain a 7-day streak', 'weekly', 'streak', 7, 200, DATE_TRUNC('week', CURRENT_DATE), DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days');