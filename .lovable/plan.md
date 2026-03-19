

# Custom-Paragraph Flashcards Parity — 1 File

## `src/hooks/useCreateLesson.ts`

**Problem**: `EXERCISE_TYPES_PARAGRAPH` (line 43-46) includes `flashcards`, but the generation edge function and lesson runtimes don't support flashcards for paragraph lessons.

**Fix**: Remove the `flashcards` entry from `EXERCISE_TYPES_PARAGRAPH`.

```typescript
// Before
export const EXERCISE_TYPES_PARAGRAPH = [
  { id: "multiple_choice", label: "Multiple Choice (Quiz)" },
  { id: "flashcards", label: "Flashcards" },
] as const;

// After
export const EXERCISE_TYPES_PARAGRAPH = [
  { id: "multiple_choice", label: "Multiple Choice (Quiz)" },
] as const;
```

This is the only change needed. The CreateLessonForm already renders options dynamically from `exerciseTypeOptions`, so removing the entry from the source array removes it from the UI. The flashcard-related code for the word explorer / text selection popover is unrelated (those are interactive transcript flashcards, not exercise-type flashcards) and should remain untouched.

| File | Change |
|------|--------|
| `src/hooks/useCreateLesson.ts` | Remove `flashcards` from `EXERCISE_TYPES_PARAGRAPH` |

1 file, 1 line removed.

