-- Drop the existing policy that exposes all exercise data
DROP POLICY IF EXISTS "Exercises are viewable by everyone" ON public.exercises;

-- Create a view that excludes correct answers for regular users
CREATE OR REPLACE VIEW public.exercises_public AS 
SELECT 
  id,
  podcast_id,
  question,
  exercise_type,
  options,
  explanation,
  difficulty,
  xp_reward,
  order_index,
  created_at
FROM public.exercises;

-- Grant access to the view
GRANT SELECT ON public.exercises_public TO authenticated;

-- Create RLS policy for the view (even though views don't directly support RLS, 
-- this ensures the underlying table access is controlled)
CREATE POLICY "Users can view exercise questions only" ON public.exercises
  FOR SELECT USING (false); -- Block direct access to exercises table

-- Create a security definer function to check exercise answers
CREATE OR REPLACE FUNCTION public.check_exercise_answer(
  exercise_id_param UUID,
  user_answer_param TEXT
)
RETURNS TABLE(
  is_correct BOOLEAN,
  correct_answer TEXT,
  explanation TEXT,
  xp_reward INTEGER
) AS $$
BEGIN
  -- Only return the correct answer and explanation after the user submits their answer
  RETURN QUERY
  SELECT 
    (e.correct_answer = user_answer_param) as is_correct,
    e.correct_answer,
    e.explanation,
    e.xp_reward
  FROM public.exercises e
  WHERE e.id = exercise_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create a function to get exercises without answers for a podcast
CREATE OR REPLACE FUNCTION public.get_podcast_exercises(podcast_id_param UUID)
RETURNS TABLE(
  id UUID,
  podcast_id UUID,
  question TEXT,
  exercise_type TEXT,
  options JSONB,
  difficulty TEXT,
  xp_reward INTEGER,
  order_index INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.podcast_id,
    e.question,
    e.exercise_type,
    e.options,
    e.difficulty,
    e.xp_reward,
    e.order_index
  FROM public.exercises e
  WHERE e.podcast_id = podcast_id_param
  ORDER BY e.order_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION public.check_exercise_answer(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_podcast_exercises(UUID) TO authenticated;