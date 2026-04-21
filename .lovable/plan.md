

## Root cause

The library tour replays whenever the user revisits `/library` before reaching step 4. The completion flag (`library_tour_completed` in `localStorage`) is only written inside `advanceTour` when `next > 4` (Library.tsx line 114-115). So if the user:

- closes the browser / navigates away mid-tour
- reloads the page during any of the 4 steps
- dismisses a tooltip via the X (which fires the same auto-advance, but if they reload before reaching step 4)

…the flag never gets set and the tour starts again from step 1 on the next visit.

`useStudentTour` resolves the initial phase from those same localStorage keys, so the same root cause affects the whole student tour pattern, but the visible bug today is the library step the user is seeing.

## Fix

Mark the library tour as completed **as soon as it is shown for the first time**, instead of waiting for the user to reach step 4. This guarantees a single appearance per browser, regardless of whether the user finishes the steps or not.

In `src/pages/Library.tsx`:

1. Add a `useEffect` that runs once when `tourPhase === 'library'` and `tourStep` is set to 1: write `localStorage.setItem('library_tour_completed', 'true')` immediately.
2. Keep the existing in-memory `tourStep` flow so the tooltips still auto-advance for users who stay on the page — only the persistence timing changes.
3. Leave `advanceTour` as-is for the `advanceTourPhase()` hand-off at the end (it becomes a no-op for the localStorage write, which is fine).

Effective change (concept):
```ts
useEffect(() => {
  if (tourPhase === 'library' && tourStep === 1) {
    localStorage.setItem('library_tour_completed', 'true');
  }
}, [tourPhase, tourStep]);
```

No changes to `useStudentTour`, `LibraryTourTooltip`, or any other tour phase. The home and transcript tours already follow the same "mark on first show" pattern via their own keys, so this aligns library with them.

## Files touched

- `src/pages/Library.tsx` — write `library_tour_completed=true` the first time the library tour renders, so it never replays on subsequent visits.

