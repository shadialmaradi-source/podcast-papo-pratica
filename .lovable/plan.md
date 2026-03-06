

# Plan: Student Lessons UX + On-Demand Exercise Generation + Translations

## 5 Changes Requested

### 1. Student Homepage: "My Lessons" preview + dedicated page

**Current**: All assigned lessons listed inline on AppHome.
**New**: Show 2-3 most recent lessons on homepage with a "See All" link. Create a new `/my-lessons` page with the full list, better card design (thumbnail/video preview if YouTube, topic, status badge).

**Files**:
- `src/pages/AppHome.tsx` -- limit to 3 lessons, add "See All →" link
- `src/pages/MyLessons.tsx` -- new page with full lesson list, better cards
- `src/App.tsx` -- add `/my-lessons` route

### 2. Allow redo of completed lessons

**Current**: When all exercises are submitted, the student sees "All Done!" with only "Back to Home". No way to redo.
**New**: On the "All Done!" screen, add a "Redo Lesson" button that clears local state (responses/submitted) so the student can go through exercises again. Also allow modifying submitted answers (remove the `disabled` prop on submitted answers, change "Answer submitted" to "Update Answer" button).

**Files**:
- `src/pages/StudentLesson.tsx` -- add "Redo Lesson" button on completion screen, allow re-submitting answers (upsert already handles this), remove disabled state after submission

### 3. On-demand exercise generation (generate per type on click)

**Current**: All exercise types generated together at lesson creation time via `generate-lesson-exercises`. Teacher and student see all groups at once.
**New**: 
- At lesson creation, do NOT auto-generate exercises. Instead store the lesson and show the video + transcript + **buttons for each selected exercise type**.
- When teacher clicks a button (e.g. "Fill in the Blank"), call a new edge function `generate-lesson-exercises-by-type` that generates only 5 exercises for that type.
- Once generated, the exercises appear inline below that button.
- Student sees the same: buttons per type, click to generate/view.

**Edge function**: Create `generate-lesson-exercises-by-type` that accepts `{ lessonId, exerciseType }` and generates only that type's exercises (5 questions, or 3 for role_play). Reuse the same AI prompt logic.

**Files**:
- `supabase/functions/generate-lesson-exercises-by-type/index.ts` -- new function
- `src/components/teacher/CreateLessonForm.tsx` -- replace auto-generation with per-type buttons
- `src/pages/TeacherLesson.tsx` -- same per-type button pattern
- `src/pages/StudentLesson.tsx` -- same per-type button pattern

### 4. Exercise language matches video language (not hardcoded)

**Current**: The edge function prompt says "Language: {cefr_level} level learner" but doesn't specify the actual language. Questions may come out in English.
**New**: Detect the video's language from the YouTube URL context or let the teacher specify it. Add the language to the AI prompt so questions and answers are in the target language.

The teacher already selects a language for paragraph lessons but NOT for YouTube lessons. Add a language selector to the YouTube lesson creation form.

**DB**: Add `language` text column to `teacher_lessons` (default 'italian').
**Edge function**: Use `lesson.language` in the AI prompt to ensure exercises are in the correct language.

**Files**:
- DB migration -- add `language` column
- `src/components/teacher/CreateLessonForm.tsx` -- add language selector for YouTube lessons
- `supabase/functions/generate-lesson-exercises-by-type/index.ts` -- use language in prompt

### 5. Translation buttons (question + answer) using student's native language

**Current**: Community video exercises have a `TranslationHint` component. Teacher lessons don't have this.
**New**: 
- Add a "student_native_language" field to the lesson creation form (dropdown: English, Spanish, Italian, German, French, Portuguese). This is stored on the lesson but the ACTUAL translation language used is the student's own profile `native_language`.
- In the exercise generation, generate `question_translation` and `answer_translation` fields in the exercise content JSON by adding them to the AI prompt.
- On the student view, show two collapsible buttons: "Translate question" and "Translate answer" using the existing `TranslationHint` pattern.

**Approach**: Rather than adding a field to the lesson form (since user chose "student's own profile language"), we generate translations at exercise generation time. But since exercises are generated on-demand and we don't know the student's language at generation time, we should generate translations into the student's native language client-side using the `analyze-word` edge function, OR include translations in the AI prompt for common languages.

Simpler approach: Include a `translations` object in the exercise content with translations for the 6 supported languages. The AI can do this in one pass. Then on the client, pick the student's native language from their profile.

Actually, the cleanest approach: Add translation fields to the prompt, generating translations in English by default (most common). On the student view, the student's profile `native_language` determines which language to show. We can generate translations at exercise-generation time for the teacher's specified "hint language", or we generate multi-language translations.

Given the user said "student's own profile language", the simplest: generate an English translation always (as fallback), and if the student's native language differs, use the existing translation infrastructure. But this is complex.

**Pragmatic approach**: During exercise generation, generate `question_translation` and `answer_translation` in English. Store them in the exercise content JSON. On the client, display these translations via two separate `TranslationHint`-style buttons. If the student's profile language is not English, we could add a client-side translation step later, but for now English is the default.

Actually re-reading: the user wants the teacher to select "what language the student wants the translation in" during lesson creation. So add a `translation_language` field to the form and store it on the lesson. Pass this to the edge function so translations are generated in that language.

**Files**:
- `src/components/teacher/CreateLessonForm.tsx` -- add "Translation Language" dropdown
- DB migration -- add `translation_language` column to `teacher_lessons`
- `supabase/functions/generate-lesson-exercises-by-type/index.ts` -- generate `question_translation` and `answer_translation` in the specified language
- `src/pages/StudentLesson.tsx` -- add two `TranslationHint` buttons per exercise

---

## DB Migration

```sql
ALTER TABLE public.teacher_lessons 
  ADD COLUMN language text NOT NULL DEFAULT 'italian',
  ADD COLUMN translation_language text NOT NULL DEFAULT 'english';
```

## New Edge Function: `generate-lesson-exercises-by-type`

Same logic as current `generate-lesson-exercises` but:
- Accepts `{ lessonId, exerciseType }` 
- Generates only that type (5 questions or 3 for role_play)
- Includes `question_translation` and `answer_translation` in the JSON prompt
- Uses `lesson.language` to specify exercise language
- Uses `lesson.translation_language` for translation fields
- Fetches/stores transcript if not already stored
- Appends to existing exercises (doesn't delete all)

## Implementation Order

1. DB migration (language + translation_language columns)
2. New edge function `generate-lesson-exercises-by-type`
3. Update `CreateLessonForm.tsx` (language selector, translation language selector, per-type buttons instead of auto-generate)
4. Update `StudentLesson.tsx` (per-type buttons, translation hints, redo capability, editable answers)
5. Update `TeacherLesson.tsx` (per-type buttons)
6. Create `MyLessons.tsx` page + update AppHome + routes

