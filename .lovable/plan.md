

# Plan: Unified Student Onboarding Tour

## Problem

Three independent tooltip/tour systems exist for students, each triggered by separate localStorage flags with no coordination:

1. **Home hints** (`has_seen_home_hints`) — explains Library vs Own Video cards
2. **Library tour** (`library_tour_completed`) — 4-step tour of Learning Path + Community tabs
3. **Transcript tutorial** (`transcript_tutorial_completed`) — 7-step word exploration + flashcard flow

A first-time student may skip or miss some, or see them in random order. We need a single orchestrated flow that guarantees every feature is shown in logical sequence.

## Solution

Create a **Student Tour Manager** — a lightweight orchestration layer that tracks which phase the student is in and ensures they flow through all three tours in order. After the onboarding (language/level selection + first lesson), the student arrives at AppHome and the unified tour begins.

### Flow

```text
Onboarding (language/level) → First Lesson → AppHome
                                                │
                                    ┌───────────┴───────────┐
                                    │  Phase 1: Home Hints   │
                                    │  (Library vs Own Video) │
                                    └───────────┬───────────┘
                                                │ click "Library"
                                    ┌───────────┴───────────┐
                                    │  Phase 2: Library Tour │
                                    │  (4-step LP/Community) │
                                    └───────────┬───────────┘
                                                │ click a video
                                    ┌───────────┴───────────┐
                                    │  Phase 3: Transcript   │
                                    │  Tutorial (7-step)     │
                                    └───────────────────────┘
```

### Implementation

**New hook: `useStudentTour.ts`**
- Single localStorage key: `student_tour_phase` with values `home` | `library` | `transcript` | `completed`
- Initialized to `home` when all three legacy keys are absent (fresh user)
- Exposes `{ phase, advancePhase, isActive }` 
- When a phase completes, it sets the corresponding legacy localStorage key (backward compat) AND advances to next phase
- Provided via React context so all three pages can read/write

**Modified: `AppHome.tsx`**
- Instead of checking `has_seen_home_hints` directly, use `useStudentTour`
- When hints are dismissed (or user clicks Library), call `advancePhase()` which moves to `library`
- Auto-navigate to `/library` after home hints phase so the tour continues

**Modified: `Library.tsx`**
- Read tour phase from `useStudentTour`; only show library tour if phase is `library`
- On tour completion, `advancePhase()` moves to `transcript`
- After library tour ends, auto-prompt user to pick a video (highlight first video card)

**Modified: `YouTubeVideoExercises.tsx`**
- Read tour phase; only trigger transcript tutorial if phase is `transcript`
- On tutorial complete/skip, `advancePhase()` sets phase to `completed`

**Modified: `App.tsx`**
- Wrap student routes with `StudentTourProvider`

### Backward Compatibility
- If any legacy localStorage key already exists, mark that phase as done
- Existing users who completed some tours won't re-see them

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useStudentTour.tsx` | New — context + hook for tour phase management |
| `src/pages/AppHome.tsx` | Use tour context; auto-advance to library after hints |
| `src/pages/Library.tsx` | Use tour context; conditionally show library tour |
| `src/components/YouTubeVideoExercises.tsx` | Use tour context; conditionally trigger transcript tutorial |
| `src/App.tsx` | Wrap student routes with `StudentTourProvider` |

