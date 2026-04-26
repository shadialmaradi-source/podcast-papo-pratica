ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_hints_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS library_tour_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transcript_tutorial_completed boolean NOT NULL DEFAULT false;

-- Backfill: any student with progress evidence has already used the app and should not see onboarding again
UPDATE public.profiles
SET home_hints_completed = true,
    library_tour_completed = true,
    transcript_tutorial_completed = true
WHERE COALESCE(total_xp, 0) > 0
   OR COALESCE(current_streak, 0) > 0
   OR COALESCE(longest_streak, 0) > 0
   OR last_login_date IS NOT NULL;