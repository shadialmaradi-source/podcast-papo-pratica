
I understand the regression and I know why it still happens.

Do I know what the issue is? Yes.

Root cause (combined):
1) `Lesson.tsx` currently sends short/unsegmented videos directly to `exercises` (skipping video view).
2) `YouTubeExercises.tsx` only auto-generates when `sceneId && sceneTranscript`; for non-segmented videos it only reads DB. If exercises do not already exist, it fails with “No exercises found in database”.
3) On desktop scene pages, `TranscriptViewer` auto-scroll calls `scrollIntoView` and can move the page to transcript, so users land below the video.

Implementation plan

1) Fix exercise generation reliability in `src/components/YouTubeExercises.tsx`
- Refactor load flow to:
  - Try fetch from RPC first.
  - If empty, invoke `generate-level-exercises`.
  - Re-fetch after generation.
- For scene lessons:
  - Attempt scene fetch/generation first.
  - If still empty, fallback to full-video fetch.
  - If still empty, trigger full-video generation then fetch again.
- Remove strict `sceneId && sceneTranscript` gate; use `sceneId` alone so backend can fallback to DB transcript.
- Handle `invoke` errors explicitly (`error` and `data?.error`) and surface precise messages.
- Use `.maybeSingle()` where “not found” is valid during lookup fallback.

2) Ensure lesson always starts on video in `src/pages/Lesson.tsx`
- In `trySegmentVideo`:
  - For short videos (`duration <= 120`) set `lessonState` to `"scene-video"` (not `"exercises"`), with `isSegmented=false`.
  - If segmentation fails/returns empty scenes, also fallback to `"scene-video"` full-video mode.
- Add `videoDuration` state from resolved video metadata and use it in non-segmented `LessonVideoPlayer` (replace hardcoded 120).

3) Fix “landing on transcript” behavior
- `src/components/transcript/TranscriptViewer.tsx`:
  - Initialize auto-scroll only when player sync exists (e.g., `onSeek` is provided).
  - Guard the `scrollIntoView` effect so static transcript mode does not auto-jump page.
- `src/pages/Lesson.tsx`:
  - On entering `"scene-video"` (and scene change), force page top so user sees video first.

4) Validation with your exact problematic routes
- `/lesson/3687013a-2202-471b-ad50-b72903badba6` should now auto-generate instead of failing.
- `/lesson/ae470e18-6791-4850-8727-88396e3d96f8` should be deterministic (no random missing/working).
- `/lesson/a074834d-c8c3-4cc0-8345-2ab9ac53bbb0` should generate reliably.
- `/lesson/209e8e79-c197-4716-a56c-4427dec62e74` should start on video first, then exercises.

Technical details

```text
Lesson load
  -> resolve video + level
  -> try segment
     -> segmented: scene-video (scene 1)
     -> not segmented or segmentation error: scene-video (full video)
  -> continue -> exercises
     -> fetch RPC
     -> if empty: generate -> refetch
     -> if scene and still empty: fallback full-video generate -> refetch
```

Files to update
- `src/components/YouTubeExercises.tsx`
- `src/pages/Lesson.tsx`
- `src/components/transcript/TranscriptViewer.tsx`
