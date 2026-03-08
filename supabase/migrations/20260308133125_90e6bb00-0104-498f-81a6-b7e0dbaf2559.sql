
-- 1. Sync streak data from user_streak_data to profiles
UPDATE profiles p
SET 
  current_streak = COALESCE(usd.current_streak, 0),
  longest_streak = COALESCE(usd.longest_streak, 0)
FROM user_streak_data usd
WHERE p.user_id = usd.user_id;

-- 2. Recalculate total_xp from actual XP sources for all users
UPDATE profiles p
SET total_xp = COALESCE(xp.total, 0)
FROM (
  SELECT user_id, SUM(xp) as total FROM (
    SELECT user_id, COALESCE(SUM(xp_earned), 0) as xp FROM user_exercise_results GROUP BY user_id
    UNION ALL
    SELECT user_id, COALESCE(SUM(xp_earned), 0) as xp FROM user_video_progress GROUP BY user_id
  ) combined
  GROUP BY user_id
) xp
WHERE p.user_id = xp.user_id;
