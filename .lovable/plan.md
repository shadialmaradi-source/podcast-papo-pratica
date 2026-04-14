

# Fix Build Errors + Scene Segmentation for All Videos

## Problem Analysis

### Build Errors (3 issues)
1. **`generate-speaking-topics/index.ts`**: The `serve` callback body has a `catch` block at line 106 but no matching `try`. Need to wrap the body in `try { ... }`.
2. **`CreateLessonForm.tsx`**: Imports `CommunityVideoMeta` from `useCreateLesson`, but that type doesn't exist there. Need to either add the export or remove the import.
3. **`LandingPage.tsx`**: Uses `FormEvent` without importing it from React. Fix: `React.FormEvent<HTMLFormElement>` or import `FormEvent`.

### Scene Segmentation Bug
Videos with `duration = NULL` in the database never get segmented. Root cause in `segment-video-scenes/index.ts` line 70:
```ts
const duration = videoData.duration || 0;  // NULL → 0
if (duration <= 120) { return "video_too_short" }  // 0 ≤ 120 → skipped!
```

12 videos in the library have NULL durations and are all being skipped. The fix: treat NULL duration as "unknown" (candidate for segmentation) rather than "zero".

## Plan

### 1. Fix `segment-video-scenes/index.ts` — NULL duration handling
- Change line 70-76: when `duration` is NULL, skip the "too short" check and proceed to segmentation. Only skip when duration is explicitly ≤ 120.

```ts
const duration = videoData.duration;
if (typeof duration === 'number' && duration > 0 && duration <= 120) {
  // genuinely short video
  return "video_too_short";
}
```

### 2. Fix `generate-speaking-topics/index.ts` — missing try block
- Wrap the body of the `serve` callback (lines 15–105) in a `try {` block so the existing `catch` at line 106 is valid.

### 3. Fix `CreateLessonForm.tsx` — remove or add `CommunityVideoMeta`
- Check what the form actually uses; likely need to define and export the type from `useCreateLesson.ts`, or remove the unused import.

### 4. Fix `LandingPage.tsx` — `FormEvent` type
- Change `FormEvent` to `React.FormEvent<HTMLFormElement>`.

### 5. Backfill durations (one-time edge function invocation)
- After deploying the fix, trigger the existing `backfill-video-durations` edge function to populate NULL durations for existing videos so future segmentation checks work correctly.

### Files changed

| File | Change |
|------|--------|
| `supabase/functions/segment-video-scenes/index.ts` | Treat NULL duration as segmentation candidate |
| `supabase/functions/generate-speaking-topics/index.ts` | Add missing `try {` block |
| `src/components/teacher/CreateLessonForm.tsx` | Fix `CommunityVideoMeta` import |
| `src/pages/LandingPage.tsx` | Fix `FormEvent` type reference |

