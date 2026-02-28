

# Teacher Dashboard Redesign + Lesson Type Selection

## Overview
Redesign the Teacher Dashboard to show two main action cards ("Create a Lesson" and "My Students"), and introduce a lesson type selector (Custom Paragraph vs YouTube/Video Link) before entering the creation form. The existing lesson list moves below the action cards.

## Changes

### 1. Database Migration
Add columns to `teacher_lessons`:
- `lesson_type TEXT DEFAULT 'exercise_only'` — values: `'paragraph'`, `'youtube'`, `'exercise_only'`
- `paragraph_prompt TEXT` — the teacher's paragraph description
- `paragraph_content TEXT` — the AI-generated paragraph
- `share_token TEXT UNIQUE` — for shareable lesson links

### 2. Redesign `src/pages/TeacherDashboard.tsx`
Replace the current single-card layout with:
- Two hero cards side by side: "Create a Lesson" (BookOpen icon) and "My Students" (Users icon)
- "My Students" card is a placeholder for now (shows "Coming soon")
- Clicking "Create a Lesson" enters a multi-step flow inline (or navigates to a new route)
- Below the cards, show the existing `LessonList` component

### 3. New Component: `src/components/teacher/LessonTypeSelector.tsx`
Step 1 of creation — two selectable cards:
- "Custom Paragraph" — description: "Generate a paragraph with AI and create exercises from it"
- "YouTube / Video Link" — description: "Use an existing video to build exercises"

Selecting one sets `lessonType` state and proceeds to step 2.

### 4. Update `src/components/teacher/CreateLessonForm.tsx`
Accept a new `lessonType` prop (`'paragraph' | 'youtube'`).

**When `lessonType === 'paragraph'`**:
- Show level selector (Beginner/Intermediate/Advanced mapped to CEFR)
- Show textarea: "Describe the paragraph you want to generate"
- Show "Generate Paragraph" button — calls a new edge function `generate-lesson-paragraph`
- Display generated paragraph in an editable card
- Show exercise type checkboxes (Multiple Choice, Flashcards only)
- Title field (auto-suggested)
- Student email field
- Save inserts with `lesson_type: 'paragraph'`, `paragraph_prompt`, `paragraph_content`

**When `lessonType === 'youtube'`**:
- Keep existing YouTube URL field
- Add "Choose from Community Videos" button (opens existing library picker — future step)
- Keep existing CEFR level, exercise types, student email, title fields
- Save inserts with `lesson_type: 'youtube'`

### 5. New Edge Function: `supabase/functions/generate-lesson-paragraph/index.ts`
- Accepts: `{ prompt, cefrLevel, topic? }`
- Uses `LOVABLE_API_KEY` to call `ai.gateway.lovable.dev`
- Generates a language-learning paragraph based on the prompt and level
- Returns `{ paragraph, suggestedTitle }`

### 6. Generate share_token on lesson creation
- In `CreateLessonForm.onSubmit`, generate a random UUID as `share_token` and insert it with the lesson
- After creation, show the shareable link: `{siteUrl}/lesson/student/{share_token}`

### File Summary
| File | Action |
|------|--------|
| Migration SQL | Add `lesson_type`, `paragraph_prompt`, `paragraph_content`, `share_token` columns |
| `src/pages/TeacherDashboard.tsx` | Redesign with two hero cards + step flow |
| `src/components/teacher/LessonTypeSelector.tsx` | New — two card selector |
| `src/components/teacher/CreateLessonForm.tsx` | Refactor to accept `lessonType` prop, conditional fields |
| `supabase/functions/generate-lesson-paragraph/index.ts` | New edge function for AI paragraph generation |

