

# Fix Exercise Translations to Match User's Native Language

## Problem
Same caching issue as flashcards: `youtube_exercises` table has no `native_language` column. Exercises are cached by `video_id` + `difficulty` only. Once generated for one user (e.g., with English translations), all subsequent users get the same translations regardless of their native language setting.

## Changes

### 1. Database Migration
Add `native_language TEXT DEFAULT 'en'` column to `youtube_exercises` table. Set existing rows to `'en'`.

### 2. Edge Function: `generate-level-exercises/index.ts`
- **Cache check** (line 34-38): Add `.eq('native_language', nativeLangName)` so exercises are cached per native language
- **Insert** (line 335-348): Include `native_language: nativeLangName` in each formatted exercise row

### 3. Client: Exercise fetching in `YouTubeExercises.tsx`
- The `get_youtube_exercises_with_answers` RPC function needs a `native_language_param` parameter, OR the client query needs to filter by native language
- Update the RPC call (line 242-245) to pass the user's native language so the correct translation set is returned

### 4. Update RPC function `get_youtube_exercises_with_answers`
- Add `native_language_param` parameter (default `'en'`)
- Add `WHERE native_language = native_language_param` filter

### 5. Update Supabase types
- Add `native_language` field to `youtube_exercises` Row/Insert/Update types
- Update RPC function args type

