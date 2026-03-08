

# Plan: Fix Flashcard Study Session Issues

## Problems
1. **No back/exit button** during a study session — user is trapped
2. **Flag mismatch** — the flag shown doesn't match the card's actual language (e.g., Italian flag on an English word "wake up")
3. **Mixed languages** — even with the language filter, the study session should strictly be one language

## Root Cause
- `LessonFlashcards` receives a single `language` prop for the flag, but individual cards may come from different language videos
- `LessonFlashcards` has no exit/close callback — only `onComplete` at the end
- The language filter requires selection but the user may bypass it or cards may be mistagged

## Changes

### 1. `src/components/lesson/LessonFlashcards.tsx`
- Add an optional `onExit` prop for a back/close button
- Render a back button (ArrowLeft + "Exit") in the top-left corner when `onExit` is provided
- Add per-card language support: accept an optional `cardLanguage` field on each flashcard, and use it for the flag instead of the global `language` prop when available

### 2. `src/components/FlashcardRepository.tsx`
- Pass `onExit={() => setIsStudying(false)}` to `LessonFlashcards` so users can exit mid-session
- Include `video_language` per card in `studyFlashcards` so each card displays its own correct flag
- Ensure language filter is enforced: if no language selected and multiple languages exist, prevent starting study (already gated by UI but add safety check)

### Files to modify
- `src/components/lesson/LessonFlashcards.tsx`
- `src/components/FlashcardRepository.tsx`

