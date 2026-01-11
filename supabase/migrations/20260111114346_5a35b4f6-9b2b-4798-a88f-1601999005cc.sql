-- Add RLS policies for exercises table
-- Exercises should be readable by everyone (for learning content)
-- and only writable by service role (from edge functions)

-- Policy for public read access to exercises
CREATE POLICY "Exercises are viewable by everyone" 
ON public.exercises 
FOR SELECT 
USING (true);

-- Note: INSERT/UPDATE/DELETE will be handled by service_role from edge functions
-- No explicit policies needed as service_role bypasses RLS