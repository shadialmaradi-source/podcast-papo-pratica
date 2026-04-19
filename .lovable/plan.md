

## Root cause

In `src/components/FlashcardRepository.tsx` (line 452-455), the video card click handler does:
```ts
onClick={() => {
  setFilter(group.video_id);   // schedules state update (async)
  startStudySession(false);    // runs NOW with stale `filter`
}}
```

`startStudySession` calls `getFilteredFlashcards()` which closes over the current `filter` state. Because React batches state updates, `filter` is still the previous value when `startStudySession` runs — so the cards shown belong to whatever was previously selected ("all" by default on first click, hence cards from a different video appear). On the second click, `filter` has already been set to that video, so it works.

## Fix

Pass the target video ID directly into `startStudySession` instead of relying on state. One small refactor in `FlashcardRepository.tsx`:

1. Make `getFilteredFlashcards` accept an optional `filterOverride` parameter; when provided, use it instead of the `filter` state.
2. Make `startStudySession` accept an optional `filterOverride` and forward it.
3. In the video card `onClick`, call `startStudySession(false, group.video_id)` and still call `setFilter(group.video_id)` so the dropdown UI reflects the selection for next time.

Effective change (concept):
```ts
const getFilteredFlashcards = (filterOverride?: string) => {
  const activeFilter = filterOverride ?? filter;
  // ...use activeFilter instead of filter
};

const startStudySession = (shuffle = false, filterOverride?: string) => {
  const filtered = getFilteredFlashcards(filterOverride);
  // ...rest unchanged
};

onClick={() => {
  setFilter(group.video_id);
  startStudySession(false, group.video_id);
}}
```

No other call sites change behavior (they pass no override → use `filter` state as before). No DB / edge function / prop changes.

## Files touched

- `src/components/FlashcardRepository.tsx` — pass an explicit filter override through `startStudySession` → `getFilteredFlashcards` so the first click on a video card studies that video's cards immediately.

