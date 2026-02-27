

# Fix Flashcard Translation Language + Add Native Language Setting

## Two Issues

1. **Flashcards ignore native language**: The `youtube_flashcards` table caches by `video_id` + `difficulty` only — no `native_language` column. So flashcards generated with English translations are served to Italian speakers. The screenshot confirms: "despertar" shows Spanish (not Italian), likely because the flashcard was generated/cached without considering the user's native language.

2. **No way to change native language in profile settings**: The "Account" setting just shows a "coming soon" toast.

## Changes

### 1. Add `native_language` column to `youtube_flashcards`
**Migration**: Add a `native_language TEXT DEFAULT 'en'` column. Update the existing rows to `'en'`.

### 2. Update `generate-flashcards` edge function
**File: `supabase/functions/generate-flashcards/index.ts`**
- Cache lookup: add `.eq('native_language', nativeLanguage)` to the existing query (line ~70)
- Insert: include `native_language` in each flashcard row (line ~170)
- This means each video gets separate flashcard sets per native language

### 3. Add native language selector in Profile Settings
**File: `src/components/ProfilePage.tsx`**
- Load `native_language` from profile data (it's already fetched but not in the `UserProfile` interface)
- Add `native_language` to the `UserProfile` interface
- Replace the "Account" placeholder with a native language picker using a `Select` dropdown
- Options: English 🇬🇧, Spanish 🇪🇸, Portuguese 🇧🇷, French 🇫🇷, Italian 🇮🇹
- On change: update `profiles.native_language` in Supabase + update localStorage `onboarding_native_language` + show toast

### 4. Fix `LessonFlashcards` flag display
**File: `src/components/lesson/LessonFlashcards.tsx`**
- The `getNativeLanguageFlag` function uses 2-letter codes (`it`, `en`) but it's possible the value passed is a full word (`italian`). Add mappings for both formats to ensure the correct flag shows.

