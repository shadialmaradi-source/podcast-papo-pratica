-- Allow all users to read youtube exercises (public content)
CREATE POLICY "Allow authenticated users to read youtube exercises"
ON public.youtube_exercises
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow anon to read youtube exercises"
ON public.youtube_exercises
FOR SELECT
TO anon
USING (true);