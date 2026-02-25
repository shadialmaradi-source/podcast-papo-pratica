

# Fix: "permission denied for table users"

## Root Cause

The RLS policies on `teacher_lessons` and `lesson_exercises` contain direct subqueries against `auth.users`:

```sql
student_email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid())
```

The `authenticated` Postgres role does not have SELECT permission on `auth.users`. When the teacher inserts a lesson and the `.select("id")` triggers a SELECT evaluation, Postgres tries to evaluate ALL SELECT policies — including the student one that queries `auth.users` — and fails with "permission denied for table users".

## Fix

1. **Create a `SECURITY DEFINER` function** `get_auth_user_email()` that safely returns the current user's email. Since it runs as the function owner (who has access to `auth.users`), it bypasses the permission issue.

2. **Update 3 RLS policies** that reference `auth.users` to use the new function instead:
   - `teacher_lessons` → "Students can view assigned lessons"
   - `lesson_exercises` → "Students can view assigned lesson exercises"
   - `lesson_responses` → "Teachers can read responses for own lessons" (this one references `teacher_lessons` which itself triggers the student policy)

### Migration SQL

```sql
-- 1. Helper function
CREATE OR REPLACE FUNCTION public.get_auth_user_email()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text FROM auth.users WHERE id = auth.uid()
$$;

-- 2. Drop and recreate affected policies
DROP POLICY IF EXISTS "Students can view assigned lessons" ON public.teacher_lessons;
CREATE POLICY "Students can view assigned lessons"
  ON public.teacher_lessons FOR SELECT
  USING (student_email = public.get_auth_user_email());

DROP POLICY IF EXISTS "Students can view assigned lesson exercises" ON public.lesson_exercises;
CREATE POLICY "Students can view assigned lesson exercises"
  ON public.lesson_exercises FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM teacher_lessons tl
    WHERE tl.id = lesson_exercises.lesson_id
      AND tl.student_email = public.get_auth_user_email()
  ));
```

No frontend code changes needed — this is purely a database permissions fix.

