

# Full Cleanup Sprint: Community/Branding Removal + Code Quality Improvements

This plan covers everything from the analysis — not just the module removal, but also modularization, performance, and tooling cleanup.

---

## Phase 1: Remove Community & Branding Modules

**Delete files:**
- `src/pages/TeacherCommunity.tsx` (340 lines)
- `src/pages/TeacherBranding.tsx`
- `src/components/teacher/CommunityLessonCard.tsx`

**Edit `src/App.tsx`:**
- Remove lazy imports for `TeacherCommunity` and `TeacherBranding`
- Remove their two routes

**Edit `src/pages/TeacherSettings.tsx`:**
- Remove Community and Branding items from `settingsItems` array
- Remove unused `Globe`, `Palette` icon imports

**Edit `src/components/teacher/CreateLessonForm.tsx`:**
- Remove the "Share with Community" toggle UI (lines ~689-706)
- Remove `handleToggleCommunityShare` callback (lines ~447-500)
- Remove `communityShared`, `togglingCommunity` state variables
- Remove `Globe` from icon imports

**Keep intact:**
- `CommunityVideoBrowser` — used for video assignment browsing, not the community feature
- `useTeacherBranding` hook — still consumed by `StudentLesson.tsx` for existing branding

---

## Phase 2: Modularize Largest Components

### `CreateLessonForm.tsx` (1283 lines) — split into:
- `hooks/useCreateLesson.ts` — form submission, lesson creation, exercise generation logic
- `components/teacher/LessonPostCreationView.tsx` — the post-creation UI (share link, video embed, transcript, exercises)
- `components/teacher/CreateLessonForm.tsx` — stays as the form shell, much smaller

### `YouTubeExercises.tsx` (1128 lines) — split into:
- `hooks/useYouTubeExercises.ts` — exercise fetching, generation, scoring logic
- `components/exercises/ExerciseRenderer.tsx` — the exercise type rendering switch
- `YouTubeExercises.tsx` — orchestrator only

### `Lesson.tsx` (682 lines) — split into:
- `hooks/useLessonFlow.ts` — video resolution, segmentation, state machine logic
- `Lesson.tsx` — just renders the current state

---

## Phase 3: Performance Improvements

- Already have lazy loading for all pages; extend to heavy sub-components:
  - Lazy-load `TranscriptViewer`, `WordExplorerPanel`, `FlashcardCreatorModal` inside `CreateLessonForm`
  - Lazy-load `YouTubeSpeaking`, `VideoFlashcards` inside `Lesson.tsx` (only loaded when those steps are reached)
- Remove unused imports across all edited files during the refactor

---

## Phase 4: Tooling Cleanup

- Delete `bun.lock` and `bun.lockb` — keep only `package-lock.json` for npm
- Update README if it references bun commands
- Delete `src/pages/TestTranscript.tsx` and its route (if any) — dead test page

---

## Execution order

| Step | Scope | Risk |
|------|-------|------|
| 1 | Delete community/branding files + routes + nav | Low |
| 2 | Clean CreateLessonForm community toggle | Low |
| 3 | Extract `useCreateLesson` hook | Medium |
| 4 | Extract `LessonPostCreationView` component | Medium |
| 5 | Extract `useYouTubeExercises` hook | Medium |
| 6 | Extract `useLessonFlow` hook | Medium |
| 7 | Add lazy loading for heavy sub-components | Low |
| 8 | Delete lockfiles + test page | Low |

All kept features (student onboarding, video lessons, transcript, flashcards, teacher lesson/assignment workflows) remain fully functional throughout.

