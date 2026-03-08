

# Plan: Add Keyboard Shortcuts to Teacher Lesson View

## Overview
Add keyboard shortcuts to `TeacherLesson.tsx` for rapid exercise navigation during live class, plus a shortcuts hint bar at the bottom.

## File to Modify: `src/pages/TeacherLesson.tsx`

### 1. Add `useEffect` keyboard listener
- Listen for `keydown` events on the document
- Skip if focus is inside an input/textarea (to avoid conflicts)
- **ArrowRight**: advance first non-last exercise group to next exercise
- **ArrowLeft**: go back in first non-first exercise group
- **Space**: toggle reveal on the first group that has exercises visible
- **R key**: reveal answer (set revealed = true) on first visible group
- **Escape**: no modals currently, but future-proof by doing nothing / could blur focus

The "first visible group" approach: since exercises are grouped by type and all shown on page, shortcuts will target the **first group that has exercises** (top-most). This is the simplest UX -- teacher scrolls to a section and uses arrow keys. To make it more precise, we'll track an `activeGroupType` state that defaults to the first group and updates when clicking any group's controls.

### 2. Add `activeGroupType` state
- Defaults to first exercise group type
- Updates whenever a group's Previous/Next/Reveal button is clicked
- Keyboard shortcuts operate on `activeGroupType` only
- Visual indicator: subtle left border highlight on the active group

### 3. Add shortcuts hint bar
- Fixed at bottom of the lesson view (below Complete button, sticky)
- Small, muted text: `← Previous · → Next · Space Reveal · R Reveal · Esc Close`
- Only shown when exercises exist
- Dismissible with a small × button (persisted in local state)

## No other files need changes.

