-- Create a secure function that returns exercise questions with answers for authenticated users
-- This is needed because the frontend requires answers for the exercise flow
CREATE OR REPLACE FUNCTION public.get_youtube_exercises_with_answers(
  video_id_param UUID,
  difficulty_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  video_id UUID,
  question TEXT,
  exercise_type TEXT,
  options JSONB,
  difficulty TEXT,
  intensity TEXT,
  xp_reward INTEGER,
  order_index INTEGER,
  context_sentence TEXT,
  vocabulary_words JSONB,
  correct_answer TEXT,
  explanation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only authenticated users can access exercises with answers
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT 
    e.id,
    e.video_id,
    e.question,
    e.exercise_type,
    e.options,
    e.difficulty,
    e.intensity,
    e.xp_reward,
    e.order_index,
    e.context_sentence,
    e.vocabulary_words,
    e.correct_answer,
    e.explanation
  FROM public.youtube_exercises e
  WHERE e.video_id = video_id_param
    AND (difficulty_param IS NULL OR e.difficulty = difficulty_param)
  ORDER BY e.order_index;
END;
$$;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION public.get_youtube_exercises_with_answers(UUID, TEXT) TO authenticated;

-- Add comment explaining the security model
COMMENT ON FUNCTION public.get_youtube_exercises_with_answers IS 'Returns exercise questions with answers for authenticated users. Answers are needed for the client-side exercise flow.';
