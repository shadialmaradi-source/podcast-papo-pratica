

# Plan: Fix 401 Error in generate-level-exercises Edge Function

## Problem
The previous fix replaced `getUser()` with `getClaims()` in the edge function's auth check. However, `getClaims()` is **not a standard method** in supabase-js v2.7.1. It may work intermittently or fail silently, causing 401 Unauthorized responses.

## Solution
Replace the broken `getClaims` auth check with the standard `getUser()` pattern. The key is to create the auth client with the user's Authorization header, then call `getUser()` — this is the standard Supabase edge function authentication approach.

## Changes

### `supabase/functions/generate-level-exercises/index.ts`
Replace lines 21-26 (the broken `getClaims` block) with:

```typescript
const authSupabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
  { global: { headers: { Authorization: authHeader } } }
);
const { data: { user: authUser }, error: authError } = await authSupabase.auth.getUser();
if (authError || !authUser) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized', success: false }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

This is the standard, documented pattern for validating auth in Supabase edge functions. The client is created with the user's bearer token in the global headers, and `getUser()` validates it server-side.

No other files need changes. The edge function will be auto-deployed.

