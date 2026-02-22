

# Fix: Learning Path Videos Not Showing Transcript/Exercises

## The Problem

You added a transcript for this video, but the page still shows the simple fallback view (video + vocabulary + complete button). This happens because:

1. The `linked_video_id` column on `week_videos` is `NULL` for this video
2. The current code only shows the full lesson flow (transcript, exercises, speaking, flashcards) when `linked_video_id` points to a `youtube_videos` record
3. There is no `youtube_videos` record for this YouTube video (`O_xXC26Nm7Y`)

## The Fix

Instead of requiring the full `youtube_videos` pipeline, modify `WeekVideo.tsx` to support a **hybrid mode**: show the full lesson flow using data directly from `week_videos` when `linked_video_id` is not set but transcript data exists.

### Changes

**`src/pages/WeekVideo.tsx`** -- Update the lesson flow logic:

- Remove the `hasLinkedVideo` gate that currently decides between full flow vs. simple fallback
- When `linked_video_id` exists: use `YouTubeVideoExercises` component as today (fetches from `youtube_videos`)
- When `linked_video_id` is NULL but `video.transcript` exists: show an inline video player with the transcript rendered directly below it, using `week_videos.transcript` text
- The "video" step shows the YouTube embed plus transcript (from `week_videos.transcript`)
- The "exercises" step still uses `YouTubeExercises` but only if `linked_video_id` is set; otherwise skip to speaking or complete
- Steps that require `linked_video_id` (exercises, speaking, flashcards) are conditionally skipped when there is no linked video -- the flow becomes: video+transcript then complete

**`src/pages/WeekVideo.tsx`** -- Add inline transcript display:

- When `video.transcript` is available and no `linked_video_id`, render the transcript text below the video player in a scrollable card
- Use the existing premium gating: free users see a truncated/locked version, premium users see the full text
- After watching, user can "Mark as Complete" to earn XP

### What This Means For You

- **Right now**: Add the transcript text directly to the `week_videos.transcript` column for each video in your Supabase dashboard. The video page will immediately show the transcript below the video.
- **Later**: When you process videos through the full pipeline and set `linked_video_id`, the page will automatically upgrade to the full experience with exercises, speaking, and flashcards.
- No need to create `youtube_videos` records manually for transcripts to work.

### Technical Details

Files to modify:
- `src/pages/WeekVideo.tsx` -- Add a new "inline transcript" branch when `linked_video_id` is null but `transcript` exists. Render video embed + transcript text + complete button. Keep existing full-flow logic for when `linked_video_id` is set.

The transcript column already exists on `week_videos` -- no database migration needed.

