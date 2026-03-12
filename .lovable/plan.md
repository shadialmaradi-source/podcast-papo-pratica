
Goal: Fix the signup UX so users clearly understand why no confirmation email arrives, and prevent false “check your email” success states.

What I found
- Auth logs show `user_repeated_signup` (HTTP 200) for the recent attempts.
- Those emails already exist in `auth.users` and are already confirmed.
- Current `src/pages/Auth.tsx` treats that response as a successful new signup and shows “check your email,” which is misleading.

Implementation plan
1. Update signup handling in `src/pages/Auth.tsx`
- Detect Supabase repeated-signup response (`signUpData.user` with empty `identities`).
- If detected:
  - Stop the “registration complete” path.
  - Show a clear message: “This email already has an account. Please sign in or reset password.”
  - Auto-switch to Sign In mode.

2. Protect teacher-specific provisioning logic
- Only run teacher role/trial creation for true first-time signups.
- Skip role update/trial logic entirely when signup is repeated/existing to avoid accidental side effects and confusing errors.

3. Improve user-facing auth errors
- Add explicit handling for common Supabase messages:
  - email already exists
  - email rate-limit / too many requests
  - unconfirmed email on sign-in
- Show actionable next step in each case (Sign in, Reset password, Wait and retry, Resend verification).

4. Add “Resend verification email” in Auth page flow
- After a true new signup (unconfirmed), show a small inline action to resend confirmation email directly from the same screen.

Validation plan
- Try signup with an already registered email → should show “account exists” (not “check email”).
- Try signup with a fresh email → should show verification pending + resend option.
- Try teacher signup with existing email → should not trigger trial/subscription provisioning path.
- Confirm sign-in and forgot-password paths still work.

Technical details
- File to change: `src/pages/Auth.tsx`
- Core guard:
  - Branch on repeated-signup detection before any teacher provisioning and before success toast.
- Keep existing Supabase auth API usage; no DB migration needed.
