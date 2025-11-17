-- Remove email from profiles table and update related functions

-- Drop email column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Update handle_new_user function to not include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    username,
    display_name,
    full_name,
    avatar_url
  )
  VALUES (
    NEW.id, 
    generate_random_username(),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name', 
      NEW.raw_user_meta_data->>'display_name', 
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Update get_users_needing_daily_reminders to get email from auth.users
CREATE OR REPLACE FUNCTION public.get_users_needing_daily_reminders()
RETURNS TABLE(user_id uuid, email text, current_streak integer, last_activity_date date, email_enabled boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    au.email,
    COALESCE(usd.current_streak, 0) as current_streak,
    usd.last_activity_date,
    COALESCE(unp.email_daily_reminders, true) as email_enabled
  FROM profiles p
  INNER JOIN auth.users au ON p.user_id = au.id
  LEFT JOIN user_streak_data usd ON p.user_id = usd.user_id
  LEFT JOIN user_notification_preferences unp ON p.user_id = unp.user_id
  WHERE au.email IS NOT NULL
    AND (
      usd.last_activity_date IS NULL 
      OR usd.last_activity_date < CURRENT_DATE
    )
    AND COALESCE(unp.email_daily_reminders, true) = true;
END;
$$;

-- Update get_leaderboard_position_alerts to get email from auth.users
CREATE OR REPLACE FUNCTION public.get_leaderboard_position_alerts()
RETURNS TABLE(user_id uuid, email text, current_rank integer, current_xp integer, target_user_email text, target_rank integer, target_xp integer, xp_gap integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_users AS (
    SELECT 
      p.user_id,
      au.email,
      p.total_xp,
      ROW_NUMBER() OVER (ORDER BY p.total_xp DESC) as rank
    FROM profiles p
    INNER JOIN auth.users au ON p.user_id = au.id
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