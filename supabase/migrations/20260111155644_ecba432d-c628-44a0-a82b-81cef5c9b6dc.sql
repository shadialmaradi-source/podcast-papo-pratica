-- Drop permissive SELECT policies that expose exercise answers
DROP POLICY IF EXISTS "Exercises are viewable by everyone" ON public.exercises;
DROP POLICY IF EXISTS "Allow authenticated users to read youtube exercises" ON public.youtube_exercises;
DROP POLICY IF EXISTS "Allow anon to read youtube exercises" ON public.youtube_exercises;

-- Add comment explaining the security model
COMMENT ON TABLE public.exercises IS 'Exercise questions and answers. Direct SELECT is disabled. Use get_episode_exercises() RPC to fetch questions without answers, and check_exercise_answer() to validate answers server-side.';

COMMENT ON TABLE public.youtube_exercises IS 'YouTube exercise questions and answers. Direct SELECT is disabled. Use get_youtube_exercise_questions() RPC to fetch questions without answers, and check_youtube_exercise_answer() to validate answers server-side.';