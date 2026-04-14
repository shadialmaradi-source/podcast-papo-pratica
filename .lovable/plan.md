

# Fix Scene Segmentation for Teacher Lessons + Sync Videos to Library

## Problem Analysis

### Issue 1: Teacher lessons play full video without scene splits
`TeacherLesson.tsx` renders a raw `<iframe>` embed of the full YouTube video. It never calls `segment-video-scenes` and has no scene navigation. The student self-study flow (`Lesson.tsx` + `useLessonFlow`) handles segmentation, but teacher-created lessons are a completely separate page with no scene awareness.

### Issue 2: Teacher-added videos don't appear in student library
When a teacher creates a YouTube lesson, the flow calls `extract-youtube-transcript` which only fetches the transcript text — it does NOT insert a record into `youtube_videos`. The function that creates `youtube_videos` records is `process-youtube-video`, which is only used by the student library upload flow. So teacher-added videos are invisible to the main library.

### Data evidence
Out of 10 teacher YouTube lessons queried, 8 have `yv_id = NULL` — meaning no corresponding `youtube_videos` record exists. Only 2 had matches because those videos happened to already exist in the library from a separate upload.

## Plan

### 1. Ensure teacher-created YouTube videos get inserted into `youtube_videos`

**File: `supabase/functions/extract-youtube-transcript/index.ts`**

After successfully fetching the transcript, upsert a record into `youtube_videos` with:
- `video_id` = the YouTube video ID
- `title` = fetched from YouTube oEmbed API (lightweight, no API key needed)
- `language` = from Supadata response (`data.lang`) or the language passed in the request body
- `difficulty_level` = passed from the caller (default `'beginner'`)
- `is_listed` = `true` (makes it visible in the student library)

Also upsert the transcript into `youtube_transcripts` so `segment-video-scenes` can find it later.

Use `ON CONFLICT (video_id) DO NOTHING` to avoid overwriting existing records.

**File: `src/hooks/useCreateLesson.ts`**

Pass the `language` field from the lesson form to `extract-youtube-transcript` so it can be stored in `youtube_videos`.

### 2. Add scene segmentation to the teacher lesson view

**File: `src/pages/TeacherLesson.tsx`**

After loading the lesson, if it's a YouTube lesson:
- Look up the `youtube_videos` record by the YouTube video ID extracted from `lesson.youtube_url`
- Call `segment-video-scenes` with that DB video ID
- Replace the plain `<iframe>` with the `LessonVideoPlayer` component (which supports `startTime`/`duration`)
- Add `SceneNavigator` sidebar to show scene list with titles
- Show the scene-specific transcript below each scene video

This reuses the existing components from `Lesson.tsx` rather than duplicating logic.

### 3. Backfill existing teacher videos into `youtube_videos`

**New migration SQL**

Insert into `youtube_videos` any YouTube video IDs from `teacher_lessons` that don't already have a `youtube_videos` record. Extract the 11-char video ID from the URL, set `is_listed = true`, and use the lesson's `language` field.

Also trigger transcript extraction for these videos so segmentation can work.

### Files changed

| File | Change |
|------|--------|
| `supabase/functions/extract-youtube-transcript/index.ts` | Upsert into `youtube_videos` + `youtube_transcripts` after transcript fetch |
| `src/hooks/useCreateLesson.ts` | Pass `language` to transcript extraction call |
| `src/pages/TeacherLesson.tsx` | Add scene segmentation, replace iframe with `LessonVideoPlayer` + `SceneNavigator` |
| New migration SQL | Backfill `youtube_videos` rows for existing teacher lesson YouTube URLs |

