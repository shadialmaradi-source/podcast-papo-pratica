-- Remove hearts column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS hearts;

-- Add completion tracking functions
CREATE OR REPLACE FUNCTION public.get_next_episode(current_episode_id uuid, language_param text)
RETURNS TABLE(
  next_episode_id uuid,
  next_episode_title text,
  alternative_episode_id uuid, 
  alternative_episode_title text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_episode_number integer;
  next_episode_rec RECORD;
  alt_episode_rec RECORD;
BEGIN
  -- Get current episode number and source
  SELECT pe.episode_number, ps.language INTO current_episode_number, language_param
  FROM podcast_episodes pe
  JOIN podcast_sources ps ON pe.podcast_source_id = ps.id
  WHERE pe.id = current_episode_id;
  
  -- Get next sequential episode
  SELECT pe.id, pe.title INTO next_episode_rec
  FROM podcast_episodes pe
  JOIN podcast_sources ps ON pe.podcast_source_id = ps.id
  WHERE ps.language = language_param 
    AND pe.episode_number > current_episode_number
  ORDER BY pe.episode_number ASC
  LIMIT 1;
  
  -- Get random alternative episode from same language
  SELECT pe.id, pe.title INTO alt_episode_rec
  FROM podcast_episodes pe
  JOIN podcast_sources ps ON pe.podcast_source_id = ps.id
  WHERE ps.language = language_param 
    AND pe.id != current_episode_id
    AND (next_episode_rec.id IS NULL OR pe.id != next_episode_rec.id)
  ORDER BY RANDOM()
  LIMIT 1;
  
  RETURN QUERY SELECT 
    next_episode_rec.id,
    next_episode_rec.title,
    alt_episode_rec.id,
    alt_episode_rec.title;
END;
$$;