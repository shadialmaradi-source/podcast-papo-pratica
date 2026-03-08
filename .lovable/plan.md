

# Plan: Remove Difficulty Badge from Community Videos + Fix Tooltip Mobile Responsiveness

## Changes

### 1. `src/components/library/VideoCard.tsx`
- Remove the difficulty level `Badge` (lines 151-153) that shows "Beginner"/"Intermediate"/"Advanced" in the bottom-right of community video cards
- Only show it for curated videos (`isCurated`) — or remove entirely since we'll work on labelling later. Simplest: hide it when `!isCurated`.

### 2. `src/components/library/LibraryTourTooltip.tsx`
The tooltip uses `w-64` (256px) fixed width and `left-1/2 -translate-x-1/2` centering, which causes it to overflow off-screen on mobile (as seen in screenshot — text is cut off on the right).

Fix:
- Change from `w-64 left-1/2 -translate-x-1/2` to a mobile-friendly approach: use `w-[calc(100vw-2rem)] max-w-64` and position with `left-0` or use fixed positioning
- Better approach: switch to **fixed positioning** at bottom of screen on mobile — a small toast-like banner that's always fully visible
- Simplest effective fix: change to `left-auto right-0` or use `w-[min(16rem,calc(100vw-3rem))]` with clamped positioning so it never overflows the viewport

**Chosen approach**: Make the tooltip use `fixed bottom-4 left-4 right-4 mx-auto max-w-sm` on mobile (< sm) and keep absolute positioning on desktop. This ensures it's always fully visible and readable on any screen size.

### Files to modify:
- `src/components/library/VideoCard.tsx` — hide difficulty badge for non-curated videos
- `src/components/library/LibraryTourTooltip.tsx` — make mobile-friendly with responsive positioning

