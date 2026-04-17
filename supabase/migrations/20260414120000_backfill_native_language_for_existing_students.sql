-- Backfill native_language only for clearly non-new student accounts.
-- We intentionally use conservative evidence (existing learning progress) to avoid
-- forcing incorrect language on truly new users.
UPDATE public.profiles
SET native_language = 'en'
WHERE native_language IS NULL
  AND (
    COALESCE(total_xp, 0) > 0
    OR COALESCE(current_streak, 0) > 0
    OR COALESCE(longest_streak, 0) > 0
  );
