## Why the transcript is missing

For lesson `6fe2cc3d…`:
- `teacher_lessons.transcript` is `NULL`
- The video `a1ZiLZA3v0I` **does** have a transcript stored in `youtube_transcripts` (189 chars, English)
- The TeacherLesson page only renders the transcript if `lesson.transcript` is truthy:
  ```ts
  {lesson.transcript && (<TranscriptViewer transcript={lesson.transcript} ... />)}
  ```
- The only code path that writes to `teacher_lessons.transcript` is the `generate-lesson-exercises-by-type` edge function — i.e. the column is filled only **after** the teacher clicks one of the four "Generate Exercises" buttons. In the screenshot, no exercises have been generated yet, so the field stays null and the section is hidden.

So the bug is: the teacher creates a YouTube lesson and lands on the page, but the transcript only appears after they generate at least one exercise — even though we already have the transcript on hand (or can fetch it).

## Fix

Make the transcript appear as soon as the lesson is opened, regardless of exercise generation.

### Step 1 — Backfill on lesson open (TeacherLesson.tsx)

In the existing `fetchScenes` / lesson-load effect, when `lesson.transcript` is null and we have a `youtube_url`:

1. Look up the matching `youtube_videos` row by `video_id` (already done for scenes — reuse that result).
2. Fetch `youtube_transcripts.transcript` for that `video_id` (DB id).
3. If found, render it via `<TranscriptViewer>` and persist it back to `teacher_lessons.transcript` via an `update()` so future loads are instant and other code paths see it.

This handles the case of this lesson immediately (transcript already exists in `youtube_transcripts`).

### Step 2 — Fallback: extract on demand

If no `youtube_transcripts` row exists yet (new video the teacher just added), invoke the existing `extract-youtube-transcript` edge function with `{ videoUrl, teacherId, language }`, then re-fetch and persist as in Step 1. Show a small "Loading transcript…" skeleton above the exercise buttons while this runs.

### Step 3 — Defensive UI

- While loading: show a one-line skeleton in place of the transcript card.
- On failure: show a small muted note "Transcript unavailable for this video" instead of silently hiding the section, so teachers know why.

## Files to change

- `src/pages/TeacherLesson.tsx` — add transcript backfill logic in the lesson-load effect; update the render block around line 724 to handle loading / fallback states.

No DB migration needed. No new edge function needed (reusing `extract-youtube-transcript`).

## After the fix

For the current lesson, the transcript stored in `youtube_transcripts` (189 chars) will be loaded and shown immediately under the video, and `teacher_lessons.transcript` will be backfilled on first open.
