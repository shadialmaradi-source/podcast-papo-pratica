

# Auto-Progress Between Exercise Types + Collapsible Sections

## Problem
When a teacher finishes all exercises of one type (e.g., Fill in the Blank 10/10), the "Next" button is disabled with no nudge to move to the next exercise type. The next type's exercises appear below and require scrolling to notice. There's no way to collapse/expand completed sections.

## Solution

Two changes to `src/components/teacher/CreateLessonForm.tsx`:

### 1. Add active/collapsed group state
- Add `activeGroup` state tracking which exercise type is currently expanded (only one at a time)
- When exercises of a type are generated, that type becomes `activeGroup`
- Previously completed groups collapse to a single clickable header row showing the badge + "10/10 ✓"
- Clicking a collapsed header re-expands it (and collapses the current active one)

### 2. Replace disabled "Next" on last exercise with "Continue to [Next Type]" button
- When `isLast` is true for the current group, check if there's a next ungenerated type in `selectedExerciseTypes`
- If the next type is **not yet generated**: show a "Generate [Quiz] →" button that triggers `handleGenerateByType(nextType)` and auto-sets `activeGroup` to the new type
- If the next type **is already generated**: show "Continue to [Quiz] →" that just switches `activeGroup`
- Auto-scroll to the active section using a ref + `scrollIntoView`

### 3. Update ExercisePresenter.tsx with same pattern
Apply the same collapsible + auto-progress logic to `ExercisePresenter.tsx` for the student/teacher lesson view.

### Implementation detail

```text
State additions:
  activeGroup: string | null  (defaults to first generated type)

Collapsed group = just the header row (badge + count + click to expand)
Expanded group  = current full card + controls

"Next" button on last exercise →
  if nextType not generated: "Generate Quiz →" (calls handleGenerateByType, sets activeGroup)  
  if nextType already generated: "Continue to Quiz →" (sets activeGroup)
  if no next type: disabled "Next" as before
```

**Files to edit:**
- `src/components/teacher/CreateLessonForm.tsx` — add `activeGroup` state, collapsible sections, auto-progress button
- `src/components/teacher/ExercisePresenter.tsx` — same collapsible + auto-progress pattern

