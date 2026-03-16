

# Authentication Redirect Stabilization — 2 Files

## File 1: `src/pages/AuthCallback.tsx`

### Fix: DB role is source of truth for existing users (line 142)

**Current:**
```typescript
const actualRole = dbRole === "teacher" || intendedRole === "teacher" ? "teacher" : "student";
```

**Problem:** `intendedRole === "teacher"` (from `?role=teacher` URL param) can override an existing student's DB role, sending them to teacher dashboard.

**Fix:**
```typescript
const actualRole = dbRole || (isNewUser ? intendedRole : "student");
```

For existing users, `dbRole` is always used. `intendedRole` only applies for new users (where the role upgrade block above already handles teacher signup). If somehow dbRole is null for an existing user, default to student.

---

## File 2: `src/pages/Auth.tsx`

### Fix 1: Already-authenticated redirect (lines 101-115)

Add `pending_lesson_token` check between onboarding and first_lesson_completed checks.

**Current:**
```typescript
} else {
  supabase.from("profiles").select("native_language").eq("user_id", user.id).single()
    .then(({ data }) => {
      if (!data?.native_language) {
        navigate("/onboarding");
      } else if (localStorage.getItem('first_lesson_completed') !== 'true') {
        navigate("/lesson/first");
      } else {
        navigate("/app");
      }
    });
}
```

**New:**
```typescript
} else {
  supabase.from("profiles").select("native_language").eq("user_id", user.id).single()
    .then(({ data }) => {
      const pendingToken = localStorage.getItem("pending_lesson_token");
      if (!data?.native_language) {
        navigate("/onboarding");
      } else if (pendingToken) {
        localStorage.removeItem("pending_lesson_token");
        navigate(`/lesson/student/${pendingToken}`);
      } else if (localStorage.getItem('first_lesson_completed') !== 'true') {
        navigate("/lesson/first");
      } else {
        navigate("/app");
      }
    });
}
```

### Fix 2: Email sign-in redirect (lines 275-282)

Same pattern — add `pending_lesson_token` check.

**Current:**
```typescript
navigate(!profile?.native_language ? "/onboarding" : localStorage.getItem('first_lesson_completed') !== 'true' ? "/lesson/first" : "/app");
```

**New:**
```typescript
const pendingToken = localStorage.getItem("pending_lesson_token");
if (!profile?.native_language) {
  navigate("/onboarding");
} else if (pendingToken) {
  localStorage.removeItem("pending_lesson_token");
  navigate(`/lesson/student/${pendingToken}`);
} else if (localStorage.getItem('first_lesson_completed') !== 'true') {
  navigate("/lesson/first");
} else {
  navigate("/app");
}
```

---

## Summary

| File | Change |
|------|--------|
| `AuthCallback.tsx` | Line 142: Use `dbRole` as source of truth; only fall back to `intendedRole` for new users |
| `Auth.tsx` | Lines 101-115: Add `pending_lesson_token` to already-authenticated redirect |
| `Auth.tsx` | Lines 275-282: Add `pending_lesson_token` to email sign-in redirect |

2 files, 3 line-level changes, 0 architecture changes.

