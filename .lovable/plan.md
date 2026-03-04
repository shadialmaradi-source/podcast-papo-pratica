

# Fix: Onboarding Exercises Must Match the Actual Video

## Problem
When English is selected, the video comes from `onboarding_videos` (YouTube Shorts), but the exercises always come from hardcoded fallback content in `firstLessonContent.ts` -- which describes restaurant scenarios unrelated to the Shorts videos.

The `FirstLesson.tsx` component only overrides `videoData` from the DB; exercises, speaking phrases, and flashcards always come from the hardcoded `content` object.

## Solution
Store exercises, speaking phrases, and flashcards alongside each onboarding video in the database, so all lesson content is tied to the actual video transcript.

### 1. Add content columns to `onboarding_videos` table
Add three JSONB columns:
- `exercises` — array of exercise objects
- `speaking_phrases` — array of speaking phrase objects  
- `flashcards` — array of flashcard objects

### 2. Populate all 4 English rows with transcript-based content
For each video, write exercises that directly reference what happens in the Short:

- **absolute_beginner** (`qHb8dJ9XmDk`) — needs transcript (will use video topic to write exercises)
- **beginner** (`ileoFbDsd8M`) — needs transcript
- **intermediate** (`Q42YLweHhWA`) — needs transcript
- **advanced** (`fC76H7GyIM4`) — transcript provided by user (Banksy mural story)

Since we only have the advanced transcript, I will write content for the advanced level based on the provided transcript, and for the other 3 levels I will write placeholder content noting we need actual transcripts. Alternatively, we can generate them via AI at migration time.

**Practical approach**: Store the advanced exercises now using the provided transcript. For the other 3 levels, update the migration to also store transcripts (which the user can provide later), and update `FirstLesson.tsx` to prefer DB content over hardcoded when available.

### 3. Update `FirstLesson.tsx` to use DB content
When an `onboarding_video` row is fetched and has `exercises`/`speaking_phrases`/`flashcards` populated, use those instead of the hardcoded fallback. The fallback in `firstLessonContent.ts` remains for when no DB data exists.

### 4. Update Supabase types
The `onboarding_videos` table type will gain the three new JSONB columns.

## Files changed
- **SQL migration**: Add `exercises`, `speaking_phrases`, `flashcards` JSONB columns + update the advanced English row with content based on the Banksy transcript
- **`src/pages/FirstLesson.tsx`**: When DB row has `exercises`/`speaking_phrases`/`flashcards`, use them instead of hardcoded content
- **`src/integrations/supabase/types.ts`**: Auto-updated with new columns

## Content for Advanced Level (Banksy transcript)
5 exercises, 3 speaking phrases, 5 flashcards -- all derived from the BBC journalist / Banksy mural story.

