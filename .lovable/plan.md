

# Fix: English Onboarding Videos Not Working

## Root Cause
The English onboarding videos stored in the `onboarding_videos` table are YouTube **Shorts** (vertical, < 60s videos). YouTube Shorts have unreliable embedding behavior with the standard IFrame Player API -- they often show a blank player or fail to fire state change events.

Confirmed:
- `qHb8dJ9XmDk` — YouTube Short, 43s (taxi conversation)
- `Q42YLweHhWA` — YouTube Short, 52s (children's story, wrong content)
- `ileoFbDsd8M`, `fC76H7GyIM4` — could not verify, likely also Shorts

Additionally, the `duration` column is set to 60 for all levels, which doesn't match actual video lengths.

## Fix

### 1. Add `origin` parameter to YT.Player (`LessonVideoPlayer.tsx`)
Add `origin: window.location.origin` to `playerVars`. This is required for the IFrame API to work correctly in embedded contexts and helps with Shorts embedding. Also add an `onError` handler that triggers the fallback immediately if the video fails to load.

### 2. Add error recovery to player
In the `events` config, add an `onError` callback that sets `canContinue = true` so users aren't permanently stuck if a video can't be embedded.

### 3. Update English video IDs in the database
Replace the YouTube Shorts with regular embeddable English learning videos. Update `youtube_id` and `duration` to match actual video lengths. This requires a SQL migration to update the 4 English rows in `onboarding_videos`.

## Technical Details

**`src/components/lesson/LessonVideoPlayer.tsx`** (~5 lines changed):
- Add `origin: window.location.origin` to `playerVars`
- Add `onError` event handler that calls `setCanContinue(true)` and `setProgress(100)` so users can skip broken videos

**SQL migration** — update `onboarding_videos` rows for English with working regular (non-Shorts) video IDs. The user will need to provide replacement video IDs, or we can fall back to the hardcoded `W1fKGyrmVKU` from `firstLessonContent.ts` by clearing the DB rows.

