-- Fix exercise answer exposure by removing permissive SELECT policies
-- Drop existing policies that expose answers
DROP POLICY IF EXISTS "Users can view exercise questions only" ON public.exercises;
DROP POLICY IF EXISTS "Users can view exercise questions without answers" ON public.exercises;
DROP POLICY IF EXISTS "YouTube exercises are viewable by everyone" ON public.youtube_exercises;

-- Exercises table: No direct SELECT access
-- Clients must use check_exercise_answer() function to validate answers
-- The function is already SECURITY DEFINER and only returns validation results

-- YouTube exercises table: No direct SELECT access  
-- Clients must use a similar validation function

-- Create a secure function to get exercise questions WITHOUT answers
CREATE OR REPLACE FUNCTION public.get_exercise_questions(exercise_ids uuid[])
RETURNS TABLE(
  id uuid,
  episode_id uuid,
  question text,
  exercise_type text,
  options jsonb,
  difficulty text,
  intensity text,
  xp_reward integer,
  order_index integer,
  context_sentence text,
  vocabulary_words jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.episode_id,
    e.question,
    e.exercise_type,
    e.options,
    e.difficulty,
    e.intensity,
    e.xp_reward,
    e.order_index,
    e.context_sentence,
    e.vocabulary_words
  FROM public.exercises e
  WHERE e.id = ANY(exercise_ids);
  -- Note: correct_answer and explanation are intentionally excluded
END;
$$;

-- Create a secure function to get YouTube exercise questions WITHOUT answers
CREATE OR REPLACE FUNCTION public.get_youtube_exercise_questions(video_id_param uuid)
RETURNS TABLE(
  id uuid,
  video_id uuid,
  question text,
  exercise_type text,
  options jsonb,
  difficulty text,
  intensity text,
  xp_reward integer,
  order_index integer,
  context_sentence text,
  vocabulary_words jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    e.vocabulary_words
  FROM public.youtube_exercises e
  WHERE e.video_id = video_id_param
  ORDER BY e.order_index;
  -- Note: correct_answer and explanation are intentionally excluded
END;
$$;

-- Create function to check YouTube exercise answers (similar to check_exercise_answer)
CREATE OR REPLACE FUNCTION public.check_youtube_exercise_answer(
  exercise_id_param uuid,
  user_answer_param text
)
RETURNS TABLE(
  is_correct boolean,
  correct_answer text,
  explanation text,
  xp_reward integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  exercise_rec RECORD;
  user_answer_json jsonb;
  correct_answer_json jsonb;
  is_answer_correct boolean := false;
  i integer;
  match_count integer := 0;
  total_pairs integer := 0;
BEGIN
  -- Get exercise details
  SELECT e.exercise_type, e.correct_answer, e.explanation, e.xp_reward, e.options
  INTO exercise_rec
  FROM public.youtube_exercises e
  WHERE e.id = exercise_id_param;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, ''::text, 'Exercise not found'::text, 0;
    RETURN;
  END IF;
  
  -- Check answer based on exercise type (same logic as check_exercise_answer)
  CASE exercise_rec.exercise_type
    WHEN 'multiple_choice' THEN
      is_answer_correct := (exercise_rec.correct_answer = user_answer_param);
      
    WHEN 'true_false' THEN
      is_answer_correct := (exercise_rec.correct_answer = user_answer_param);
      
    WHEN 'gap_fill' THEN
      is_answer_correct := (exercise_rec.correct_answer = user_answer_param);
      
    WHEN 'matching' THEN
      BEGIN
        user_answer_json := user_answer_param::jsonb;
        correct_answer_json := exercise_rec.correct_answer::jsonb;
        
        SELECT jsonb_array_length(correct_answer_json) INTO total_pairs;
        
        FOR i IN 0..(total_pairs - 1) LOOP
          IF (user_answer_json->i) = (correct_answer_json->i) THEN
            match_count := match_count + 1;
          END IF;
        END LOOP;
        
        is_answer_correct := (match_count = total_pairs);
      EXCEPTION WHEN OTHERS THEN
        is_answer_correct := false;
      END;
      
    WHEN 'sequencing' THEN
      BEGIN
        user_answer_json := user_answer_param::jsonb;
        correct_answer_json := exercise_rec.correct_answer::jsonb;
        is_answer_correct := (user_answer_json = correct_answer_json);
      EXCEPTION WHEN OTHERS THEN
        is_answer_correct := false;
      END;
      
    ELSE
      is_answer_correct := (exercise_rec.correct_answer = user_answer_param);
  END CASE;
  
  RETURN QUERY 
  SELECT 
    is_answer_correct,
    exercise_rec.correct_answer,
    exercise_rec.explanation,
    exercise_rec.xp_reward;
END;
$$;