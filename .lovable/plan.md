

# Fix: Use "beginner" Difficulty Consistently

## Problem

The exercises are stored with `difficulty: 'A1'` but the UI queries for `difficulty: 'beginner'`. Instead of changing the UI, we change the edge function to store exercises with `difficulty: 'beginner'`.

## Changes

### 1. `supabase/functions/setup-week-video-exercises/index.ts`

In the `generateExercises` function, change the difficulty value from `'A1'` to `'beginner'` when mapping AI-generated exercises to database rows (around line 178):

```
difficulty: 'A1',
```
becomes:
```
difficulty: 'beginner',
```

Also update the `generateBasicExercises` fallback function to use `'beginner'` instead of the `['A1', 'A2', 'B1', 'B2']` array -- replace with `['beginner']` so fallback exercises also match.

### 2. Fix the Authentication Fallback in `src/components/YouTubeExercises.tsx`

Add a fallback in the `loadExercises` function: if the RPC call `get_youtube_exercises_with_answers` fails with "Authentication required", query the `youtube_exercises` table directly. This ensures exercises load even when the auth token is not forwarded to the RPC function.

### 3. Delete Old Exercises

Since exercises were already generated with `difficulty: 'A1'` for this video, those old rows will not match the `'beginner'` query. You will need to either:
- Delete the old exercises from the Supabase dashboard (table `youtube_exercises`, filter by the video ID)
- Or click "Start Exercises" on a video that has not yet had exercises generated

### Deployment

The `setup-week-video-exercises` edge function will need to be redeployed after the change.

