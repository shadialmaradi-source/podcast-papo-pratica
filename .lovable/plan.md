
# Fix: Assign Teacher Role to Teacher Accounts

## Root Cause

The `user_roles` table currently stores `student` for every user because:
- The backfill migration set all existing users to `student`
- The new-user trigger defaults to `student`
- There is no mechanism to set or change a role to `teacher` after the fact

The RLS INSERT policy on `teacher_lessons` requires `has_role(auth.uid(), 'teacher')`, which fails for anyone only having the `student` role.

## The Fix (2 parts)

### Part 1 - Database: Allow upsert of role during signup

Right now, a user signing up who selects "Teacher" tries to INSERT a `teacher` row into `user_roles`. But if they already have a `student` row (from the backfill or trigger), the unique constraint blocks a second INSERT. We need to add a migration that:

1. Adds an `ON CONFLICT (user_id, role) DO NOTHING` style upsert path for the client-side insert
2. More importantly: allows the signup flow to **replace** the default `student` role with `teacher` for users who selected Teacher during registration

The cleanest approach: change the trigger to insert based on `raw_user_meta_data->>'role'` if present, and add a policy + migration that allows the role to be **updated** for the user's own record (limited to only switching between valid enum values, and only once — or simply allow UPDATE on `user_roles` for own row).

Alternatively, since users are already in `user_roles` with `student`, the signup role-insert in `AuthPage.tsx` is failing silently. We need the auth page to **upsert** (update if exists) rather than insert.

### Part 2 - Frontend: Change INSERT to UPSERT in AuthPage

In `src/components/auth/AuthPage.tsx`, after signup, the code does:
```ts
supabase.from("user_roles").insert({ user_id, role })
```
This fails if the user already has a row (from the trigger default). Change it to an **upsert**:
```ts
supabase.from("user_roles").upsert({ user_id, role }, { onConflict: 'user_id' })
```
Wait — the unique constraint is on `(user_id, role)`, not just `user_id`, since a user could theoretically have multiple roles. But in our app, each user has exactly one role. We should add a unique constraint on just `user_id` or handle the upsert differently.

### Simplest Correct Fix

The cleanest approach for this app (1 role per user):

**Database migration:**
- Drop the current unique constraint `(user_id, role)` 
- Add a unique constraint on `user_id` alone (one row per user)
- Add an UPDATE policy so users can update their own role row

**Frontend fix:**
- In `AuthPage.tsx` change the role insert to an upsert using `onConflict: 'user_id'`

This way:
- New users: trigger inserts `student`, then signup code upserts to `teacher` if selected
- Existing users who registered as teacher but got `student` from backfill: their role gets corrected on next login/signup attempt

### Also: Immediate Fix for Existing Teacher Accounts

Add a small SQL migration that manually updates the role to `teacher` for any user who is currently on the `/teacher` route (i.e., users who went through the teacher signup flow). We can identify them by checking which users have logged in and are on the teacher dashboard.

Since we can't identify them automatically, we'll add a **self-service role correction**: if a logged-in user is on `/teacher` but their role is `student`, the dashboard will show an "activate teacher account" button that upserts their role.

Actually, the simplest immediate fix is:
1. Migration: change unique constraint to `user_id` only + add UPDATE policy
2. Frontend `AuthPage.tsx`: change insert to upsert
3. `TeacherDashboard.tsx`: on mount, if `useUserRole()` returns `student`, auto-upsert to `teacher` (since they're on the teacher page, they chose teacher during signup — the insert just failed silently)

## Technical Details

### Migration SQL
```sql
-- 1. Drop old unique constraint
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- 2. Add unique on user_id only (1 role per user)
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

-- 3. Add UPDATE policy so users can update their own role
CREATE POLICY "Users can update own role"
  ON public.user_roles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Files to Modify

| File | Change |
|------|--------|
| `src/components/auth/AuthPage.tsx` | Change role insert → upsert with `onConflict: 'user_id'` |
| `src/pages/TeacherDashboard.tsx` | On mount, if role is `student`, upsert role to `teacher` (auto-correct for existing teacher signups) |

No new files needed. This is a targeted 2-file fix + 1 migration.
