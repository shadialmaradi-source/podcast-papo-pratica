

# Plan: Fix Short/Long Video Classification

## Problem
The Short Video filter doesn't work because it relies on `duration <= 60`, but YouTube Shorts can be longer than 60 seconds. There's no `is_short` field on `youtube_videos` — it only exists on `onboarding_videos`. The system needs to detect Shorts at import time based on the URL format (`youtube.com/shorts/...`).

## Changes

### 1. Add `is_short` column to `youtube_videos` table
- Create a new migration adding `is_short boolean default false` to the `youtube_videos` table.

### 2. `supabase/functions/process-youtube-video/index.ts`
- Detect if the original URL contains `/shorts/` and pass `is_short: true` when inserting the video record (line ~121-133).
- The `extractVideoId` function already handles `/shorts/` URLs — we just need to capture a flag before extracting.

### 3. `src/pages/Library.tsx` — Update filter logic
- Change the length filter from duration-based to use `is_short`:
  - `short`: `video.is_short === true`
  - `long`: `video.is_short !== true` (or `!video.is_short`)
- This replaces the `duration <= 60` / `duration > 60` logic.

### 4. `src/integrations/supabase/types.ts`
- Add `is_short` field to the `youtube_videos` Row/Insert/Update types.

### 5. Backfill existing data
- Update the existing short video in the DB. Since only one video is a Short (the one in the screenshot), we can identify it by its short duration or URL pattern and set `is_short = true` via a migration.

## Files to modify:
- `supabase/functions/process-youtube-video/index.ts` — detect Shorts URL, set `is_short`
- `src/pages/Library.tsx` — filter by `is_short` instead of duration
- `src/integrations/supabase/types.ts` — add `is_short` to youtube_videos type
- New migration file for adding the column + backfilling

