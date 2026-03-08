

# Plan: Add Language Filter to Flashcard Study Options

## Problem
When a user has flashcards from multiple languages, the Study Options section mixes them all together. The user should first pick a language before filtering by video, but only if they have flashcards in 2+ languages.

## Changes

### `src/components/FlashcardRepository.tsx`

1. **Detect distinct languages** from loaded flashcards by collecting unique `video_language` values.

2. **Add language state** (`selectedLanguage`): defaults to the only language if there's just one, or `null` if multiple.

3. **Add a language selector** (Select dropdown with flag icons) above the existing filter dropdown — only rendered when 2+ languages exist. Use `getLanguageFlag` and `getLanguageName` from `languageUtils.ts`.

4. **Filter flashcards by language**: Update `getFilteredFlashcards` to first filter by `selectedLanguage`, then apply the existing filter (all/unmastered/video). Also filter `videoGroups` display by selected language.

5. **Update `startStudySession`** to pass the selected language to `setStudyLanguage` instead of detecting from first card.

6. **Update stats** (total, mastered, videos counts) to reflect the language-filtered set.

### Files to modify
- `src/components/FlashcardRepository.tsx`

