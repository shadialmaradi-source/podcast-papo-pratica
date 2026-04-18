

## Root cause

`TranscriptViewer` is rendered for teacher lessons with `videoId={lesson.id}` (the `teacher_lessons.id`) and also `sourceLessonId={lesson.id}`. Inside the component (line 555):

```ts
videoId={flashcardVideoId ?? videoId}
```

So the modal forwards the lesson's UUID as `videoId` to `createFlashcardFromTranscript`, which inserts it into `user_created_flashcards.video_id`. That column has a FK to `youtube_videos(id)` — the lesson UUID does not exist there → `user_created_flashcards_video_id_fkey` violation (the toast in screenshot 2).

The DB schema is correct now (lesson source is supported via `source_lesson_id`); the bug is purely client-side: the wrong identifier is being passed into the `video_id` slot.

## Fix

Single targeted change in `src/components/transcript/TranscriptViewer.tsx` (line 555 area):

When `sourceLessonId` is set, **do not** pass any `videoId` to `FlashcardCreatorModal` (it should be `undefined`), so the insert only sets `source_lesson_id` and leaves `video_id` null. The CHECK constraint (`video_id IS NOT NULL OR source_lesson_id IS NOT NULL`) is satisfied; the FK is not violated.

Effective logic:
```ts
videoId={flashcardVideoId ?? (sourceLessonId ? undefined : videoId)}
```

Also pass `sourceLessonId` through unchanged (already done).

No other call sites need changes:
- `StudentLesson.tsx` already passes `sourceLessonId={lesson.id}` → covered by the fix.
- `TeacherLesson.tsx` already passes `sourceLessonId={lesson.id}` → covered.
- `LessonPostCreationView.tsx` already passes `sourceLessonId={createdLessonId}` → covered.
- `Lesson.tsx` and `YouTubeVideoExercises.tsx` use real `youtube_videos.id` as `videoId` and no `sourceLessonId` → unchanged behavior.

No DB migration. No edge-function change. No prop signature change.

## Files touched

- `src/components/transcript/TranscriptViewer.tsx` — one-line guard so lesson contexts never put the lesson UUID into `video_id`.

