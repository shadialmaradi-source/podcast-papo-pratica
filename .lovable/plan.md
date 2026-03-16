

# Email-Confirmation UX Cleanup — 1 File

**File**: `src/pages/Auth.tsx`

## Problem
After a successful signup (line 203+), the code always shows "check your email" verification messaging (`setPendingVerificationEmail` at line 236, toast at lines 238-243) — even when Supabase returns a session directly (email confirmation disabled). This confuses users who don't need to confirm.

## Fix

In the "True first-time signup" block (after line 228, the teacher setup and tracking), replace the unconditional verification messaging with a session check:

```typescript
// After trackEvent("user_signup", ...)

if (signUpData.session) {
  // Email confirmation not required — session returned directly.
  // The useEffect will detect the user and redirect automatically.
  toast({
    title: "Account Created",
    description: role === "teacher"
      ? "Your 14-day free trial has started! Redirecting..."
      : "Welcome! Redirecting...",
  });
} else {
  // Email confirmation required — no session yet.
  setPendingVerificationEmail(email);
  toast({
    title: "Registration Complete",
    description: role === "teacher"
      ? "Your 14-day free trial has started! Check your email to verify your account."
      : "Check your email to confirm your account and start learning.",
  });
}
```

Lines 236-243 replaced. No other files changed.

| File | Change |
|------|--------|
| `Auth.tsx` | Lines 236-243: Conditionally show verification UI based on `signUpData.session` |

1 file, 1 block changed, 0 architecture changes.

