

# Integrated Lesson Creation Flow with Inline Exercises

## Problem
Currently, after clicking "Create Lesson", the user is navigated away to the dashboard. They must manually find the lesson, click "Generate", then "Start" to see exercises. The quiz also generates only 1 exercise per selected type instead of 5 questions.

## Changes

### 1. `CreateLessonForm.tsx` — Stay on page after creation, show exercises inline
After "Create Lesson" succeeds:
- Auto-trigger exercise generation (call `generate-lesson-exercises` edge function)
- Show a new "Lesson Created" section with tabs: **Paragraph** (with explore/flashcard) and **Exercises** (5-question quiz)
- Show the share link prominently at the top of this section
- Remove the `onCreated` navigation — stay on the form page
- Add a "Back to Dashboard" button after everything is visible

### 2. `generate-lesson-exercises/index.ts` — Generate 5 multiple_choice questions
Currently generates 1 exercise per type. Update the loop so `multiple_choice` generates 5 separate questions (each with its own AI call), keeping other types at 1. Each question gets a unique `order_index`.

### 3. `TeacherDashboard.tsx` — Update `handleCreated`
Stop navigating to `/teacher/lesson/:id`. Instead, keep `step` as `"form"` so the user stays on the creation page and sees the inline result.

### File Summary
| File | Action |
|------|--------|
| `src/components/teacher/CreateLessonForm.tsx` | After creation: auto-generate exercises, show paragraph tab + exercises tab + share link inline |
| `supabase/functions/generate-lesson-exercises/index.ts` | Generate 5 questions for `multiple_choice` type |
| `src/pages/TeacherDashboard.tsx` | Update `handleCreated` to not navigate away |

