

# Tutorial Popup Stabilization — 3 Files

## 1. `src/pages/Library.tsx` — Phase-gated tour initialization

**Problem (lines 99-103)**: Tour starts if phase is `"library"` OR if legacy `library_tour_completed` key is missing. This bypasses the phase system and can show the library tour before the home phase completes.

**Fix**: Initialize `tourStep` only when `tourPhase === 'library'`, remove the legacy fallback. Add an effect to sync `tourStep` when `tourPhase` changes (entering library phase → step 1, leaving → null).

```tsx
// Line 99-103: Replace initializer
const [tourStep, setTourStep] = useState<number | null>(
  () => tourPhase === 'library' ? 1 : null
);

// New effect: sync tour with phase changes
useEffect(() => {
  setTourStep(tourPhase === 'library' ? 1 : null);
}, [tourPhase]);
```

No other changes in Library.tsx. The `advanceTour` callback already writes `library_tour_completed` and calls `advanceTourPhase()` on completion — that stays.

---

## 2. `src/components/library/LibraryTourTooltip.tsx` — Less obstructive mobile positioning

**Problem (line 36)**: Mobile uses `fixed top-4` which covers the header/unrelated UI.

**Fix**: Change mobile positioning from `fixed top-4` to `absolute` with bottom-anchored placement, keeping it near its parent element on all viewports. Remove the fixed mobile override entirely — use relative/absolute positioning consistently.

```tsx
// Line 36: Replace className
className="absolute left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-sm z-[60] sm:w-64 top-full mt-3"
```

This makes the tooltip always appear below its parent `<div className="relative">` wrapper, on both mobile and desktop. No fixed overlay.

---

## 3. `src/hooks/useStudentTour.tsx` — No changes needed

The existing phase model is correct. Library.tsx was the only file bypassing it via the legacy fallback. Fix #1 resolves this.

## 4. `src/pages/AppHome.tsx` — No changes needed

The home → library progression wiring (lines 67-68, 169-176) already correctly gates hints on `tourPhase === "home"` and calls `advanceTourPhase()` on dismiss. No fix needed.

---

## Summary

| File | Change |
|------|--------|
| `Library.tsx` | Lines 99-103: Remove legacy fallback; add phase-sync effect |
| `LibraryTourTooltip.tsx` | Line 36: Use absolute positioning instead of fixed top overlay |

2 files changed, minimal edits, no architecture redesign.

