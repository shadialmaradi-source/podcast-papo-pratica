# Pre-auth teacher onboarding flow

## Goal

When a visitor clicks "Create Your First Lesson Free" on `/teachers`, they should:

1. Try the demo lesson (no account needed)
2. Fill in profile info (no account needed)
3. **Last** step: sign up / sign in
4. Land on `/teacher` dashboard with all info saved

Existing logged-in teachers skip steps 1–3 and go straight to `/teacher`.

## Flow diagram

```text
/teachers
  └─ click "Create Your First Lesson Free"
        ├─ if logged in as teacher → /teacher
        └─ else → /teacher/start
                    ├─ Step 1: Watch demo + try demo lesson (sandbox, no DB writes)
                    ├─ Step 2: Teacher info form (name, students count, language taught, level)
                    └─ Step 3: Sign up / sign in (email+password or Google)
                          └─ on success: write teacher_profiles {onboarding_completed:true, ...info}
                                + create the demo lesson under their teacher_id
                                → /teacher
```

## Changes

### 1. New page: `src/pages/TeacherStart.tsx`
Public route hosting the 3-step wizard. Replaces the current post-auth `QuickStartOnboarding` for the /teachers entry path.

State stored in `sessionStorage` under key `teacher_pending_onboarding`:
```ts
{
  step: 0 | 1 | 2,
  demoTried: boolean,
  fullName: string,
  studentsCount: string,
  languageTaught: string,
  level: string,
}
```

Steps:
- **Step 1 — Demo**: reuse the visual from `QuickStartOnboarding` step 0+1 but render the demo lesson inline (read-only preview from `DEMO_TRANSCRIPT` constant) — no Supabase writes. Button "Continue" advances.
- **Step 2 — About you**: simple form (full name, # students, language, level). Stored in sessionStorage on change. "Continue" advances.
- **Step 3 — Create your account**: embed the existing teacher signup UI from `Auth.tsx` (email/password + Google button), pre-tagged with `?role=teacher`. After success the page itself doesn't navigate — it waits for the auth state, then runs a finalize step.

### 2. Finalize hook
New helper `finalizeTeacherOnboarding(userId)` that:
- Reads pending data from sessionStorage
- Upserts `teacher_profiles` with `{onboarding_completed: true, full_name, students_count, language_taught, level}`
- Creates the demo lesson + 4 demo exercises (logic lifted from current `QuickStartOnboarding.handleCreateDemo`)
- Clears sessionStorage
- Navigates to `/teacher` (or `/teacher/lesson/:id?demo=true` if user wants to view the seeded lesson — keep current behavior)

Triggered from:
- `TeacherStart` step 3 after signup success
- `AuthCallback.tsx` for the Google OAuth path: if pending onboarding exists in sessionStorage AND role=teacher, call finalize and route to `/teacher` instead of `/teacher/onboarding`.

### 3. Routing
- `src/App.tsx`: add public route `<Route path="/teacher/start" element={<TeacherStart />} />`.
- Keep `/teacher/onboarding` route as-is for backward compatibility (any teacher whose `onboarding_completed` is false will still see `QuickStartOnboarding`), but the /teachers CTA no longer routes there.

### 4. CTA wiring in `src/pages/TeacherLanding.tsx`
Update `handleCTA`:
```ts
const handleCTA = async () => {
  trackEvent("teacher_landing_cta_clicked");
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    // Existing teacher → straight to dashboard (role guard handles non-teachers)
    navigate("/teacher");
    return;
  }
  navigate("/teacher/start");
};
```
Also update the header "Sign in" button (line 179) to keep going to `/auth?role=teacher` (login path unchanged).

### 5. `Auth.tsx` adjustment
When `?role=teacher` and a pending onboarding payload exists in sessionStorage, after successful signup call `finalizeTeacherOnboarding(user.id)` instead of navigating to `/teacher/onboarding`.

### 6. `AuthCallback.tsx` adjustment
In the teacher branch, before redirecting to `/teacher/onboarding`, check `sessionStorage.getItem("teacher_pending_onboarding")`. If present, call finalize and redirect to `/teacher`.

## Files touched

- **new** `src/pages/TeacherStart.tsx`
- **new** `src/utils/teacherPendingOnboarding.ts` (sessionStorage helpers + `finalizeTeacherOnboarding`)
- `src/App.tsx` (add route)
- `src/pages/TeacherLanding.tsx` (CTA logic)
- `src/pages/Auth.tsx` (post-signup finalize when pending data exists)
- `src/pages/AuthCallback.tsx` (OAuth teacher branch finalize)

## Out of scope

- No changes to `QuickStartOnboarding` (still used for legacy/incomplete teacher accounts).
- No DB schema changes — `teacher_profiles` already supports the fields we write.
- Direct `/auth?role=teacher` visits keep current behavior.
