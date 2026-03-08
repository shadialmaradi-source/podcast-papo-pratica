

# Plan: Library Onboarding Tooltips (First-Time Guided Tour)

## Overview
Add a sequential tooltip/popover tour for first-time library visitors, explaining the key sections: Curated tab (renamed to "Learning Path"), Community tab, Add Video card, and video cards.

## Design
- Use localStorage key `library_tour_completed` to trigger only once
- 4-step sequential tooltips with auto-dismiss after 3 seconds + manual X close
- Each tooltip points to its target element with a brief explanation
- Steps:
  1. **Curated tab** → "This is your Learning Path — a structured series of lessons curated by level to guide your progress step by step."
  2. **Community tab** → "Explore videos added by other learners, or add your own!"
  3. (Auto-switch to Community tab) **Add Video card** → "Paste any YouTube link to create a personalized lesson with exercises and flashcards."
  4. **First video card** → "Tap any video to start a lesson with transcript, exercises, and speaking practice."

## Rename
- Change "Curated" tab label → "Learning Path" across `Library.tsx`

## Implementation

### `src/pages/Library.tsx`
1. Add `tourStep` state (0–4, where 0 = not started, 1–4 = active steps, null = done)
2. On mount, check `localStorage.getItem('library_tour_completed')` — if not set, start tour at step 1
3. Each step renders a small absolutely-positioned tooltip near the target element using a ref or relative positioning
4. Each tooltip has a 3-second `setTimeout` to auto-advance + X button to advance immediately
5. Step 2→3 transition auto-switches `activeTab` to `'community'`
6. After step 4, set `localStorage.setItem('library_tour_completed', 'true')`
7. Rename "Curated" → "Learning Path" in TabsTrigger

### New component: `src/components/library/LibraryTourTooltip.tsx`
- Reusable tooltip component: accepts `message`, `onClose`, `position` (top/bottom/left/right), `autoCloseMs` (default 3000)
- Renders a small card with text + X button, positioned relative to parent
- Uses `useEffect` with setTimeout for auto-close

### Files to modify:
- `src/pages/Library.tsx` — tour logic, rename tab, attach refs to tour targets
- `src/components/library/LibraryTourTooltip.tsx` — new component

