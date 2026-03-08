

# Plan: Server-Side Lesson Limit Enforcement

## Current State

We already have client-side quota checking (`teacherQuotaService.ts`, `useTeacherQuota.ts`) that counts lessons from `teacher_lessons` by month and displays a progress bar on the dashboard. However, there's **no server-side enforcement** — a savvy user could bypass the UI and create unlimited lessons.

## Approach: Lean Server-Side Enforcement

Rather than creating a separate `teacher_usage` table (redundant with counting `teacher_lessons`), we add a **validation trigger** on `teacher_lessons` INSERT that checks the count + plan limits directly. This is simpler, has no sync issues, and requires no monthly reset cron.

## Database Changes (1 migration)

**New function: `enforce_teacher_lesson_limit()`**
- SECURITY DEFINER trigger function on BEFORE INSERT on `teacher_lessons`
- Counts lessons created this month by the teacher
- Looks up plan from `teacher_subscriptions` (defaulting to `free`)
- Compares against limits (free=10, pro=60, premium=160)
- Raises exception if limit exceeded: `'Lesson limit reached for your plan. Upgrade at /teacher/pricing'`

**New function: `enforce_video_duration_limit()`**
- Called from the `process-youtube-video` or `extract-youtube-transcript` edge function
- Not a trigger — just a helper check before transcription
- Or: enforce in the edge function code directly (simpler)

## Frontend Changes

### 1. Update `CreateLessonForm.tsx`
- Use the `maxVideoMinutes` prop (already passed from dashboard)
- After YouTube URL is entered, show a note: "Max video length: X min (your plan)"
- If lesson creation fails with "Lesson limit reached" error from Supabase, catch it and show upgrade prompt instead of generic error

### 2. Update `SpeakingLessonCreator.tsx`
- On final "Create" step, catch the limit error and show upgrade prompt

### 3. Add analytics events
- `lesson_limit_reached` when server rejects
- `video_length_exceeded` when client blocks

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Validation trigger on `teacher_lessons` INSERT |
| `src/components/teacher/CreateLessonForm.tsx` | Catch limit error, show upgrade prompt, display max video note |
| `src/components/teacher/SpeakingLessonCreator.tsx` | Catch limit error, show upgrade prompt |

## Why Not a Separate `teacher_usage` Table

The user spec proposes a `teacher_usage` table, but this adds complexity (sync issues, monthly reset cron, ON CONFLICT upserts) when we can simply COUNT from `teacher_lessons WHERE created_at >= start_of_month`. The trigger approach is stateless and always accurate.

