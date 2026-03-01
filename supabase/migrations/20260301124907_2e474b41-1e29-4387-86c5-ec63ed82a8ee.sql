-- Allow authenticated users to view lessons via share_token
CREATE POLICY "Anyone authenticated can view lessons by share_token"
ON public.teacher_lessons
FOR SELECT
USING (
  share_token IS NOT NULL 
  AND auth.uid() IS NOT NULL
);