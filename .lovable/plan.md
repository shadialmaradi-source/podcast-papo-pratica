

# Fix Admin Import Access

Your user ID `d16921f2-9385-4bcb-9052-5fd9902956fd` needs to be added to the `FOUNDER_IDS` array in two places:

## Changes

### 1. `src/pages/AdminImport.tsx` (line 18)
Add your UID to the frontend `FOUNDER_IDS` array so the page doesn't redirect you.

### 2. `supabase/functions/admin-import-video/index.ts` (line 13)
Add your UID to the backend `FOUNDER_IDS` array so the edge function accepts your requests.

Both files currently only have `4019daee-273d-48e5-8128-fa3332e9acb0`. Your ID will be added as a second entry.

