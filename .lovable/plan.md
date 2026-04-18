

## Problem

When a teacher shares a lesson link (`/lesson/student/<token>`) with a student, the expected flow is:
1. Student clicks link → lands on **app signup page** with the **email pre-filled** (matching what teacher entered as `student_email`)
2. Student signs up → automatically taken into the lesson with the same view as the teacher

Currently:
- The link goes through `ProtectedRoute` → redirects to `/auth` → but the email is **NOT pre-filled** from the lesson's `student_email`.
- The Auth page also defaults to **sign-in mode** for students (`isSignUp = rawRole === "teacher"`), so new students see "Welcome Back" instead of "Create Account".
- The user's screenshot 4 shows `lovable.dev/login` — that is the Lovable editor's own auth wall (because they opened the preview link while not logged into the editor). When opened in a normal browser / published URL, the user lands on `/auth` instead — but still without pre-fill.

Note: Share token lookup, profile hydration, and post-auth redirect to the lesson **already work** (`AuthCallback.tsx` + `Auth.tsx` use `getPendingLessonRedirect` + `hydrateProfileFromLesson`). The missing piece is **email pre-fill + signup default + locking the email field**.

## Changes

### 1. `src/utils/authRedirect.ts`
Add helpers to store/retrieve a "pending lesson email" alongside the pending lesson token:
- `setPendingLessonEmail(email)` / `getPendingLessonEmail()` / clear in `clearPendingLessonRedirect()`.

### 2. `src/App.tsx` — `ProtectedRoute`
When intercepting `/lesson/student/:token` for an unauthenticated user:
- Fetch `teacher_lessons.student_email` by `share_token` (public read via existing RLS used in `fetchLessonForHydration`).
- Store the email via `setPendingLessonEmail`.
- Redirect to `/auth?role=student&mode=signup&lessonToken=<token>` (instead of bare `/auth`).

Since this requires an async fetch, convert the redirect logic into a small wrapper component that does the lookup, then `<Navigate>`.

### 3. `src/pages/Auth.tsx`
- Read `mode=signup` query param → set `isSignUp = true` initial state when present (overrides current teacher-only default).
- On mount, read pending lesson email (`getPendingLessonEmail()`) → pre-fill `email` state and **lock the input** (`readOnly` + helper text: "Your teacher invited you with this email").
- Show a friendly banner at top of the card when `lessonToken` is present: "You've been invited to a lesson. Sign up to get started."

### 4. Verify trial / lesson sharing parity
No DB changes. The post-signup flow in `AuthCallback.tsx` and `Auth.tsx` already:
- detects `pending_lesson_token`,
- hydrates the profile from lesson metadata,
- redirects to `/lesson/student/<token>`.

This works for **all three lesson types** (video, paragraph, speaking) because routing is driven by `share_token`, not lesson type, and `StudentLesson.tsx` already renders all three.

### 5. Note about the Lovable editor login (screenshot 4)
That `lovable.dev/login` page is shown when the **preview project visibility is private** and the link is opened in the Lovable editor iframe. This is unrelated to our app code. The user should:
- Share the **published URL** (`https://listenflow.lovable.app/lesson/student/<token>`) instead of the `lovableproject.com` preview URL, **or**
- Set the project visibility to public.

We'll mention this in the chat reply but no code change is needed.

## Files Touched

- `src/utils/authRedirect.ts` — add email helpers
- `src/App.tsx` — async ProtectedRoute lookup for student lesson links
- `src/pages/Auth.tsx` — pre-fill email, default to signup, banner

