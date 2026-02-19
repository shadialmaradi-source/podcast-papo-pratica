
# Updated Roadmap: Interactive 1-on-1 Teaching Platform

## What's Already Done

### Day 1 - Foundation (Complete)
- Database schema: `teacher_lessons` and `lesson_exercises` tables with RLS policies
- Teacher role system: `user_roles` table, signup upsert fix, auto-correction on dashboard
- Teacher authentication and role-based routing

### Day 2 - Lesson Configuration (Complete)
- `CreateLessonForm`: title, student email, topic, CEFR level, exercise type selection
- `LessonList`: shows all lessons with status badges
- Lessons saved to DB as `draft` status

### Day 3 - AI Exercise Generation (Complete)
- `generate-lesson-exercises` edge function: calls AI for all 5 exercise types
- Generate / Regenerate button in lesson list
- Inline preview of generated exercises (ExerciseCard component)
- Lesson status transitions: `draft` → `ready`

---

## What's Still Missing

The current flow stops at **"I created a lesson draft"** because:
1. The Generate button calls the edge function but the RLS bug prevented teachers from even creating lessons — now fixed
2. There is no way to "run" a lesson live with a student
3. Students have no view to see or interact with their assigned lessons

---

## Remaining Roadmap

### Day 4 - Live Lesson Canvas (Teacher side)
This is the core real-time feature. When a teacher clicks "Start Lesson" on a `ready` lesson, they enter a **shared canvas** where exercises are presented one at a time.

What to build:
- "Start Lesson" button on ready lessons → transitions status to `active`
- New page: `/teacher/lesson/:id` — the live lesson view
- Exercise presenter: shows one exercise at a time (fill-in-blank, quiz, etc.) with "Next" to advance
- Teacher controls: reveal answer, add notes, mark complete
- No real-time sync yet — teacher-only view first

Files to create/modify:
- `src/pages/TeacherLesson.tsx` (new)
- `src/components/teacher/ExercisePresenter.tsx` (new)
- `src/components/teacher/LessonList.tsx` (add "Start" button)
- Router: add `/teacher/lesson/:id`

### Day 5 - Student Lesson View
Students need to see lessons assigned to their email and interact with exercises.

What to build:
- New page: `/lesson/:id` — student-facing lesson view
- Fetch lesson by ID where `student_email` matches auth user's email
- Show exercises in sequence (student answers, teacher sees)
- Simple answer submission (stored in a new `lesson_responses` table)

Files to create/modify:
- `src/pages/StudentLesson.tsx` (new)
- `supabase/migrations/...` — `lesson_responses` table
- Router: add `/lesson/:id`
- `src/pages/AppHome.tsx` — surface assigned lessons to students

### Day 6 - Real-time Shared Canvas
The teacher and student see the same exercise at the same time. Teacher can advance to next exercise and the student's view updates live.

What to build:
- Supabase Realtime subscription on `teacher_lessons.current_exercise_index` (new column)
- Teacher advances → DB update → student's view reacts instantly
- Visual "waiting for teacher" state on student side

Files to create/modify:
- Migration: add `current_exercise_index` column to `teacher_lessons`
- `src/pages/TeacherLesson.tsx` — broadcast updates
- `src/pages/StudentLesson.tsx` — subscribe to updates

### Day 7 - Lesson Completion & History
- Teacher marks lesson as `completed`
- Summary screen showing all exercises answered
- Student can review past lessons from their home screen

---

## Immediate Next Step (Day 4)

The most impactful next step is fixing the current dead-end: after generating exercises, teachers have no way to actually run the lesson. Day 4 delivers the live lesson presenter — a single-page teacher view where they step through exercises one by one.

This is one focused credit: 1 new page, 1 new component, 1 route, 1 button added to the existing list.
