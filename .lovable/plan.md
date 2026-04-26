# Fix: form state wiped when switching browser tabs

## What's happening

On `/admin/import`, when you fill in the YouTube URL or transcript and switch to another browser tab and come back, the fields reset to empty. The same bug affects every protected page that holds local form state (not just admin import).

## Root cause

When the browser tab regains focus, Supabase emits a `SIGNED_IN` / `TOKEN_REFRESHED` auth event. In `src/hooks/useAuth.tsx`, that handler:

1. Sets `roleLoading = true`
2. Re-fetches the user's role from the database
3. Sets `roleLoading = false`

`ProtectedRoute` in `src/App.tsx` (line 111) renders a `<LoadingFallback />` whenever `roleLoading` is true. That swap **unmounts** the page component (AdminImport), so all `useState` values — URL, transcript, language, results — are destroyed. When the role finishes loading, the page remounts fresh.

## Fix

Two small, surgical changes:

### 1. `src/hooks/useAuth.tsx`
- Only re-run the role/profile fetch when the user **actually changes** (different `user.id` than what's already in state), not on every `SIGNED_IN` / `TOKEN_REFRESHED` event triggered by tab focus or token refresh.
- Skip toggling `roleLoading` back to `true` once a role is already resolved for the current user.

### 2. `src/App.tsx` — `ProtectedRoute`
- Only show `<LoadingFallback />` for `roleLoading` on the **initial** load (when `role` is still `null`). If we already have a role for the current user, keep rendering children during background refreshes so their state is preserved.

  Change line 111 from:
  ```ts
  if (loading || roleLoading || (shareToken && !user && resolvingLesson)) {
  ```
  to something like:
  ```ts
  if (loading || (roleLoading && !role) || (shareToken && !user && resolvingLesson)) {
  ```

## Why this is safe

- Role is still verified on first navigation to a protected page.
- Section access check (`canAccessSection`) still runs on every render with the latest role.
- We only avoid the unmount/remount flicker that happens on tab refocus — no security implication, since the role value is the same one we already validated when the user landed on the page.

## Files touched
- `src/hooks/useAuth.tsx`
- `src/App.tsx`

## Out of scope
- No changes to AdminImport itself. The form state will simply persist correctly once the underlying remount bug is gone.
- Not adding localStorage draft persistence for the form (can be a follow-up if you want drafts to survive full page reloads too — let me know).
