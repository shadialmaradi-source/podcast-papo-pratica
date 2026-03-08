

# Plan: Fix Role System Bugs in ListenFlow

## Problem 1: Role Upsert Bug

The `user_roles` table has a unique constraint on `(user_id, role)` but the code uses `onConflict: "user_id"`. Also, the `handle_new_user` trigger already inserts a `student` role for every new user. So when a teacher signs up, the upsert tries to insert a second row (teacher) and the `onConflict` doesn't match the actual constraint.

### Fix: DB Migration
- Drop existing unique constraint on `(user_id, role)`
- Add unique constraint on `user_id` alone (enforces one role per user)
- This makes the existing upsert logic work correctly

### Fix: AuthPage signup logic
- After signup as teacher: use `update` instead of `upsert` since `handle_new_user` trigger already creates a student row. Simply update the role from `student` to `teacher`.

## Problem 2: Role Switching (Student → Teacher)

### New component: `src/components/RoleSwitcher.tsx`
- Shows current role with icon
- If student: button "Upgrade to Teacher" with confirmation dialog explaining they'll gain teacher features while keeping student data
- If teacher: show "You're a teacher" (no downgrade)
- On confirm: update `user_roles` row, show success, redirect to `/teacher`

### Integration in ProfilePage
- Add a "Role" section in ProfilePage with the RoleSwitcher component
- No new route needed — embed directly in profile

## Problem 3: Italian UI Strings

### `src/components/auth/AuthPage.tsx` — Replace all Italian strings:
- "Errore di accesso" → "Login Error"
- "Email o password non corretti" → "Invalid email or password"  
- "Errore" → "Error"
- "Utente già registrato" → "Already registered"
- "Prova ad accedere invece di registrarti" → "Try logging in instead"
- "Accesso effettuato!" → "Logged in!"
- "Benvenuto nell'app" → "Welcome back"
- "Registrazione completata!" → "Registration complete!"
- "Controlla la tua email..." → "Check your email to confirm your account"
- "Le password non coincidono" → "Passwords don't match"
- "Caricamento..." → "Loading..."
- "Accedi" → "Log in" / "Registrati" → "Sign up"
- "Accedi al tuo account" → "Log in to your account" / "Crea il tuo account" → "Create your account"
- All forgot password modal strings
- "Sei un..." → "I am a..."
- RoleSelector labels: "Studente"→"Student", "Insegnante"→"Teacher", descriptions to English
- Placeholder "tua@email.com" → "your@email.com"
- "La tua password" → "Your password"
- "Conferma Password" / "Conferma la password" → "Confirm Password"
- "Hai dimenticato la password?" → "Forgot password?"
- "Non hai un account? Registrati" → "Don't have an account? Sign up"
- "Hai già un account? Accedi" → "Already have an account? Log in"

## Files to modify
1. **DB migration** — alter unique constraint on `user_roles`
2. **`src/components/auth/AuthPage.tsx`** — fix upsert logic + translate all Italian strings
3. **`src/components/auth/RoleSelector.tsx`** — translate labels to English
4. **`src/components/RoleSwitcher.tsx`** — new component for role switching
5. **`src/components/ProfilePage.tsx`** — add RoleSwitcher section

