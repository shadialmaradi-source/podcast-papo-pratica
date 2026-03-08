

# Plan: Hide Level Selector on Community Tab + Update Length Filters

## Changes

### 1. `src/pages/Library.tsx`
- **Hide LevelSelector when Community tab is active**: Wrap the sticky level selector div with a condition `activeTab === 'curated'` so it only shows on Learning Path.
- **Remove level filtering for community videos**: In the `filteredVideos` memo, skip `levelMatch` when `activeTab === 'community'` so all community videos show regardless of level.

### 2. `src/components/library/FilterBar.tsx`
- **Replace length options** with two choices:
  - `short` → "Short Video" (≤ 60 seconds — Shorts/TikTok style, 9:16 format)
  - `long` → "Long Video" (> 60 seconds — classical videos)
- Update the `lengths` array and labels accordingly.

### 3. `src/pages/Library.tsx` (filter logic)
- Update the `filteredVideos` length switch to match the new `short`/`long` keys:
  - `short`: duration ≤ 60
  - `long`: duration > 60

### Files to modify:
- `src/pages/Library.tsx` — conditionally hide LevelSelector, update filter logic
- `src/components/library/FilterBar.tsx` — update length filter options

