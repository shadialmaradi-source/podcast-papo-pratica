

# Remove Role Upgrade & Reset Two Accounts to Student

## Changes

### 1. Remove RoleSwitcher from ProfilePage (`src/components/ProfilePage.tsx`)
- Remove the `import { RoleSwitcher }` line
- Remove the `<RoleSwitcher />` usage around line 991
- The component file `src/components/RoleSwitcher.tsx` can stay (unused, no harm) or be deleted

### 2. Update database roles for two accounts
- `shadi.95@hotmail.it` (id: `dfba2332-5a13-441d-84e5-ed3d980ef155`) — change role from `teacher` → `student`
- `androidbarro@gmail.com` (id: `64bddd02-3108-4f4b-a51e-b9ccd5ba46f8`) — change role from `teacher` → `student`

Both are currently set to `teacher` in the `user_roles` table.

