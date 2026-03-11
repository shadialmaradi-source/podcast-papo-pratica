

# Fix: First Lesson skips to "Complete" screen on revisit

## Root Cause

In `FirstLesson.tsx`:
1. `handleFlashcardsComplete` (line 125) calls `localStorage.removeItem('lesson_step')` then sets step to `'complete'`
2. The `useEffect` at line 89-92 fires and re-saves `lesson_step = 'complete'` to localStorage
3. On next visit (e.g., after re-doing onboarding), the initial state loader at line 33-37 reads `'complete'` and skips the entire lesson

## Fix

**File: `src/components/pages/FirstLesson.tsx`**

Two changes:

1. **Exclude 'complete' from valid restored steps** (line 36): Change the valid steps filter to exclude `'complete'` so the lesson always starts fresh if it was previously completed.

2. **Don't persist 'complete' step** (line 89-92): Add a guard in the useEffect so `localStorage.setItem` is not called when step is `'complete'`.

This ensures that after completing a lesson, revisiting `/lesson/first` always starts from `'intro'`.

