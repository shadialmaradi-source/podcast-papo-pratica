

# Plan: Fix FirstLesson Step Persistence Bug

## Problem
After completing flashcards, users are sent back to the video step instead of seeing the "Lesson Complete" screen. This happens because:

1. `FirstLesson` always initializes `step` to `'intro'` — it never reads the saved `lesson_step` from localStorage
2. `handleFlashcardsComplete` removes `lesson_step` from localStorage **before** setting step to `'complete'`, creating a race condition on remount
3. Any component remount (StrictMode, navigation, refresh) resets the entire flow to the beginning

## Fix

### `src/pages/FirstLesson.tsx`
1. **Restore step from localStorage on mount** — initialize `step` state by reading `localStorage.getItem('lesson_step')` with fallback to `'intro'`
2. **Move `localStorage.removeItem` to after `'complete'` is set** — only clear when the complete screen actually renders
3. **Keep the `useEffect` that saves step** — ensures continuity across refreshes for all intermediate steps

### Code changes (single file)
- Change `useState<LessonStep>('intro')` to read from localStorage
- In `handleFlashcardsComplete`, remove the `localStorage.removeItem('lesson_step')` call — instead, clear it in the `'complete'` case or in `LessonComplete` when the user navigates away

This is a minimal 1-file fix that ensures users never repeat already-completed steps.

