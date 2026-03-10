

# Separate Teacher & Student Auth Flows

## Summary

Update the Auth page to show role-specific branding/messaging based on `?role=` param, ensure teacher signups create trials while student signups stay free, update AuthCallback for OAuth role handling, add a role guard hook, and update landing page CTAs.

## Changes

### 1. Rewrite `src/pages/Auth.tsx`
- Two-column layout on desktop: left = role-specific branding panel, right = auth form
- Read `role` from `?role=` query param (default: `student`)
- Role config object with different titles, subtitles, benefits, button labels, gradients, icons
- Teacher signup: title "Start Your Free Trial", subtitle "14 days free, no credit card", blue/purple gradient
- Student signup: title "Start Learning Today", subtitle "Free forever", green/teal gradient
- Google OAuth: pass `role` param in redirectTo URL
- Keep existing: forgot password dialog, show/hide password, error handling
- Add "Wrong account?" link at bottom (teacher ↔ student switch)
- Preserve trial creation logic for teachers (already exists at line 126-151)

### 2. Update `src/pages/AuthCallback.tsx`
- Read `role` param from query string (passed via OAuth redirectTo)
- For new teacher signups via OAuth: create trial subscription in `teacher_subscriptions`, set role to teacher in `user_roles`
- For new student signups via OAuth: ensure free subscription, no trial
- Update `redirectBasedOnProfile` to check role and redirect accordingly (teacher → `/teacher` or `/teacher/onboarding`, student → `/app` or `/onboarding`)

### 3. Create `src/hooks/useRoleGuard.ts`
- Hook that checks user's role from `user_roles` table
- Redirects to correct dashboard if role doesn't match required role
- Returns `{ isAuthorized, loading }` for conditional rendering

### 4. Update `src/pages/TeacherLanding.tsx`
- Change header "Log in" button to navigate to `/auth?role=teacher` instead of `/auth`

### 5. Update `src/pages/LandingPage.tsx`
- Ensure student CTAs link to `/auth?role=student`

### 6. Deprecate `src/components/auth/AuthPage.tsx`
- Replace body with redirect to `/auth?role=student`

## File Summary

| File | Action |
|------|--------|
| `src/pages/Auth.tsx` | **Rewrite** — two-column layout with role-specific branding |
| `src/pages/AuthCallback.tsx` | **Edit** — handle role from OAuth, create role-appropriate subscriptions |
| `src/hooks/useRoleGuard.ts` | **Create** — role guard hook for protecting pages |
| `src/pages/TeacherLanding.tsx` | **Edit** — fix Log in button URL |
| `src/pages/LandingPage.tsx` | **Edit** — ensure student role in auth URLs |
| `src/components/auth/AuthPage.tsx` | **Rewrite** — redirect to new auth page |

