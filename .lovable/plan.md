## Goal

Replace the current `/teacher/start` 3‑step wizard with a guided **pre‑auth product tour** that mirrors the real teacher experience:

1. From `/teachers` → "Start demo"
2. Hero video preview (hidden until played)
3. Try a **Video lesson demo** (transcript + 1 MCQ)
4. Try a **Paragraph lesson demo** (short text + 1 fill‑in)
5. Try a **Speaking practice demo** (1 role‑play prompt)
6. **Sign up** at the end (email/password + Google)
7. After signup → existing `QuickStartOnboarding` runs, now extended with the **info form** (name, language, level, students count) → `/teacher`

Each demo step shows a **popover walkthrough** that explains what the teacher can expect ("This is how your students will see the transcript", "Here's where AI generates exercises", etc.).

## Flow diagram

```text
/teachers
  └─ "Create Your First Lesson Free"
        ├─ logged-in teacher → /teacher
        └─ guest → /teacher/start  (NEW tour)
                    ├─ Step 0  Welcome + hero video (hidden until clicked)
                    ├─ Step 1  Video-lesson demo  + walkthrough popover
                    ├─ Step 2  Paragraph-lesson demo + walkthrough popover
                    ├─ Step 3  Speaking-practice demo + walkthrough popover
                    └─ Step 4  "Loved it? Create your account"
                          → /auth?role=teacher&mode=signup&from=teacher_start
                                └─ on success
                                     → /teacher/onboarding (QuickStartOnboarding, EXTENDED)
                                          ├─ Step A  Info form (name/lang/level/students)  [NEW]
                                          ├─ Step B  Watch quick demo (existing)
                                          └─ Step C  Create demo lesson (existing)
                                                → /teacher/lesson/:id?demo=true
```

## Changes

### 1. Rewrite `src/pages/TeacherStart.tsx` as a guided tour
- Remove the info form (moves to QuickStartOnboarding).
- 5 steps: Welcome / Video demo / Paragraph demo / Speaking demo / Signup CTA.
- Keep `sessionStorage` flag `teacher_pending_onboarding = { tourCompleted: true, demoTried: true }` so we know the user came from the tour. No form fields anymore.
- Hero video uses a **poster + Play button** that swaps to the YouTube iframe only when clicked (the "hidden until played" behavior you described).
- Each demo step renders a small interactive sample (read‑only — no DB writes):
  - **Video demo**: YouTube embed of the existing demo short + transcript + 1 clickable MCQ ("Why does the woman talk to the officer?") with instant feedback.
  - **Paragraph demo**: a short A2 paragraph + 1 fill‑in‑the‑blank ("She wants to ___ her ID") with instant feedback.
  - **Speaking demo**: 1 role‑play card ("You are at the police station. Say: I want to report something.") with a "Try speaking" button that just shows a mock transcript bubble.
- Each step also shows a **walkthrough popover** (auto‑opens once per step) explaining: what the exercise is, what students will see, what the teacher controls, and a "Got it" dismiss. Use the existing `Popover` / `Tooltip` pattern (see `src/components/teacher/DemoTooltip.tsx` — reuse it).
- Sticky bottom bar with "Back / Next"; final step's CTA is "Create my account" → `/auth?role=teacher&mode=signup&from=teacher_start`.

### 2. Extend `src/components/teacher/QuickStartOnboarding.tsx` with an info form
- Add a new first step (Step 0 = info form) with: full name, language taught, level, students count.
- Persist via existing `teacher_profiles` upsert (already used by `handleCreateDemo`). Add columns logic: `full_name`, `languages_taught: [language]`, `bio` summary line for level/students count (matches what `finalizeTeacherOnboarding` already does today).
- Re‑number existing steps to 1 (watch demo) and 2 (create demo lesson). Update the stepper to 3 dots.
- If `teacher_profiles.full_name` already exists, prefill and let the user click "Looks good, continue".

### 3. Simplify `src/utils/teacherPendingOnboarding.ts`
- Drop `fullName / studentsCount / languageTaught / level` from the stored payload (the form moved). Keep only `{ tourCompleted: boolean, demoTried: boolean }`.
- Remove `finalizeTeacherOnboarding`'s lesson‑seeding and profile upsert paths — those now happen inside `QuickStartOnboarding` (where the user is already authenticated and answers the form). Keep only `clearPendingTeacherOnboarding()`.
- `Auth.tsx` and `AuthCallback.tsx`: when a teacher signs up with `tourCompleted` flag set, route them to `/teacher/onboarding` (not `/teacher`) so the new info‑form + demo‑lesson step runs. Existing teachers (with `onboarding_completed=true`) still skip straight to `/teacher`.

### 4. Routing / CTA wiring (no changes needed)
- `src/App.tsx`: route `/teacher/start` is already registered.
- `src/pages/TeacherLanding.tsx`: CTA already routes guests to `/teacher/start`.

## Walkthrough popover content (draft)

| Step | Popover title | Body |
|---|---|---|
| Video demo | "This is a Video Lesson" | "Paste any YouTube URL — we transcribe it and generate exercises in seconds. Students watch, then practice with AI questions." |
| Paragraph demo | "This is a Paragraph Lesson" | "No video? Drop in any text. We turn it into a reading + comprehension activity tailored to your level." |
| Speaking demo | "This is Speaking Practice" | "Assign role‑plays. Students record themselves; AI gives instant pronunciation + grammar feedback. You see scores in your dashboard." |

(Copy is editable — flagging so you can tweak before/after build.)

## Files touched

- **rewrite** `src/pages/TeacherStart.tsx`
- **edit**    `src/components/teacher/QuickStartOnboarding.tsx` (add info‑form step, expand stepper)
- **edit**    `src/utils/teacherPendingOnboarding.ts` (slim down, drop finalize logic)
- **edit**    `src/pages/Auth.tsx` (route teacher signups from tour to `/teacher/onboarding`)
- **edit**    `src/pages/AuthCallback.tsx` (same routing rule for OAuth path)
- **reuse**   `src/components/teacher/DemoTooltip.tsx` (popover walkthrough component)

## Out of scope
- No DB schema changes.
- No changes to `TeacherLanding`, `App.tsx`, or the demo seed lesson content.
- The `/teacher/onboarding` route stays — it just now has 3 steps instead of 2.

## Open questions before I build
- **Speaking demo**: real mic capture or mocked? I'd suggest **mocked** for the pre‑auth tour (no permissions prompt, instant). Confirm OK.
- **Walkthrough style**: auto‑open popover per step (current proposal) **or** a single Joyride‑style tour with "Next/Skip" overlay across all steps. I'd suggest the simpler per‑step popover.
- **Skip during tour**: should we keep a "Skip the tour, just sign me up" link on every step? Default yes.
