

# Fix: "No transcript available" error when generating exercises

## Root Cause
The `handleStartExercises` function in `YouTubeVideoExercises.tsx` re-queries the `youtube_transcripts` table when the user clicks a difficulty level. By that point, the auth session can be stale (anon key used instead of user JWT), causing RLS to return 0 rows.

The transcript is **already loaded** into component state (`transcript`) during `loadVideoData`. There's no need to query it again.

## Changes

### `src/components/YouTubeVideoExercises.tsx`
- In `handleStartExercises` (lines 323-334): Remove the redundant `youtube_transcripts` query. Instead, use the `transcript` state variable that was already loaded.
- Keep the null/empty check but reference `transcript` (the state) instead of querying the DB again.
- Also add a secondary RLS issue fix: the `youtube_exercises` delete at lines 317-321 uses the anon/user client but the table only has a `service_role` RLS policy. Move the delete responsibility to the edge function (which already uses `service_role`) or skip it client-side since the edge function already checks for existing exercises.

### Summary of line changes
1. **Lines 317-321**: Remove the client-side delete of `youtube_exercises` (will fail silently due to RLS anyway — only `service_role` can access that table).
2. **Lines 323-334**: Replace the DB transcript query with a check on the existing `transcript` state variable.
3. **Pass transcript from state** to the edge function call at line 362.

