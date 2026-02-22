# Fix: Show "Start Exercises" Button and Add A1-A2 Exercise Types

## Problem

The "Start Exercises" button is missing because it's hidden when either:

- The user is not premium (`isPremium` check)
- The video is already completed (`!isCompleted` check)

Since you already completed this video, the button disappears. Also, the exercise generation prompt needs updating for A1-A2 learning path content. . Even if the video is completed the exercise should appear, moreover i double check with a non premium and there is no button

## Changes

### 1. Always Show "Start Exercises" Button (`src/pages/WeekVideo.tsx`)

- Remove the `isPremium && !isCompleted` gate on the "Start Exercises" button
- Show the button for all authenticated users, even after completion (so they can redo exercises)
- Keep the "Already completed" card but add the exercises button above it

### 2. Update Exercise Generation for A1-A2 Content (`supabase/functions/setup-week-video-exercises/index.ts`)

Update the AI prompt to generate the 3 specific exercise types you described:

-  **Vocabulary Matching** (5 items): Match words from the video to descriptions/definitions. Uses basic nouns, colors, numbers, common verbs.
- **Listen and Repeat** (5 items): Single words or short phrases with phonetic pronunciation guides. Words taken directly from the video.
- **Audio Flashcards** (5 cards): Word on front, translation + pronunciation on back. Concrete nouns from the video.

it should take a similar and consistent pattern to the community structure video but instead of the questions is going ot be  vocabulary matching

The prompt will be tailored specifically for A1-A2 beginner learners rather than generating exercises for all levels (A1 through B2). Only beginner-level exercises will be generated since this is the learning path module.

### 3. Reduce Exercise Generation Scope

Currently the edge function generates exercises for 4 difficulty levels x 2 intensities = 8 AI calls per video. For learning path videos (which are A1-A2), reduce to a single AI call with the 15 exercises (5 matching + 5 listen-and-repeat + 5 flashcards).

## Technical Details

### File: `src/pages/WeekVideo.tsx`

Change line 418 from:

```
{isPremium && !isCompleted && (
```

to:

```
{user && (
```

This makes the button visible for all logged-in users regardless of premium status or completion state.

### File: `supabase/functions/setup-week-video-exercises/index.ts`

Replace the `generateExercises` function's AI prompt to request:

```
Create an English learning lesson based on this transcript for A1-A2 beginners:

1. Visual Vocabulary Matching (5 items):
   - Match simple words from the video to pictures/definitions
   - Use basic nouns, colors, numbers, or common verbs

2. Listen and Repeat Exercises (5 items):
   - Single words or very short phrases
   - Each with phonetic pronunciation guide
   - Use words from the video

3. Audio Flashcards (5 cards):
   - Word on front
   - Translation + pronunciation on back
   - Simple, concrete nouns from the video
```

The exercise types stored will be:

- `visual_vocabulary_matching`
- `listen_and_repeat`
- `audio_flashcard`

Generate only for difficulty `A1` and intensity `intense` (single batch of 15 exercises instead of 8 batches).

### Deployment

The `setup-week-video-exercises` edge function will need to be redeployed after updating.