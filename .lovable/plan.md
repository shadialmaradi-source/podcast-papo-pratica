
# Fix: Post-Login Onboarding + Password Reset Flow

## Two Problems

### 1. No Onboarding After Sign-Up from Login Page
When a user registers via the Auth page (`/auth`), they're redirected straight to `/app` without going through onboarding. This means their profile never gets:
- Target language (`selected_language`)
- Native language (`native_language`)  
- Proficiency level (`current_level`)

The onboarding page only stores these in `localStorage` and never saves them to the Supabase `profiles` table either.

### 2. Password Reset Doesn't Show Reset Form
The "Forgot Password" flow sends a reset email that redirects to `/` (the landing page). Supabase includes a `type=recovery` parameter in the URL, but no page handles it. The user gets auto-logged in without ever being asked to set a new password.

---

## Solution

### Part 1: Redirect New Users to Onboarding

**File: `src/pages/Auth.tsx`** (lines 30-35)

Change the redirect logic when a user is already authenticated. Instead of always going to `/app`, check if their profile has `selected_language` set (or still has the default `'portuguese'`). If the profile looks incomplete, redirect to `/onboarding`.

```
useEffect(() => {
  if (user) {
    // Check if user has completed onboarding
    supabase.from('profiles')
      .select('selected_language, native_language')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (!data?.native_language) {
          navigate("/onboarding");
        } else {
          navigate("/app");
        }
      });
  }
}, [user, navigate]);
```

**File: `src/pages/AuthCallback.tsx`** (lines 42, 59)

Apply the same check after OAuth/PKCE callbacks. Instead of `navigate("/app")`, check the profile first and redirect to `/onboarding` if incomplete.

**File: `src/pages/Onboarding.tsx`** (line 84-89)

After the onboarding is complete, save the selections to the Supabase `profiles` table (not just localStorage):

```typescript
await supabase.from('profiles').update({
  selected_language: selectedLanguage,
  native_language: selectedNativeLanguage,
  current_level: selectedLevel,
}).eq('user_id', user.id);
```

Then navigate to `/app` (or `/lesson/first` as it does now).

### Part 2: Password Reset Page

**New file: `src/pages/ResetPassword.tsx`**

Create a dedicated page that:
- Checks for `type=recovery` in the URL hash
- Shows a form to enter a new password (with confirmation)
- Calls `supabase.auth.updateUser({ password: newPassword })` to update it
- On success, redirects to `/app`

**File: `src/App.tsx`**

Add a new public route:
```
<Route path="/reset-password" element={<ResetPassword />} />
```

**File: `src/pages/Auth.tsx`** (line 127)

Change the forgot password redirect from:
```
redirectTo: `${window.location.origin}/`
```
to:
```
redirectTo: `${window.location.origin}/reset-password`
```

**File: `src/pages/AuthCallback.tsx`**

Add detection for `type=recovery` in the URL hash. If found, redirect to `/reset-password` instead of `/app`.

---

## Technical Summary

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Check profile completeness on redirect; update forgot password redirectTo to `/reset-password` |
| `src/pages/AuthCallback.tsx` | Check profile completeness after OAuth; detect recovery type and redirect to `/reset-password` |
| `src/pages/Onboarding.tsx` | Save selections to Supabase `profiles` table (not just localStorage) |
| `src/pages/ResetPassword.tsx` | **New file** -- password reset form with `updateUser()` |
| `src/App.tsx` | Add `/reset-password` route |

No database changes needed -- the `profiles` table already has `selected_language`, `native_language`, and `current_level` columns.
