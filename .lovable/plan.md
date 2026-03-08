

# Plan: Speaking Practice Lesson Type

## Analysis

A speaking assignment system already exists (`speaking_assignments` + `speaking_questions` tables, `AssignSpeakingModal`, `generate-speaking-questions` edge function). However, that flow is a lightweight "assign topic to student" shortcut from the students page. This feature adds a richer **lesson creation flow** with AI topic generation, vocabulary support, and integration into the `teacher_lessons` framework.

## What Exists and Can Be Reused
- `generate-speaking-questions` edge function (generates 8 graded questions)
- `speaking_questions` table structure (model for new lesson-based questions)
- `analyze-word` edge function (can serve as vocabulary translation)
- `teacher_lessons` table already has `lesson_type` column

## What Needs to Be Built

### Database (2 new tables, 1 column addition)

**Add columns to `teacher_lessons`:**
- `speaking_topic` TEXT (nullable)
- `speaking_description` TEXT (nullable)

**New table: `speaking_lesson_questions`**
- Stores questions tied to a `teacher_lessons` record (separate from the existing `speaking_questions` which ties to `speaking_assignments`)
- Columns: id, lesson_id (FK to teacher_lessons), question_text, difficulty, order_index, created_at
- RLS: teachers manage own (via lesson_id join), students view assigned (via student_email join)

**New table: `speaking_vocabulary`**
- Columns: id, question_id (FK to speaking_lesson_questions), target_word, translation, teacher_note, created_at
- RLS: same pattern as questions

### Edge Functions (2 new)

**`generate-speaking-topics`** — Generates 3 topic suggestions given language + level. Uses Lovable AI gateway. Returns `{ topics: [{ title, description, suggested_level }] }`.

**`translate-vocabulary`** — Translates a word/phrase given source language, target language, and context sentence. Returns `{ translation, note }`. Uses Lovable AI gateway.

The existing `generate-speaking-questions` edge function is reused as-is.

### Frontend Components

**`SpeakingLessonCreator.tsx`** (new) — Multi-step wizard:
1. Select language + level → click Next
2. AI generates 3 topics (calls `generate-speaking-topics`) → teacher picks one or enters custom → click Next
3. AI generates questions (calls `generate-speaking-questions`) → teacher reviews, can regenerate → click Next
4. Per-question vocabulary editor (inline expand, type word → auto-translate via `translate-vocabulary`) → click Next
5. Review + title + optional student assignment → Create

**`LessonTypeSelector.tsx`** (update) — Add "Speaking Practice" as third option with `MessageSquare` icon. Update type to `"paragraph" | "youtube" | "speaking"`.

**`TeacherDashboard.tsx`** (update) — Handle `speaking` type: when selected, show `SpeakingLessonCreator` instead of `CreateLessonForm`. Add new flow step `"speaking_form"`.

**`StudentLesson.tsx`** (update) — Detect `lesson_type === 'speaking'` and render a speaking-specific view: one question at a time, vocabulary flashcards per question, note-taking textarea, progress indicator.

**`TeacherLesson.tsx`** (update) — Detect speaking lessons and show questions list with vocabulary counts and student notes.

### Routing
No new routes needed — speaking lessons use existing `/lesson/student/:shareToken` and `/teacher/lesson/:id` routes, just with different rendering based on `lesson_type`.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/generate-speaking-topics/index.ts` | New edge function |
| `supabase/functions/translate-vocabulary/index.ts` | New edge function |
| `supabase/config.toml` | Register 2 new functions |
| Database migration | Add columns + 2 new tables + RLS |
| `src/components/teacher/LessonTypeSelector.tsx` | Add speaking option |
| `src/components/teacher/SpeakingLessonCreator.tsx` | New multi-step wizard |
| `src/pages/TeacherDashboard.tsx` | Handle speaking type flow |
| `src/pages/StudentLesson.tsx` | Render speaking lesson view |
| `src/pages/TeacherLesson.tsx` | Render speaking lesson detail |

## Technical Details

- Topic generation prompt asks for 3 topics with title, description, and suggested CEFR range
- Vocabulary auto-translation uses debounced calls (500ms) to `translate-vocabulary` edge function
- Questions stored separately from the existing `speaking_questions` table (which is tied to `speaking_assignments`) to avoid coupling the two systems
- Student vocabulary from speaking lessons can later be synced to flashcard repository

