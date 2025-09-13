-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily_reminder', 'weekly_recap', 'leaderboard_alert')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  data JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update notification status" 
ON public.notifications 
FOR UPDATE 
USING (true);

-- Create notification preferences table
CREATE TABLE public.user_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email_daily_reminders BOOLEAN NOT NULL DEFAULT true,
  email_weekly_recaps BOOLEAN NOT NULL DEFAULT true,
  email_leaderboard_alerts BOOLEAN NOT NULL DEFAULT true,
  in_app_notifications BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own preferences" 
ON public.user_notification_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" 
ON public.user_notification_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON public.user_notification_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_notification_preferences_updated_at
BEFORE UPDATE ON public.user_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get users needing daily reminders
CREATE OR REPLACE FUNCTION public.get_users_needing_daily_reminders()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  current_streak INTEGER,
  last_activity_date DATE,
  email_enabled BOOLEAN
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.email,
    COALESCE(usd.current_streak, 0) as current_streak,
    usd.last_activity_date,
    COALESCE(unp.email_daily_reminders, true) as email_enabled
  FROM profiles p
  LEFT JOIN user_streak_data usd ON p.user_id = usd.user_id
  LEFT JOIN user_notification_preferences unp ON p.user_id = unp.user_id
  WHERE p.email IS NOT NULL
    AND (
      usd.last_activity_date IS NULL 
      OR usd.last_activity_date < CURRENT_DATE
    )
    AND COALESCE(unp.email_daily_reminders, true) = true;
END;
$$;

-- Create function to get weekly recap data
CREATE OR REPLACE FUNCTION public.get_weekly_recap_data(user_id_param UUID)
RETURNS TABLE(
  total_xp INTEGER,
  episodes_completed INTEGER,
  new_badges INTEGER,
  exercises_completed INTEGER,
  streak_days INTEGER
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  week_start DATE := CURRENT_DATE - INTERVAL '7 days';
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(uer.xp_earned), 0)::INTEGER as total_xp,
    COUNT(DISTINCT uep.episode_id)::INTEGER as episodes_completed,
    COUNT(DISTINCT ub.id)::INTEGER as new_badges,
    COUNT(uer.id)::INTEGER as exercises_completed,
    COALESCE(MAX(usd.current_streak), 0)::INTEGER as streak_days
  FROM profiles p
  LEFT JOIN user_exercise_results uer ON p.user_id = uer.user_id 
    AND uer.completed_at >= week_start
  LEFT JOIN user_episode_progress uep ON p.user_id = uep.user_id 
    AND uep.completed_at >= week_start 
    AND uep.is_completed = true
  LEFT JOIN user_badges ub ON p.user_id = ub.user_id 
    AND ub.earned_at >= week_start
  LEFT JOIN user_streak_data usd ON p.user_id = usd.user_id
  WHERE p.user_id = user_id_param
  GROUP BY p.user_id;
END;
$$;

-- Create function to get leaderboard position alerts
CREATE OR REPLACE FUNCTION public.get_leaderboard_position_alerts()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  current_rank INTEGER,
  current_xp INTEGER,
  target_user_email TEXT,
  target_rank INTEGER,
  target_xp INTEGER,
  xp_gap INTEGER
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_users AS (
    SELECT 
      p.user_id,
      p.email,
      p.total_xp,
      ROW_NUMBER() OVER (ORDER BY p.total_xp DESC) as rank
    FROM profiles p
    WHERE p.total_xp > 0
  ),
  position_gaps AS (
    SELECT 
      ru1.user_id,
      ru1.email,
      ru1.rank as current_rank,
      ru1.total_xp as current_xp,
      ru2.email as target_user_email,
      ru2.rank as target_rank,
      ru2.total_xp as target_xp,
      (ru2.total_xp - ru1.total_xp) as xp_gap
    FROM ranked_users ru1
    JOIN ranked_users ru2 ON ru2.rank = ru1.rank - 1
    WHERE (ru2.total_xp - ru1.total_xp) <= 50
      AND ru1.rank > 1
  )
  SELECT 
    pg.user_id,
    pg.email,
    pg.current_rank,
    pg.current_xp,
    pg.target_user_email,
    pg.target_rank,
    pg.target_xp,
    pg.xp_gap
  FROM position_gaps pg
  LEFT JOIN user_notification_preferences unp ON pg.user_id = unp.user_id
  WHERE COALESCE(unp.email_leaderboard_alerts, true) = true;
END;
$$;