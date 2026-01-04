-- Create table for tracking exercise progress (resume functionality)
CREATE TABLE public.youtube_exercise_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.youtube_videos(id) ON DELETE CASCADE,
  difficulty TEXT NOT NULL,
  current_question_index INTEGER DEFAULT 0,
  answers JSONB DEFAULT '[]'::jsonb,
  total_questions INTEGER DEFAULT 20,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint
ALTER TABLE public.youtube_exercise_progress 
ADD CONSTRAINT youtube_exercise_progress_unique UNIQUE(user_id, video_id, difficulty);

-- Enable RLS
ALTER TABLE public.youtube_exercise_progress ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own exercise progress"
ON public.youtube_exercise_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exercise progress"
ON public.youtube_exercise_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise progress"
ON public.youtube_exercise_progress FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercise progress"
ON public.youtube_exercise_progress FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_youtube_exercise_progress_updated_at
BEFORE UPDATE ON public.youtube_exercise_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Fix the Italian video that was incorrectly labeled as Portuguese
UPDATE public.youtube_videos 
SET language = 'italian' 
WHERE video_id = 'Zcb_TwWbAEk';