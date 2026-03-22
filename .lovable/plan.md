

# Teacher Assignment / Invite Identity Reliability Patch — 2 Changes

## Problem
When a student opens a shared lesson link and authenticates, the `teacher_lessons.student_email` may not match the authenticated email (e.g., teacher typed a different email). The `teacher_students` roster also drifts. There is no identity-binding step at lesson load time.

## Changes

### 1. New DB function: `bind_lesson_identity_by_share_token`
Create via migration:

```sql
CREATE OR REPLACE FUNCTION public.bind_lesson_identity_by_share_token(p_share_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lesson RECORD;
  v_email TEXT;
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_email := (SELECT email FROM auth.users WHERE id = auth.uid());
  IF v_email IS NULL THEN RETURN; END IF;

  -- Find lesson by share_token
  SELECT id, teacher_id, student_email
  INTO v_lesson
  FROM public.teacher_lessons
  WHERE share_token = p_share_token
  LIMIT 1;

  IF NOT FOUND THEN RETURN; END IF;

  -- Bind student_email to authenticated email
  UPDATE public.teacher_lessons
  SET student_email = lower(trim(v_email)),
      updated_at = now()
  WHERE id = v_lesson.id;

  -- Upsert teacher_students
  INSERT INTO public.teacher_students (teacher_id, student_email, status, last_active)
  VALUES (v_lesson.teacher_id, lower(trim(v_email)), 'active', now())
  ON CONFLICT (teacher_id, student_email)
  DO UPDATE SET status = 'active', last_active = now();
END;
$$;
```

### 2. `src/pages/StudentLesson.tsx`
At the top of `loadData` (after the `if (!id || !user) return;` guard), call the bind function when the route param looks like a share token:

```typescript
// Before lesson fetch, bind identity if accessing via share token
try {
  await supabase.rpc("bind_lesson_identity_by_share_token", {
    p_share_token: id
  });
} catch (_) {
  // Non-critical — continue loading
}
```

This is inserted at line ~275, before the `isUuid` check and lesson query. The RPC is fire-and-forget-ish: if the token doesn't match a lesson, the function simply returns. The lesson fetch proceeds normally after.

## Summary

| Change | Detail |
|--------|--------|
| Migration | New `bind_lesson_identity_by_share_token` SECURITY DEFINER function |
| `src/pages/StudentLesson.tsx` | Call RPC at start of `loadData` |

2 changes, ~30 lines. No architectural redesign.

