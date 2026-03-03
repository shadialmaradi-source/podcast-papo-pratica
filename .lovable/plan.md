

# Plan: Re-populate English Onboarding Videos + Support YouTube Shorts

## What happened
The previous migration deleted all English rows from `onboarding_videos`. The user wants them restored with the original Shorts video IDs, and the player must visually adapt for vertical (9:16) Shorts.

## Changes

### 1. Re-insert English onboarding videos into database
Insert 4 rows into `onboarding_videos` with an additional `is_short` boolean column to flag vertical videos:

| Level | youtube_id | duration | suggested_speed | is_short |
|-------|-----------|----------|-----------------|----------|
| absolute_beginner | qHb8dJ9XmDk | 43 | 0.8 | true |
| beginner | ileoFbDsd8M | 60 | 1.0 | true |
| intermediate | Q42YLweHhWA | 52 | 1.0 | true |
| advanced | fC76H7GyIM4 | 60 | 1.2 | true |

The advanced level row will include the transcript the user provided.

### 2. Add `is_short` column to `onboarding_videos` table
A new boolean column `is_short` (default `false`) so the frontend knows to render a vertical player.

### 3. Adapt `LessonVideoPlayer.tsx` for Shorts
- Add `isShort` optional prop to `VideoData` interface
- When `isShort` is true, change the container from `aspect-video` (16:9) to a centered portrait container (9:16 aspect ratio, max height ~70vh)
- The YouTube IFrame API embeds Shorts fine using the regular `/embed/VIDEO_ID` URL — the previous failure was likely due to the `end` parameter cutting off the video or the `origin` issue (now fixed)

### 4. Pass `isShort` from `FirstLesson.tsx`
When fetching from `onboarding_videos`, read the `is_short` column and pass it through to the video player.

## Files changed
- **SQL migration**: Add `is_short` column + insert 4 English rows
- **`src/components/lesson/LessonVideoPlayer.tsx`**: Add `isShort` to interface, conditionally render portrait layout
- **`src/pages/FirstLesson.tsx`**: Pass `isShort` from DB data to player
- **`src/integrations/supabase/types.ts`**: Will auto-update with new column

