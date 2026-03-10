

# Plan: Teacher YouTube Lesson Overhaul

This is a large feature touching student onboarding, the teacher post-creation view, the exercise generation backend, and the student lesson experience. I recommend splitting into phases. Here is the full scope.

## Summary of Changes

1. **Simplified student onboarding for shared lessons** -- 2 steps only (learning language + native language), then redirect to lesson
2. **Teacher post-creation view for YouTube lessons** -- video + transcript with word exploration + exercise sections grouped by type
3. **Exercise generation overhaul** -- 5 questions per type (except role_play: 2-3 scenarios), remove image_discussion, role_play uses transcript context
4. **Student lesson view update** -- same grouped-by-type sequential layout

---

## Phase 1: Simplified Student Onboarding

### Problem
Currently, students arriving via a shared link must go through the full 3-step onboarding (language, native, level). For shared lessons, the level is already set by the teacher.

### Solution
- Detect if the user arrived from a shared lesson link by storing `pending_lesson_token` in localStorage before redirecting to auth/onboarding
- In `Onboarding.tsx`, if `pending_lesson_token` exists, skip the "level" step entirely. After step 2 (native language), save profile and redirect to `/lesson/student/{token}` instead of `/lesson/first`
- In `AuthCallback.tsx` or `App.tsx`, detect the `/lesson/student/:id` route for unauthenticated users and store the token before redirecting to `/auth`

### Files changed
- **`src/App.tsx`** -- ProtectedRoute for `/lesson/student/:id` stores redirect info before bouncing to `/auth`
- **`src/pages/Onboarding.tsx`** -- check for `pending_lesson_token`, skip level step, redirect to lesson on completion
- **`src/pages/AuthCallback.tsx`** -- preserve pending lesson redirect after OAuth

---

## Phase 2: Remove image_discussion, Update Exercise Types

### DB migration
- No schema changes needed (exercise_types is a text array, content is JSONB)

### Edge function: `generate-lesson-exercises`
- Remove `image_discussion` from `EXERCISE_PROMPTS`
- Change generation count: 5 questions for ALL types except `role_play` (generate 2-3 scenarios)
- Update `role_play` prompt to require the AI to base the scenario on the transcript/video content. Pass `lesson.youtube_url` context or transcript content to the prompt
- For YouTube lessons, fetch transcript from `youtube_videos` table (or call extract-youtube-transcript) and pass it to AI prompts so exercises are video-contextual

### Frontend: `CreateLessonForm.tsx`
- Remove `image_discussion` from `EXERCISE_TYPES_YOUTUBE`

### Files changed
- **`supabase/functions/generate-lesson-exercises/index.ts`** -- updated prompts, counts, transcript context
- **`src/components/teacher/CreateLessonForm.tsx`** -- remove image_discussion option

---

## Phase 3: Teacher Post-Creation View (YouTube lessons)

### Current state
After creating a YouTube lesson, the teacher sees: share link, a "Exercises" tab with only multiple_choice questions rendered one-by-one.

### New design
After creation, the teacher sees:
1. **Share link** (unchanged)
2. **YouTube video embed** at the top
3. **Full transcript** with the same interactive text selection (explore word / save flashcard) -- reuse `TranscriptViewer` component or a simplified version that fetches transcript via the existing pipeline (the YouTube URL was already processed by `process-youtube-video` or we fetch it on-demand)
4. **Exercise sections** -- one section per selected exercise type, displayed sequentially. Each section has a header (e.g., "Fill in the Blank (5)") and the 5 exercises rendered inside with the existing `ExerciseContent` component and prev/next navigation within each section

### Transcript fetching approach
- When a YouTube lesson is created, we need the transcript. Option: call `extract-youtube-transcript` edge function from the frontend after lesson creation, or store the transcript on `teacher_lessons.youtube_transcript` (new column)
- Simpler: add a `transcript` text column to `teacher_lessons`, and have `generate-lesson-exercises` fetch and store the transcript during generation

### DB migration
```sql
ALTER TABLE teacher_lessons ADD COLUMN transcript text;
```

### Files changed
- **DB migration** -- add `transcript` column
- **`supabase/functions/generate-lesson-exercises/index.ts`** -- fetch transcript, save to lesson, pass to AI prompts
- **`src/components/teacher/CreateLessonForm.tsx`** -- rewrite post-creation view: video embed, transcript with word exploration, sequential exercise sections grouped by type

---

## Phase 4: Teacher Live Lesson View (`TeacherLesson.tsx`)

Update `ExercisePresenter` and `TeacherLesson.tsx` to group exercises by type in sequential sections instead of a flat list:
- Show video at top
- Show transcript below (same interactive component)
- Exercise sections grouped by type, each with its own prev/next within 5 questions

### Files changed
- **`src/components/teacher/ExercisePresenter.tsx`** -- group exercises by type, render sections sequentially
- **`src/pages/TeacherLesson.tsx`** -- fetch transcript, render it with word exploration

---

## Phase 5: Student Lesson View (`StudentLesson.tsx`)

Mirror the teacher's layout for the student:
- Video at top
- Transcript (read-only or interactive if we want students to also explore words)
- Exercise sections grouped by type, sequential, with submit per question

### Files changed
- **`src/pages/StudentLesson.tsx`** -- grouped exercise sections, transcript display

---

## Technical Details

### Exercise generation counts
| Type | Count |
|------|-------|
| fill_in_blank | 5 |
| multiple_choice | 5 |
| spot_the_mistake | 5 |
| role_play | 2-3 scenarios |

### Role-play prompt update
The AI prompt for role_play will include the video transcript and instruct: "Create a role-play scenario inspired by the content of this video transcript. The scenario should relate to the themes, vocabulary, or situations discussed in the video."

### Transcript storage
Add `transcript` column to `teacher_lessons`. The edge function fetches the transcript during exercise generation (using the existing `extract-youtube-transcript` function or the SUPADATA API directly) and stores it on the lesson record. This avoids requiring a separate `youtube_videos` record.

### RLS
No new RLS policies needed -- the existing `teacher_lessons` policies already cover teacher read/write and student read access. The new `transcript` column is just another text field on the same table.

