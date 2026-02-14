
# Fix: Pass Native Language to Exercise Generation

## Problem
The `generate-level-exercises` edge function already supports `nativeLanguage` and uses it to generate `questionTranslation` fields, but `YouTubeVideoExercises.tsx` never sends this parameter. It defaults to `'english'` on the backend, which is wrong when the user's native language is something else.

## Solution
Update `YouTubeVideoExercises.tsx` to fetch the user's native language and pass it in the edge function call.

## Changes (1 file)

### `src/components/YouTubeVideoExercises.tsx`

1. **Fetch native language** from the user's profile (authenticated) or `localStorage` (guest), defaulting to `'english'`.
2. **Pass `nativeLanguage`** in the `generate-level-exercises` call body alongside `videoId`, `level`, `transcript`, and `language`.

The logic:
```text
1. Try: supabase profiles.native_language (logged-in user)
2. Fallback: localStorage 'onboarding_native_language'  
3. Default: 'english'
```

Add to the `handleStartExercises` function, before calling the edge function:
- Query the authenticated user's profile for `native_language`
- Include it in the request body: `nativeLanguage: userNativeLanguage`

This is a small, focused fix -- the edge function and the `TranslationHint` UI component are already working correctly. The only gap is this missing parameter.
