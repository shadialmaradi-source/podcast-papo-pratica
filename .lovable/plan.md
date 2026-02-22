

# Upgrade Learning Path Videos to Full Lesson Experience

## Overview

Currently, learning path videos (WeekVideo page) only show the YouTube embed, vocabulary tags, and a "Mark as Complete" button. Community videos have a full experience: transcript, exercises, speaking practice, and flashcards. This plan bridges that gap and adds premium gating.

## 3 Major Changes

### 1. Link Week Videos to the Community Video Pipeline

Each `week_video` needs a corresponding record in `youtube_videos` (the table that stores transcripts, exercises, flashcards). This enables reusing all existing components.

**Database migration:**
- Add `linked_video_id` (uuid, nullable) column to `week_videos` referencing `youtube_videos.id`
- Add `is_free` (boolean, default true) column to `week_videos` to mark free vs premium videos

**Data population (manual step by you):**
- For each week_video, you process the YouTube video through the existing pipeline (or we create a bulk-process edge function)
- This creates a `youtube_videos` record with transcript
- You then pre-load exercises into `youtube_exercises` for that video
- Update `week_videos.linked_video_id` to point to the created `youtube_videos.id`
- Set `is_free = false` on videos beyond the first 40% in each week

### 2. Redesign WeekVideo Page with Full Lesson Flow

Replace the current simple video page with the same step-by-step lesson flow used by community videos:

**Video + Transcript** (step 0) --> **Exercises** (step 1) --> **Speaking** (step 2) --> **Flashcards** (step 3) --> **Complete** (step 4)

Key differences from community flow:
- **No level selector**: Auto-selects "beginner" difficulty (since these are beginner-path videos)
- **Transcript**: Shows `LockedTranscript` for free users, full `TranscriptViewer` for premium
- **Premium gate**: Videos marked `is_free = false` show an upgrade prompt instead of the lesson
- After completion, navigates back to the week detail page instead of library

The page will reuse these existing components directly:
- `TranscriptViewer` / `LockedTranscript` for transcript
- `YouTubeExercises` for the exercise session (passing `linked_video_id`)
- `YouTubeSpeaking` for speaking practice
- `VideoFlashcards` for flashcard review
- `LessonCompleteScreen` for the final summary

### 3. Open All Weeks and Apply Premium Gating

**Remove week gating:**
- In `learningPathService.ts`: `getEffectiveWeekState()` always returns `in_progress` or `completed` (never `locked`)
- In `WeekDetail.tsx`: Remove sequential video unlock logic -- all free videos are accessible, premium videos show a lock icon with "Premium" label
- Remove `initializeWeek1Progress` auto-unlock (no longer needed)

**Apply 40% free rule:**
- In `WeekDetail.tsx`: Videos where `is_free = false` show a premium lock icon
- Clicking a premium-locked video navigates to `/premium` upgrade page
- The first ~40% of videos (by `order_in_week`) will have `is_free = true` in the database

---

## Technical Details

### Migration SQL

```sql
ALTER TABLE week_videos
  ADD COLUMN linked_video_id uuid REFERENCES youtube_videos(id),
  ADD COLUMN is_free boolean NOT NULL DEFAULT true;
```

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/WeekVideo.tsx` | Complete rewrite: add lesson flow states (video/transcript, exercises, speaking, flashcards, complete). Use `linked_video_id` to load transcript and pass to existing components. Auto-select beginner level. Show premium gate for non-free videos. |
| `src/pages/WeekDetail.tsx` | Remove sequential video unlock. Show premium lock on `is_free = false` videos. All videos visible, premium ones navigate to `/premium`. |
| `src/services/learningPathService.ts` | Remove `getEffectiveWeekState` locked logic (all weeks open). Remove sequential video unlock in `fetchWeekVideos`. Update `WeekVideoRow` type to include `linked_video_id` and `is_free`. |
| `src/components/library/LearningPath.tsx` | Remove `initializeWeek1Progress` call. All weeks show as `in_progress` or `completed`. |
| `src/components/library/WeekCard.tsx` | Remove locked state styling (all weeks are accessible). |

### No new components needed
All UI is composed from existing components (TranscriptViewer, LockedTranscript, YouTubeExercises, YouTubeSpeaking, VideoFlashcards, LessonCompleteScreen).

### Data Setup After Migration
You will need to:
1. Process each week_video's YouTube URL through the video pipeline to create `youtube_videos` records with transcripts
2. Pre-load exercises into `youtube_exercises` for each video
3. Run UPDATE queries to set `linked_video_id` on each `week_videos` row
4. Run UPDATE to set `is_free = false` on videos beyond position ~4 in each 9-video week (roughly 40%)

