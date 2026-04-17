-- Additional conservative backfill for legacy students who customized onboarding
-- fields but still have native_language NULL.
UPDATE public.profiles
SET native_language = 'en'
WHERE native_language IS NULL
  AND (
    selected_language IS NOT NULL
    AND selected_language <> 'portuguese'
    OR current_level IS NOT NULL
    AND current_level <> 'A1'
  );
