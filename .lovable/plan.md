

# Fix Speaking Lesson Creator: Persist State + Required Student Email

## Issues
1. When a teacher generates questions in the speaking lesson flow, navigates away, and comes back, all progress is lost (topics, questions, vocabulary reset to initial state). The dashboard persists the `speaking_form` step via sessionStorage, but the SpeakingLessonCreator's internal state is not persisted.
2. In the review step, "Assign to Student" is optional and only allows selecting existing students — no way to type a new email.

## Changes

### 1. Persist SpeakingLessonCreator state in sessionStorage (`src/components/teacher/SpeakingLessonCreator.tsx`)

- Add a `STORAGE_KEY` constant (e.g., `"speaking_lesson_creator_state"`)
- Initialize all key state variables from sessionStorage: `step`, `language`, `translationLanguage`, `level`, `topics`, `selectedTopicIdx`, `customMode`, `customTitle`, `customDescription`, `questions`, `vocabByQuestion`, `title`, `studentEmail`
- Add a `useEffect` that saves these values to sessionStorage whenever they change
- Clear sessionStorage on successful creation (`handleCreate`) and on cancel (`onCancel`)

### 2. Make student email required + allow new email input (`src/components/teacher/SpeakingLessonCreator.tsx`)

In the review step (lines 779-794):
- Change label from "Assign to Student (optional)" to "Assign to Student *"
- Replace the `Select` with a combined UI: a text `Input` for typing an email, plus a dropdown of existing students that populates the input when clicked
- Add validation in `handleCreate`: block submission if `studentEmail` is empty or not a valid email
- Auto-add the student to `teacher_students` via upsert after lesson creation (same pattern as `CreateLessonForm.tsx`)

**Files to edit:**
- `src/components/teacher/SpeakingLessonCreator.tsx`

