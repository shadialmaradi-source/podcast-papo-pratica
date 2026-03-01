

# Store Onboarding Videos in Supabase + Connect Exercises to Transcripts

## Overview
Move onboarding video data from hardcoded `firstLessonContent.ts` to a Supabase table so you can add/edit transcripts directly. Replace the English videos with your 4 YouTube Shorts. Make the speed selector functional and generate exercises from the transcript.

## Changes

### 1. Create `onboarding_videos` table in Supabase
New table with columns:
- `id` (uuid, PK)
- `language` (text) — e.g. "english", "spanish"
- `level` (text) — "absolute_beginner", "beginner", "intermediate", "advanced"
- `youtube_id` (text) — the video ID
- `start_time` (integer, default 0)
- `duration` (integer) — video length in seconds
- `suggested_speed` (numeric, default 1.0)
- `transcript` (text, nullable) — you'll fill this in later
- `created_at` (timestamptz)

RLS: public read access (no auth required for onboarding).

Insert the 4 English videos immediately:

| Level | YouTube ID |
|-------|-----------|
| absolute_beginner | qHb8dJ9XmDk |
| beginner | ileoFbDsd8M |
| intermediate | Q42YLweHhWA |
| advanced | fC76H7GyIM4 |

The table name will be **`onboarding_videos`** — you can go to the Supabase table editor to add the transcript text for each video.

### 2. Update `FirstLesson.tsx` to fetch from Supabase
Instead of reading from `allLessonContent`, fetch the video row from `onboarding_videos` matching the user's selected language + level. The transcript field drives exercise generation.

### 3. Make speed selector functional
The current `LessonVideoPlayer` has a speed `Select` but doesn't actually apply it to the YouTube embed. Update to use the YouTube IFrame Player API (via `postMessage`) so changing speed actually changes playback rate.

### 4. Generate exercises from transcript
After the video step, if the transcript exists, call the existing `generate-exercises-from-transcript` edge function (or a new lightweight one) to create exercises based on the transcript content. This replaces the hardcoded exercises for the onboarding flow.

If no transcript is set yet, fall back to the hardcoded exercises so the flow doesn't break.

### 5. Keep hardcoded content as fallback
The `firstLessonContent.ts` data remains as fallback. When an `onboarding_videos` row has a transcript, exercises are generated dynamically from it. When it doesn't, the hardcoded exercises/flashcards are used.

### File Summary
| File | Action |
|------|--------|
| Supabase migration | Create `onboarding_videos` table + insert 4 English rows |
| `src/pages/FirstLesson.tsx` | Fetch video from Supabase, pass to player |
| `src/components/lesson/LessonVideoPlayer.tsx` | Make speed selector functional via YouTube API |
| `src/components/lesson/LessonExercises.tsx` | Support dynamically generated exercises from transcript |

