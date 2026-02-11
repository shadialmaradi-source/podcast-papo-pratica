
# Multi-Language UI, Onboarding Native Language, and Exercise Translation Hints

## Overview

This plan covers 4 interconnected features split across 4 phases (one per day, each under 6 credits):

1. **Auto-detect browser language and translate the full UI** (not just landing page)
2. **Add a "native language" step to onboarding** so we know what language to show translations in
3. **Add language-specific content for the onboarding first lesson** (English content when learning English)
4. **Add hidden translation hints under exercise questions** so users can optionally reveal help in their native language

---

## Phase 1: Browser Language Detection + Full UI Translation (Day 1)

### Goal
The entire app UI (not just the landing page) should auto-detect the user's browser language and display in that language. Currently only the landing page does this with `navigator.language`. The rest of the app uses `useTranslation()` which reads from the DB profile.

### Changes

**Add French (`fr`) to the translation system:**
- `src/utils/translations.ts`: Add `LanguageCode = 'en' | 'it' | 'pt' | 'es' | 'fr'` and add full `fr` translation block
- Update `mapLanguageToCode` to handle `'french' -> 'fr'`

**Create a browser language detection utility:**
- `src/utils/browserLanguage.ts` (new file): Export `detectUILanguage()` that reads `navigator.language`, maps to supported codes (`en`, `es`, `it`, `pt`, `fr`), falls back to `en`

**Update `useTranslation` hook:**
- `src/hooks/useTranslation.tsx`: When user is not logged in, use `detectUILanguage()` instead of hardcoded `'en'`. When logged in, continue reading from profile but also store the UI language preference.

**Update `Onboarding.tsx`:**
- Use `detectUILanguage()` to show the onboarding UI text in the user's browser language (step labels, button text, headings)
- Add translation keys for all onboarding strings

**Add missing translation keys** to all 5 languages for:
- Onboarding: "What language do you want to learn?", "Choose your target language", "What's your level?", "Step 1: Language", "Step 2: Level", "Continue", "Back"
- Exercise UI: "Back to Video", "Check Answer", "Exercise N of M", etc.

---

## Phase 2: Native Language Selection in Onboarding (Day 2)

### Goal
Add a new step to the onboarding flow where users select their native language (or "translation language"). This determines what language translations/hints will appear in throughout the app.

### Changes

**Update `src/pages/Onboarding.tsx`:**
- Add a new step between language selection and level selection: `step = 'language' | 'native' | 'level'`
- Progress indicator becomes 3 steps: "Language to learn" -> "Your language" -> "Level"
- The "native language" step shows: English, Spanish, French, Italian, Portuguese (all available, no "coming soon")
- Store selection in `localStorage.setItem('onboarding_native_language', code)`
- The selected target language is excluded from the native language list (you can't learn English and set native as English)

**Update progress indicators:**
- Step bar updates to show 3 steps instead of 2

**Update `src/pages/FirstLesson.tsx`:**
- Read `onboarding_native_language` from localStorage
- Pass it down to exercise/speaking/flashcard components (for Phase 4)

**Update DB profile (for logged-in users later):**
- Add `native_language` column to `profiles` table via migration
- When user registers, save the `onboarding_native_language` from localStorage to their profile

---

## Phase 3: Language-Specific Onboarding Content (Day 3)

### Goal
When a user selects "English" as their target language in onboarding, the first lesson video and exercises should be in English (currently everything is hardcoded Spanish).

### Changes

**Update `src/pages/FirstLesson.tsx`:**
- Add a second set of `lessonContent` for English (key: `english`), with:
  - English learning video (e.g., a real English conversation clip from YouTube)
  - 10 exercises per level (absolute_beginner, beginner, intermediate, advanced) with questions in English
  - Speaking phrases in English
  - Flashcards in English
- The content selection logic becomes: `const content = lessonContent[targetLanguage]?.[userLevel]`
- Restructure `lessonContent` from `Record<level, content>` to `Record<language, Record<level, content>>`

**Update `src/components/lesson/LessonSpeaking.tsx`:**
- Read `onboarding_language` from localStorage and pass the correct language code for speech recognition
- Currently hardcoded to `language="spanish"` -- make it dynamic

**Update `src/components/lesson/LessonIntro.tsx`:**
- Show the target language name dynamically ("Your first English lesson" vs "Your first Spanish lesson")

---

## Phase 4: Hidden Translation Hints on Exercises (Day 4)

### Goal
Under each exercise question (in the target language), show a collapsible translation hint in the user's native language. Hidden by default with a "Need help? See translation" link.

### Changes

**Update the AI exercise generation prompt** (`supabase/functions/generate-level-exercises/index.ts`):
- Add a `questionTranslation` field to the exercise JSON schema
- The prompt instructs: "For each exercise, also provide a `questionTranslation` field with the question translated into {nativeLanguage}"
- Pass `nativeLanguage` as a new parameter from the frontend

**Update the exercise DB schema:**
- Migration: Add `question_translation` column (text, nullable) to `youtube_exercises` table

**Update exercise rendering** in `src/components/YouTubeExercises.tsx`:
- Below the question text (`<h3>{currentExercise.question}</h3>`), add a translation hint component:

```text
[Question in target language]
  "Need help? Tap to see translation"  (clickable, muted text)
  [Translation revealed on click, with subtle slide-down animation]
```

- Use a small `useState` per exercise to track if translation is shown
- Style: `text-sm text-muted-foreground italic` with a small globe icon
- Once revealed, show a "Hide translation" toggle

**Update exercise rendering** in `src/components/lesson/LessonExercises.tsx`:
- Same translation hint pattern for the onboarding first lesson
- Read native language from localStorage

**Update `src/services/exerciseGeneratorService.ts`** (if used):
- Include `nativeLanguage` in the request to the edge function

**Frontend call update:**
- When calling `generate-level-exercises`, pass the user's native language (from profile or localStorage)
- The edge function uses it in the prompt to generate translations

### Translation Hint UI Component (reusable)

Create `src/components/exercises/TranslationHint.tsx`:
- Props: `translation: string | null`
- If no translation, renders nothing
- Otherwise renders the collapsible hint with animation

---

## Files Summary

| Phase | File | Action |
|-------|------|--------|
| 1 | `src/utils/translations.ts` | Modify (add `fr`, add keys) |
| 1 | `src/utils/browserLanguage.ts` | Create |
| 1 | `src/hooks/useTranslation.tsx` | Modify (browser detection fallback) |
| 1 | `src/pages/Onboarding.tsx` | Modify (translate UI strings) |
| 2 | `src/pages/Onboarding.tsx` | Modify (add native language step) |
| 2 | `supabase/migrations/[timestamp].sql` | Create (add native_language to profiles) |
| 2 | `src/integrations/supabase/types.ts` | Modify (add native_language) |
| 2 | `src/pages/FirstLesson.tsx` | Modify (read native language) |
| 3 | `src/pages/FirstLesson.tsx` | Modify (add English content, restructure) |
| 3 | `src/components/lesson/LessonSpeaking.tsx` | Modify (dynamic language) |
| 3 | `src/components/lesson/LessonIntro.tsx` | Modify (dynamic language name) |
| 4 | `supabase/functions/generate-level-exercises/index.ts` | Modify (add translation field) |
| 4 | `supabase/migrations/[timestamp].sql` | Create (add question_translation column) |
| 4 | `src/components/exercises/TranslationHint.tsx` | Create |
| 4 | `src/components/YouTubeExercises.tsx` | Modify (add hint under questions) |
| 4 | `src/components/lesson/LessonExercises.tsx` | Modify (add hint under questions) |
