

# Plan: Translate Flashcards Based on Native Language

## Problem
The flashcards in `onboarding_videos` store translations only in English. When a user selects Spanish (or any other language) as their native language, the back of the flashcard still shows English text. The screenshot confirms: the Spanish flag is correct, but the translation text is in English.

## Solution
Update the flashcard data in the database to include translations for multiple native languages, and update the frontend to select the correct one.

### 1. Update flashcard JSONB structure in the database
Change each flashcard's `translation` field from a plain string to a map keyed by native language code:

```json
{
  "phrase": "luggage",
  "translation": {
    "en": "Bags and suitcases you travel with",
    "es": "Bolsas y maletas con las que viajas",
    "pt": "Malas e bolsas com as quais você viaja",
    "fr": "Sacs et valises avec lesquels vous voyagez",
    "it": "Borse e valigie con cui viaggi"
  },
  "why": { 
    "en": "Essential travel vocabulary",
    "es": "Vocabulario esencial de viaje",
    "pt": "Vocabulário essencial de viagem",
    "fr": "Vocabulaire de voyage essentiel",
    "it": "Vocabolario essenziale di viaggio"
  }
}
```

One SQL migration will update all 4 English level rows (20 flashcards total) with translations in all 5 supported native languages (en, es, pt, fr, it).

### 2. Update `LessonFlashcards.tsx` to resolve the correct translation
When rendering the back of a flashcard, use `nativeLanguage` (already passed as a prop) to pick the right translation string from the map. Fall back to English if the native language key is missing, and fall back to the raw string if the value is not a map (backward compatibility with old format).

```typescript
const getLocalizedText = (field: string | Record<string, string>, lang: string): string => {
  if (typeof field === 'string') return field; // backward compat
  return field[lang] || field['en'] || Object.values(field)[0] || '';
};
```

### 3. Files changed
- **SQL migration**: Update all 20 flashcards across 4 English rows with multi-language translations and "why" fields
- **`src/components/lesson/LessonFlashcards.tsx`**: Add `getLocalizedText` helper, use it for `translation` and `why` display

### Note
The same pattern should eventually apply to `exercises` and `speaking_phrases`, but this change focuses on the flashcards as reported.

