-- Backfill native_language only for likely returning students.
-- Conservative criteria: keep genuinely new/empty accounts untouched.
UPDATE public.profiles
SET native_language = 'en'
WHERE native_language IS NULL
  AND selected_language IS NOT NULL
  AND (
    COALESCE(total_xp, 0) > 0
    OR COALESCE(current_streak, 0) > 0
    OR COALESCE(longest_streak, 0) > 0
    OR last_login_date IS NOT NULL
    OR (current_level IS NOT NULL AND current_level <> 'A1')
    OR selected_language <> 'portuguese'
  );
