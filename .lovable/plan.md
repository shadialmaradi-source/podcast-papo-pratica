

# A1 Beginner Exercises — Curated Learning Path Only

## Scope Constraint
New simplified exercise types apply **only** when exercises are triggered from the **Curated learning path** (WeekVideo.tsx). The Community video section (`YouTubeVideoExercises.tsx`) remains completely unchanged.

## How to distinguish curated vs community

The curated path flows through `WeekVideo.tsx`, which calls either:
- `setup-week-video-exercises` (hybrid mode) → then `YouTubeExercises`
- `YouTubeVideoExercises` → then `YouTubeExercises`

Both pass `level="beginner"` hardcoded. We add a `source: 'curated'` flag that propagates through the chain.

## Changes

### 1. Edge function: beginner-specific prompt for curated source
**File: `supabase/functions/generate-level-exercises/index.ts`**

- Accept new `source` parameter from request body
- When `source === 'curated'` AND `normalizedLevel === 'beginner'`, use a completely different prompt that generates these 5 exercise types:
  - **2x `word_recognition`** — "Was this word in the video?" YES/NO, with the target word displayed large and a TTS button
  - **1x `emoji_match`** — "Which emoji matches this word?" with 4 emoji options
  - **1x `comprehension_check`** — Simple YES/NO question about video content
  - **1x `sequence_recall`** — "What happened FIRST?" with 3 simple text options (stored as `multiple_choice` type with 3 options)
- All other combinations (community, intermediate, advanced) use the existing prompt unchanged

### 2. New UI component for beginner exercise types
**New file: `src/components/exercises/BeginnerExercises.tsx`**

Exports individual renderer components for each new type:
- **`WordRecognitionExercise`**: Large word display + "Hear it" button (browser `SpeechSynthesis`) + Skip button + YES/NO buttons
- **`EmojiMatchExercise`**: Word displayed + grid of 4 large emoji buttons (80x80px)
- **`ComprehensionCheckExercise`**: Question text + YES/NO buttons
- All include immediate feedback (green/red) and "Next" button
- Browser TTS via `window.speechSynthesis` for pronunciation (free, no audio files needed)

### 3. Wire new types into YouTubeExercises.tsx
**File: `src/components/YouTubeExercises.tsx`**

- In `mapDbTypeToExerciseType()`: pass through `word_recognition`, `emoji_match`, `comprehension_check` as-is
- In `checkAnswerCorrectness()`: add cases for new types (simple string comparison, "Yes"/"No" matching)
- In `renderExercise()`: add case branches that render the components from `BeginnerExercises.tsx`

### 4. Pass `source` flag from WeekVideo.tsx
**File: `src/pages/WeekVideo.tsx`**

- When calling `YouTubeVideoExercises` or `YouTubeExercises` from the curated path, pass a new prop `source="curated"`
- `YouTubeVideoExercises` forwards `source` to the edge function call body
- `YouTubeExercises` receives it for potential UI adjustments (e.g., hiding "Try Next Level" for curated)

### 5. Forward source in YouTubeVideoExercises
**File: `src/components/YouTubeVideoExercises.tsx`**

- Accept optional `source` prop
- Include `source` in the `generate-level-exercises` edge function call body
- No other changes to community flow (source will be undefined, edge function uses standard prompt)

### 6. Update setup-week-video-exercises edge function
**File: `supabase/functions/setup-week-video-exercises/index.ts`**

- When this function calls `generate-level-exercises` internally, include `source: 'curated'` in the request body so hybrid-mode exercises also get the beginner treatment

## What stays unchanged
- Community tab exercise generation (no `source` prop → standard exercises)
- Community tab UI and level selection
- Intermediate and advanced exercises everywhere
- Database schema (new types fit existing `exercise_type` text column)

