

# Day 1: Add Teacher/Student Roles to ListenFlow

## What This Does

When users sign up, they will choose whether they are a **Teacher** or a **Student**. This role determines which dashboard and features they see after login. Existing users will default to the "student" role (preserving current behavior).

## Database Changes

### 1. Create role enum and `user_roles` table

Following security best practices, roles are stored in a **separate table** (not on the profiles table) to prevent privilege escalation.

```text
- New enum: app_role ('teacher', 'student')
- New table: user_roles (id, user_id, role)
  - Foreign key to auth.users with CASCADE delete
  - Unique constraint on (user_id, role)
  - RLS enabled
```

### 2. Security definer function: `has_role()`

A `SECURITY DEFINER` function to safely check roles from RLS policies without recursion:

```text
has_role(user_id uuid, role app_role) -> boolean
```

### 3. RLS policies on `user_roles`

- Users can **read** their own roles
- Users can **insert** their own role (only during signup)
- No update/delete from client (role changes require admin)

### 4. Auto-assign default role

Update the `handle_new_user()` trigger function to insert a default 'student' role into `user_roles` when a new user signs up. This ensures existing auth flow still works.

## Frontend Changes

### 1. Role selection during signup (`src/components/auth/AuthPage.tsx`)

- Add a **Teacher / Student** toggle that appears only during registration (not login)
- Two cards: "I'm a Teacher" (with icon) and "I'm a Student" (with icon)
- Store the selected role and pass it to the signup metadata
- After signup, insert the role into `user_roles`

### 2. Role-aware routing (`src/App.tsx`)

- After login, check the user's role from `user_roles`
- Students go to `/app` (current behavior, unchanged)
- Teachers go to `/teacher` (new dashboard, placeholder for now)

### 3. Teacher Dashboard placeholder (`src/pages/TeacherDashboard.tsx`)

- New page at `/teacher` route
- Simple placeholder with: welcome message, "Create Lesson" button (non-functional yet), and a sign-out button
- This will be fleshed out in Days 2-3

### 4. Role hook (`src/hooks/useUserRole.tsx`)

- New hook: `useUserRole()` returns `{ role: 'teacher' | 'student' | null, loading: boolean }`
- Queries `user_roles` table for the current authenticated user
- Used by the router and dashboards to determine which UI to show

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useUserRole.tsx` | Hook to fetch user role |
| `src/pages/TeacherDashboard.tsx` | Placeholder teacher dashboard |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/auth/AuthPage.tsx` | Add role selection cards during signup, insert role after registration |
| `src/App.tsx` | Add `/teacher` route, update post-login redirect logic |
| `src/hooks/useAuth.tsx` | No changes needed (role is separate) |

## Migration SQL (1 migration)

```text
1. CREATE TYPE app_role AS ENUM ('teacher', 'student')
2. CREATE TABLE user_roles (id, user_id, role, created_at)
3. Enable RLS on user_roles
4. CREATE FUNCTION has_role() - security definer
5. RLS policies: select own, insert own
6. UPDATE handle_new_user() to also insert default 'student' role
7. Backfill: INSERT INTO user_roles for all existing users as 'student'
```

## User Experience Flow

```text
New user visits /auth
  -> Clicks "Register"
  -> Sees role selection: [Teacher] [Student]
  -> Fills email + password
  -> Signs up
  -> Role saved to user_roles table
  -> Redirected based on role:
     - Student -> /app (existing dashboard)
     - Teacher -> /teacher (new placeholder)

Existing users:
  -> Auto-assigned 'student' role via backfill
  -> Login works exactly as before
  -> Redirected to /app as usual
```

