## Problem

The student onboarding tour (Library tooltips: "Explore videos added by other learners", "Paste any YouTube link...", "Tap any video to start a lesson..."), Home hints, and Transcript tutorial all rely on `localStorage` keys (`has_seen_home_hints`, `library_tour_completed`, `transcript_tutorial_completed`) to remember completion.

Because `localStorage` is **per-browser/device**, a returning student sees the entire tour again whenever they:
- log in from a new device or browser
- clear their browser data
- use a private/incognito window

This is what happened in the screenshots — an existing account still saw the Library onboarding tooltips.

## Solution

Promote student tour completion to **per-account state stored in the database**, with `localStorage` kept only as a fast-path cache. Once a student has completed (or skipped) the tour on any device, they will never see it again on any other device.

### Database

Add three boolean flags to `profiles`:
- `home_hints_completed boolean not null default false`
- `library_tour_completed boolean not null default false`
- `transcript_tutorial_completed boolean not null default false`

**Backfill**: For all existing student profiles with `total_xp > 0` OR `current_streak > 0` OR `longest_streak > 0` OR `last_login_date is not null`, set all three flags to `true`. These users have already used the app and should not see onboarding again — this directly fixes the user's current account on every device.

No new RLS policies needed (existing self-update policy on `profiles` already covers these columns).

### Hook changes (`src/hooks/useStudentTour.tsx`)

- On mount, fetch the three flags from `profiles` for the logged-in user.
- Treat the phase as completed if **either** the DB flag **or** the legacy `localStorage` key is set (DB wins; localStorage only used until the fetch resolves).
- When `advancePhase` marks a phase done, write `true` to **both** the DB column and `localStorage` (fire-and-forget update; localStorage gives instant UX).
- `skipAll` writes all three columns to `true` in one update.
- While the DB fetch is pending, default to `completed` (do NOT flash the tour) — better to occasionally miss showing it to a brand-new user for a split second than to re-show it to returning users.

### Brand-new user detection

A truly new student (no profile row yet, or all progress fields empty) should still see the tour. The hook will:
1. Wait for the profile fetch.
2. If the user has any progress evidence (`total_xp > 0`, streaks > 0, or `last_login_date` set) AND none of the new flags are explicitly `true`, auto-mark all three flags as `true` in the DB and skip the tour. This covers users created before this migration who happen to lack the backfill (e.g. race conditions).
3. Otherwise resolve to the first incomplete phase as today.

### Files touched

- **New migration** `supabase/migrations/<timestamp>_student_tour_completion_flags.sql` — adds the three columns and runs the backfill.
- **Edit** `src/hooks/useStudentTour.tsx` — DB-backed resolution and persistence; keep the existing `StudentTourPhase` API unchanged so consumers (`Library.tsx`, `AppHome.tsx`, transcript tutorial) need no changes.
- **Edit** `src/integrations/supabase/types.ts` — regenerated automatically by migration; included for completeness.

### Out of scope

- Teacher onboarding (already uses `teacher_profiles.onboarding_completed`).
- Any visual changes to the tooltips themselves.
- A "Replay tour" setting (could be added later if needed).
