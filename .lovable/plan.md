

# First-Lesson Native-Language Coverage Patch

**Single file**: `src/data/firstLessonContent.ts`

## Changes

### 1. Harden `getLocalizedContent` language resolution (lines 40-57)

Replace the `resolve` function to support canonical names, ISO codes, and locale variants before falling back to English:

```typescript
const langAliases: Record<string, string> = {
  french: 'fr', fr: 'fr',
  spanish: 'es', es: 'es',
  portuguese: 'pt', pt: 'pt',
  german: 'de', de: 'de',
  romanian: 'ro', ro: 'ro',
  russian: 'ru', ru: 'ru',
  polish: 'pl', pl: 'pl',
  ukrainian: 'uk', uk: 'uk',
  czech: 'cs', cs: 'cs',
  serbian: 'sr', sr: 'sr',
  croatian: 'hr', hr: 'hr',
  bosnian: 'bs', bs: 'bs',
  japanese: 'ja', ja: 'ja',
  korean: 'ko', ko: 'ko',
  english: 'en', en: 'en',
  italian: 'it', it: 'it',
};
```

Resolution order:
1. Direct key match (`translations[nativeLanguageCode]`)
2. Normalized ISO key (`translations[langAliases[code]]`)
3. Base code from locale (`fr-FR` → `fr`)
4. Glossary fallback using English base phrase
5. `translations['en']`
6. Literal `fallback` string

### 2. Add glossary-based fallback map

A `translationGlossary` object mapping English base phrases to translations in `de`, `ro`, `ru`, `pl`, `uk`, `cs`, `sr`, `hr`, `bs`, `ja`, `ko`. Covers all phrases used in the English lesson content's `translations` objects (about 30 unique English phrases like "Hello", "Please", "Can I get...", "I ordered", etc.).

The glossary is only consulted when no explicit translation key exists — existing `es`/`pt` translations in the data are untouched.

### 3. No other files touched

No changes to lesson flow, auth, onboarding, or architecture.

## Glossary entries (all 30 English base phrases across all levels)

Covering: Hello, A table for one, I want, Coffee with milk, Please, For how many?, The daily menu, For one, Waiter, Can I get..., What size?, Anything else?, That's all, Thank you, I'd like, Follow me, A table for two, Could we get..., Yes please, I ordered, This looks like, I'm so sorry, Right away, Let me fix it, I've been waiting, Half an hour, Unacceptable, The manager, Let me check, and all speaking phrase translations.

