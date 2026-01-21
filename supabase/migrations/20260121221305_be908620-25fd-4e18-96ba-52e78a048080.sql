-- Remove permissive SELECT policies from exercises table that expose correct answers
DROP POLICY IF EXISTS "Exercises are viewable by everyone" ON public.exercises;
DROP POLICY IF EXISTS "Anyone can view exercises" ON public.exercises;

-- Remove permissive SELECT policies from youtube_exercises table
DROP POLICY IF EXISTS "Allow authenticated users to read youtube exercises" ON public.youtube_exercises;
DROP POLICY IF EXISTS "Allow anon to read youtube exercises" ON public.youtube_exercises;
DROP POLICY IF EXISTS "Anyone can view youtube exercises" ON public.youtube_exercises;

-- NOTE: No SELECT policies are needed since:
-- 1. The application uses secure functions: get_episode_exercises(), get_youtube_exercise_questions()
-- 2. These functions intentionally exclude correct_answer and explanation fields
-- 3. Answer validation uses: check_exercise_answer(), check_youtube_exercise_answer()
-- 4. Edge functions with service role can still INSERT exercises