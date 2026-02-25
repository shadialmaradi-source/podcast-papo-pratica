

# Fix Onboarding & Language Issues — Plan

## Analysis

After reviewing the code, here is how the first lesson flow works:

1. **Onboarding** (`src/pages/Onboarding.tsx`) saves three values:
   - `onboarding_language` = target language (e.g. `"english"`) — what user wants to learn
   - `onboarding_native_language` = native language code (e.g. `"es"`) — what user already speaks
   - `onboarding_level` = proficiency level

2. **FirstLesson** (`src/pages/FirstLesson.tsx`) reads `onboarding_language` to pick content from `allLessonContent`, which contains hardcoded exercises, speaking phrases, and flashcards.

3. **The content** (`src/data/firstLessonContent.ts`) has:
   - **English content**: questions in English (correct), but all translations hardcoded in **Spanish** (e.g. `"Puedo pedir un café por favor?"`)
   - **Spanish content**: questions in Spanish, translations hardcoded in English
   - Every level has **10 exercises** hardcoded

4. **Speaking step** (`src/components/lesson/LessonSpeaking.tsx`): individual phrases can be skipped, but the summary mode for intermediate/advanced has no skip for the entire step. Users must record or hit the limit.

5. **Flashcards** (`src/components/lesson/LessonFlashcards.tsx`): shows `currentCard.translation` with a hardcoded `🇺🇸` flag on the back — always assumes English is the translation language.

---

## Issue 1 & 4: Translations Not in User's Native Language

**Root cause**: `firstLessonContent.ts` hardcodes translations in a single language (Spanish for English content, English for Spanish content). The user's actual native language is ignored.

**Fix**: Add multi-language translations to the static content, keyed by native language code (`en`, `es`, `pt`, `fr`, `it`). Then pass the native language through the component chain so the correct translation is displayed.

### Changes:

**`src/data/firstLessonContent.ts`**:
- Change `translation: string` to `translations: Record<string, string>` on `SpeakingPhrase`, `Flashcard`, and add `questionTranslations` on `Exercise`
- Add a helper `getLocalizedContent(content, nativeLanguage)` that resolves translations to the right language
- For each entry, provide translations in `en`, `es`, `pt` (the three most common native languages); fall back to `en` for missing codes

**`src/pages/FirstLesson.tsx`**:
- Read `onboarding_native_language` from localStorage
- Call `getLocalizedContent(content, nativeLanguage)` to resolve all translations before passing to child components

**`src/components/lesson/LessonFlashcards.tsx`**:
- Accept a `nativeLanguage` prop
- Replace the hardcoded `🇺🇸` flag with the correct flag for the user's native language using `getLanguageFlag()`

**`src/components/lesson/LessonSpeaking.tsx`**:
- The `translation` shown under each phrase will already be resolved by the parent

---

## Issue 2: Too Many Questions (10 Instead of 5)

**Root cause**: Each level in `firstLessonContent.ts` has 10 hardcoded exercises.

**Fix**:

**`src/data/firstLessonContent.ts`**:
- Trim each exercises array to 5 items (keep the first 5 which cover the most important question types)

**`src/pages/FirstLesson.tsx`**:
- Update `totalExercises` default from `10` to `5`

---

## Issue 3: No Skip Button on Speaking/Vocal Summary

**Root cause**: `LessonSpeaking` for intermediate/advanced (summary mode) only shows Continue after recording + analysis. No way to skip entirely.

**Fix**:

**`src/components/lesson/LessonSpeaking.tsx`**:
- Add a "Skip Speaking" button visible at all times (both in summary mode and phrase mode) that calls `onComplete()` directly
- Place it as a subtle link/ghost button below the main content area so it doesn't distract but is always accessible

---

## Summary of Files to Change

| File | Changes |
|------|---------|
| `src/data/firstLessonContent.ts` | Multi-lang translations on flashcards, speaking phrases, exercise hints; trim to 5 exercises per level |
| `src/pages/FirstLesson.tsx` | Read native language, resolve translations, pass to children |
| `src/components/lesson/LessonFlashcards.tsx` | Accept `nativeLanguage` prop, show correct flag |
| `src/components/lesson/LessonSpeaking.tsx` | Add "Skip Speaking" button |

No database changes or edge function changes are needed — this is entirely static first-lesson content and UI.

