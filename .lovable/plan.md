
# Fix: Password Reset Link Being Intercepted

## Root Cause

In `src/App.tsx`, the `AuthRedirector` component (lines 52-83) watches for any URL containing `access_token` or `refresh_token` in the hash, and redirects it to `/auth/callback`. 

When Supabase sends the recovery email, it links to:
```
/reset-password#access_token=...&type=recovery&...
```

The `AuthRedirector` sees `access_token` in the hash and immediately redirects to `/auth/callback`, which logs the user in and sends them to `/app` -- the reset password page is never shown.

## Fix

### File: `src/App.tsx` (line 57)

Add `/reset-password` to the early return check, so the redirector skips that route:

```typescript
// Before
if (location.pathname === "/auth/callback") return;

// After
if (location.pathname === "/auth/callback" || location.pathname === "/reset-password") return;
```

This is a one-line change. The `/reset-password` page already has its own logic to detect the recovery token and call `supabase.auth.updateUser()`.
