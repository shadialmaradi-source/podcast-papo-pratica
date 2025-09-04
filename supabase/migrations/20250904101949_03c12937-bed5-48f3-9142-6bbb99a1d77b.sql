-- Update existing difficulty levels from CEFR to new system
UPDATE public.exercises 
SET difficulty = CASE 
  WHEN difficulty IN ('A1', 'A2') THEN 'beginner'
  WHEN difficulty IN ('B1', 'B2') THEN 'intermediate' 
  WHEN difficulty IN ('C1', 'C2') THEN 'advanced'
  ELSE 'beginner'
END;

-- Add intensity column to exercises table
ALTER TABLE public.exercises ADD COLUMN intensity text DEFAULT 'light';

-- Update existing exercises to have both light and intense versions
-- For now, mark existing exercises as 'light' and we'll create 'intense' versions later
UPDATE public.exercises SET intensity = 'light';

-- Create function to get episode exercises (without exposing correct answers)
CREATE OR REPLACE FUNCTION public.get_episode_exercises(episode_id_param uuid, difficulty_param text DEFAULT NULL, intensity_param text DEFAULT NULL)
RETURNS TABLE(
  id uuid, 
  episode_id uuid, 
  question text, 
  exercise_type text, 
  options jsonb, 
  difficulty text, 
  intensity text,
  xp_reward integer, 
  order_index integer
) 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
    e.order_index
  FROM public.exercises e
  WHERE e.episode_id = episode_id_param
    AND (difficulty_param IS NULL OR e.difficulty = difficulty_param)
    AND (intensity_param IS NULL OR e.intensity = intensity_param)
  ORDER BY e.order_index;
END;
$$;

-- Update the check_exercise_answer function to include intensity
DROP FUNCTION IF EXISTS public.check_exercise_answer(uuid, text);
CREATE OR REPLACE FUNCTION public.check_exercise_answer(exercise_id_param uuid, user_answer_param text)
RETURNS TABLE(is_correct boolean, correct_answer text, explanation text, xp_reward integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (e.correct_answer = user_answer_param) as is_correct,
    e.correct_answer,
    e.explanation,
    e.xp_reward
  FROM public.exercises e
  WHERE e.id = exercise_id_param;
END;
$$;