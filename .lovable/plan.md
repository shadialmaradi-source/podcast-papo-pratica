

# Plan: Fix Onboarding Speaking Session UX Issues

## 3 Issues to Fix

### 1. Skip button not visible on mobile without scrolling
**Problem**: The "Skip Speaking Practice" button is placed below the main card content, requiring scrolling on mobile.
**Fix**: Move the skip button inside the card (at the top-right or as a sticky footer), and reduce overall padding/spacing on mobile so the key UI fits in the viewport. For both summary mode (line 556) and phrase mode (line 792), reposition the skip button to be always visible — place it in the header area next to the title as a compact link-style button.

**File**: `src/components/lesson/LessonSpeaking.tsx`

### 2. Hardcoded "Spanish" in summary mode instructions
**Problem**: Line 405 says `"...using Spanish."` — hardcoded instead of using the `language` prop.
**Fix**: Replace the hardcoded "Spanish" with the `language` prop value (capitalize first letter). The component already receives `language` as a prop (default "spanish").

**File**: `src/components/lesson/LessonSpeaking.tsx` — line 405

### 3. "Progress saved" toast on every answer
**Problem**: In `LessonExercises.tsx`, line 139-143 shows a toast on every answer submission.
**Fix**: Remove the toast call entirely. Progress is saved silently to localStorage — no need to notify the user each time.

**File**: `src/components/lesson/LessonExercises.tsx` — lines 138-143

## Implementation Details

- **Skip button repositioning**: Add the skip button as an inline element in the header section (near the "Speaking Practice" title) for both summary and phrase modes. Use a compact `text-sm` ghost button with absolute/fixed positioning or simply place it in a flex row with the title.
- **Language string**: Use `language.charAt(0).toUpperCase() + language.slice(1)` to capitalize the language name dynamically.
- **Toast removal**: Delete the 5-line toast block after `saveProgress()` in `handleAnswer`.

