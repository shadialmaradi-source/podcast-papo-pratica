# Lovable Audit Validation (Code-Level Double Check)

## Short answer: should you approve Lovable output immediately?
**No, not immediately.** Approve only if it passes a strict checklist because your language flows involve many connected modules.

Use a gated approach:
1. Lovable generates patch.
2. Verify against the acceptance checklist (below).
3. Approve only when all critical + high checks pass.

---

## What I verified in your codebase (against the audit)

## Confirmed critical/high issues

### 1) Native language mapping mismatch is real (critical)
`YouTubeExercises` reads `profile.native_language` and can pass values like `pt` directly to RPC/edge calls; only browser fallback is mapped to full names. This can break matching when DB expects canonical names.

### 2) Speaking scope uses full transcript, not scene transcript (critical)
`YouTubeSpeaking` fetches transcript from `youtube_transcripts` and uses full transcript; no `sceneTranscript` prop is provided in the component contract.

### 3) Translation hint button text is hardcoded in English (high)
`TranslationHint` still defaults to English text.

### 4) First lesson has no explicit "go back/change level" control (high)
`FirstLesson` flow moves intro → video → exercises → speaking → flashcards, with no visible back-to-onboarding action.

### 5) Profile "My Lessons" merge is not re-sorted after merge (high)
`byEmail` is sorted, but merged array with `extraLessons` is not globally sorted by `created_at`.

### 6) Learning Path card appears whenever data exists, not based on completion (high)
Card renders on `learningPathProgress` existence alone; no completion threshold guard.

### 7) Dead files still exist (high/low cleanup)
`src/pages/TestTranscript.tsx`, `src/components/auth/AuthPage.tsx`, and `src/components/auth/RoleSelector.tsx` exist.

---

## Items in audit that need nuance

### A) File path reference mismatch
Audit says `src/hooks/useYouTubeExercises.ts`; in this repo logic is in `src/components/YouTubeExercises.tsx`.

### B) Speaking time-limit bug is not actually a bug
Current code shows 5s for non-summary or anonymous and 30s for authenticated summary mode. That behavior is consistent with current UI messaging.

### C) Onboarding language availability depends on product decision
Current onboarding marks English, Spanish, Italian as available. Keep or change based on your product policy.

---

## Recommended approval policy for Lovable output
Do **not** click approve unless the generated change includes all of these:

### Must-pass (critical)
- Native language normalization (codes and names) centralized and applied before RPC/edge calls.
- Scene-aware speaking: use `sceneTranscript` when scene mode is active.
- Exercise generation requests always pass explicit target language + native language.

### Must-pass (high)
- `TranslationHint` and speaking section labels localized.
- First lesson has back/change-level control.
- Profile includes level selector post-onboarding.
- My Lessons final list sorted by `created_at` descending after merge.
- Learning Path card shown only with meaningful progress (e.g., completed/interacted threshold).

### Cleanup
- Remove dead files not routed/used.

---

## Copy/paste Lovable prompt (implementation prompt)

```txt
Apply a focused bug-fix refactor for language consistency and lesson UX.

CONTEXT:
This app has three language roles that must stay separate:
- ui_language (interface language)
- target_language (language to learn)
- native_language (translation language)

MANDATORY FIXES (CRITICAL):
1) Normalize language values globally (ISO code + canonical name mapping).
   - Ensure profile/localStorage/browser values are normalized before RPC/edge calls.
   - Fix native language mismatch where values like "pt" should map consistently to canonical DB/API value.
2) Speaking analysis must be scene-aware.
   - Pass sceneTranscript/sceneId from lesson flow into YouTubeSpeaking.
   - If scene transcript exists, analyze against scene transcript, not full video transcript.
3) Exercise generation must always send explicit target and native language.
   - Remove hidden defaults that cause wrong language generation.

HIGH PRIORITY UX FIXES:
4) Add back/change-level control in /lesson/first.
5) Add profile level selector (update profiles.current_level).
6) Localize hardcoded English labels:
   - TranslationHint button label
   - YouTubeSpeaking section headers (e.g., Strengths, Areas to Improve, To reach 100%)
   - Flashcard UI labels where still hardcoded.
7) Fix My Lessons ordering:
   - After merging assigned + response-based lessons, sort by created_at desc.
8) Learning Path card visibility:
   - Show only after meaningful progress/interaction (define explicit threshold).

CLEANUP:
9) Remove dead/legacy files if unused and unrouted:
   - src/pages/TestTranscript.tsx
   - src/components/auth/AuthPage.tsx
   - src/components/auth/RoleSelector.tsx

IMPLEMENTATION RULES:
- Do not break onboarding, transcript features, fragmented lessons, flashcards.
- Keep behavior backward compatible where possible.
- Prefer shared utility for language normalization over repeated component-level maps.

VALIDATION (REQUIRED OUTPUT):
- List files changed.
- Show before/after for language normalization flow.
- Confirm scene-speaking input source with exact props used.
- Provide lint/build results.
- Provide manual QA checklist for these scenarios:
  a) target English + native Italian
  b) target Spanish + native English
  c) scene lesson speaking accuracy scoped per scene
```

---

## Final guidance
You should approve Lovable output only if it includes code-level fixes (not just docs) and passes the must-pass checks above. If Lovable returns partial fixes, request another pass with the same prompt and reject until checklist is complete.
