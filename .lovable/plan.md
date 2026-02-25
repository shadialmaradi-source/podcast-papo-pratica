

# Fix Language Logic for Learning Path

## Current State Analysis

The app currently stores **`selected_language`** in the `profiles` table during onboarding, which represents the **learning/target language** (e.g. "spanish"). This value is then used to filter videos in Library (`Library.tsx` line 78: `.eq("language", userLanguage)`) and in `LearningPath` to fetch weeks.

The core issue is that `selected_language` is being used correctly for video filtering (content in the learning language), but it's labeled ambiguously and there are gaps:

1. **Library defaults `userLanguage` to `'english'`** (line 42) — so before the profile loads, English videos show even if the user is learning Spanish
2. **Flashcard edge function (`generate-flashcards`)** hardcodes translations to **English** (line 106: `"Return phrases in ${targetLanguage} with English translations"`) — ignoring the user's actual native language
3. **Exercise generation (`generate-level-exercises`)** already accepts `nativeLanguage` and uses it for `questionTranslation` — this is working correctly
4. **`VideoFlashcards.tsx`** never passes `nativeLanguage` to the edge function — it only sends `language` and `level`
5. **`LessonFlashcards.tsx`** (first lesson) already handles native language correctly after the previous fix

## Changes Required

### 1. Fix `generate-flashcards` edge function to use native language

**File: `supabase/functions/generate-flashcards/index.ts`**

- Accept `nativeLanguage` in the request body
- Change the AI prompt from hardcoded "English translations" to translations in the user's native language
- Update the system prompt line 106: `"Return phrases in ${targetLanguage} with ${nativeLanguageDisplay} translations"`

### 2. Pass `nativeLanguage` from `VideoFlashcards.tsx`

**File: `src/components/VideoFlashcards.tsx`**

- Fetch user's `native_language` from the profile (or localStorage fallback)
- Include `nativeLanguage` in the edge function call body
- Pass it to `LessonFlashcards` as prop

### 3. Fix Library default language

**File: `src/pages/Library.tsx`**

- Change the default `userLanguage` from `'english'` to read from localStorage first: `localStorage.getItem('onboarding_language') || 'english'`
- This prevents showing English videos briefly before profile loads for users learning Spanish

### 4. Fix exercise count in `generate-level-exercises`

**File: `supabase/functions/generate-level-exercises/index.ts`**

- Line 132: Change `"Generate EXACTLY 10 exercises"` to `"Generate EXACTLY 5 exercises"`
- Update the distribution: 3 multiple_choice, 1 fill_blank, 1 sequencing (drop matching to keep 5)
- This aligns with the first-lesson fix that already uses 5 exercises

### 5. Pass `nativeLanguage` to `LessonFlashcards` in `WeekVideo.tsx`

**File: `src/pages/WeekVideo.tsx`**

- Fetch user's `native_language` from profile
- Pass it as `nativeLanguage` prop when rendering `VideoFlashcards` and `LessonFlashcards`

## Summary

| File | Change |
|------|--------|
| `supabase/functions/generate-flashcards/index.ts` | Accept & use `nativeLanguage` for translations instead of hardcoded English |
| `src/components/VideoFlashcards.tsx` | Fetch native language, pass to edge function & `LessonFlashcards` |
| `src/pages/Library.tsx` | Default `userLanguage` from localStorage instead of hardcoded `'english'` |
| `supabase/functions/generate-level-exercises/index.ts` | Reduce from 10 to 5 exercises |
| `src/pages/WeekVideo.tsx` | Pass `nativeLanguage` through to flashcard components |

No database schema changes needed — `profiles.native_language` and `profiles.selected_language` already exist and are populated during onboarding.

