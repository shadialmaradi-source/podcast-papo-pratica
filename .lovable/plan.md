

# Plan: Teacher Onboarding Flow

## Overview
Create a 3-step onboarding flow at `/teacher/onboarding` that runs once after teacher signup. Includes profile setup, optional first student addition, and a quick tour.

## Database Changes

### 1. `teacher_profiles` table
- `id`, `teacher_id` (unique, references auth.users), `full_name`, `languages_taught` (text[]), `bio`, `specialties` (text[]), `onboarding_completed` (boolean, default false), `created_at`
- RLS: teachers can CRUD own row (using `auth.uid() = teacher_id`)

### 2. `teacher_students` table
- `id`, `teacher_id`, `student_email`, `student_name`, `level`, `native_language`, `notes`, `status` (default 'invited'), `invited_at`, `last_active`
- Unique constraint on `(teacher_id, student_email)`
- RLS: teachers can CRUD own students

## Files to Create/Modify

### New: `src/pages/TeacherOnboarding.tsx`
3-step flow using local state (no router per step):

**Step 1 - Welcome & Profile**: Name input, multi-select for languages taught. Saves to `profiles.full_name` and creates `teacher_profiles` row.

**Step 2 - First Student** (optional): Student email, CEFR level (A1-C2), native language. Skip button. If filled, inserts into `teacher_students`.

**Step 3 - Quick Tour**: 3 slides explaining assign/share/track workflow. "Got it" button sets `onboarding_completed = true` and redirects to `/teacher`.

Design: Clean card-based UI with step progress indicator, framer-motion transitions. Consistent with existing onboarding style.

### Modify: `src/App.tsx`
- Add route: `/teacher/onboarding` → `<ProtectedRoute><TeacherOnboarding /></ProtectedRoute>`

### Modify: `src/pages/TeacherDashboard.tsx`
- After role check, also check `teacher_profiles.onboarding_completed`. If false/missing, redirect to `/teacher/onboarding`.

### Modify: `src/components/auth/AuthPage.tsx`
- After teacher login redirect, check onboarding status. If not completed, redirect to `/teacher/onboarding` instead of `/teacher`.

### Modify: `src/pages/Auth.tsx`
- Same: when user is authenticated and role is teacher, check onboarding before redirecting.

### Analytics
- Track `teacher_onboarding_started`, `teacher_onboarding_step_1/2/3`, `teacher_onboarding_completed` via existing `trackEvent`.

