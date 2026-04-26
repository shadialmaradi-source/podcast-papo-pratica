# Cleanup audit (current `main` behavior) — 2026-04-26

Scope: practical code-path review of current repository state (frontend + Supabase edge/migrations) against the requested topics.

## Results

1. **Gate teacher callback redirects on confirmed promotion**
   - **Status:** solved differently
   - **Why:** `AuthCallback` only updates in-memory role to teacher when `promotionSucceeded`, but role-upgrade policies were later removed from `user_roles`, so in practice app-side promotion is effectively blocked and redirecting follows DB role instead of optimistic intent.
   - **Confidence:** medium

2. **Fix base-path regression in lesson share origin normalization**
   - **Status:** solved
   - **Why:** `normalizeLovableOrigin()` preserves configured origin pathname as base path (trailing slash trimmed), and also normalizes Lovable preview domains.
   - **Confidence:** high

3. **Fix base-path regression in lesson share URL normalization**
   - **Status:** solved
   - **Why:** share links are built as `resolveShareOrigin() + /lesson/student/:token`, with token URL-encoded and base path carried via origin normalization.
   - **Confidence:** high

4. **Student onboarding heuristics, redirects and native_language backfill; Resend import fix**
   - **Status:** solved
   - **Why:** onboarding heuristics use `native_language` + progress evidence; shared-lesson auth/onboarding paths can hydrate profile fields (including native language fallback) from lesson metadata; edge mail functions import Resend from an ESM URL consistently.
   - **Confidence:** high

5. **Fix false student onboarding redirects and Resend Edge import**
   - **Status:** solved
   - **Why:** both `AuthCallback` and `Onboarding` now short-circuit onboarding when profile evidence exists or when shared-lesson hydration succeeds; Resend edge imports are standardized.
   - **Confidence:** high

6. **Allow teacher lesson creation without requiring student email**
   - **Status:** solved
   - **Why:** lesson schema allows empty `student_email`, UI marks it optional, lesson insert uses `null` when blank, and `teacher_students` upsert runs only when an email is present.
   - **Confidence:** high

7. **Enable custom paragraph lessons to use video exercise types**
   - **Status:** solved
   - **Why:** paragraph lessons use the same exercise type set as YouTube lessons, and exercise generation logic supports paragraph-source context when no video URL is present.
   - **Confidence:** high

## Remaining broken items

- None found during this code-path audit.
