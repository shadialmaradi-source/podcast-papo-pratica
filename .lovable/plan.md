

# Custom-Paragraph Translation-Language Consistency — 4 Files

## Problem
`analyzeWord` service and the `analyze-word` edge function hardcode "English" as the translation language. The FlashcardCreatorModal label says "Translation (English)". None of these respect `translation_language` from the lesson form.

## Changes

### 1. `src/services/wordAnalysisService.ts`
Add optional `nativeLanguage` parameter to `analyzeWord`, default `"english"`. Pass it to the edge function body.

```typescript
export async function analyzeWord(
  word: string,
  language: string,
  contextSentence?: string,
  nativeLanguage: string = "english"
): Promise<WordAnalysis> {
  const { data, error } = await supabase.functions.invoke("analyze-word", {
    body: { word, language, contextSentence, nativeLanguage },
  });
  // ...
}
```

### 2. `supabase/functions/analyze-word/index.ts`
- Read `nativeLanguage` from request body (default `"english"`).
- Replace all hardcoded "English" references in prompts and schema descriptions with the dynamic `nativeLanguage` value.

Key changes (lines 15, 29-32, 60-61, 70-74):
```typescript
const { word, language, contextSentence, nativeLanguage } = await req.json();
const targetLang = nativeLanguage || "english";

// System prompt: "speaks {targetLang}" instead of "speaks English"
// Schema descriptions: "{targetLang} translation" instead of "English translation"
```

### 3. `src/hooks/useCreateLesson.ts`
In `handleExploreWord` (line 215), pass `translation_language` as the 4th argument:

```typescript
const translationLang = form.getValues("translation_language") || "english";
const analysis = await analyzeWord(selection.text, language, selection.fullSentence, translationLang);
```

### 4. `src/components/transcript/FlashcardCreatorModal.tsx`
- Add `translationLanguage` prop (default `"english"`).
- Pass it to `analyzeWord` call (line 103).
- Use it in the translation label (line 189): `Translation ({capitalizedLang})` instead of hardcoded `Translation (English)`.
- Use it in placeholder text.

### 5. Callers of FlashcardCreatorModal — pass `translationLanguage`

**`src/components/teacher/CreateLessonForm.tsx`** (line 323-338): Add `translationLanguage={form.watch("translation_language") || "english"}` prop.

**`src/components/teacher/LessonPostCreationView.tsx`** (line 384-395):
- Add `translationLanguage` to the component props interface.
- Pass it through from CreateLessonForm.
- Forward to FlashcardCreatorModal.

**`src/components/transcript/TranscriptViewer.tsx`**: This is the YouTube/video transcript viewer — out of scope per instructions. It will continue defaulting to "english".

## Summary

| File | Change |
|------|--------|
| `src/services/wordAnalysisService.ts` | Add `nativeLanguage` param, pass to edge function |
| `supabase/functions/analyze-word/index.ts` | Use dynamic `nativeLanguage` instead of hardcoded "English" |
| `src/hooks/useCreateLesson.ts` | Pass `translation_language` to `analyzeWord` |
| `src/components/transcript/FlashcardCreatorModal.tsx` | Add `translationLanguage` prop, dynamic label, pass to `analyzeWord` |
| `src/components/teacher/CreateLessonForm.tsx` | Pass `translationLanguage` to FlashcardCreatorModal |
| `src/components/teacher/LessonPostCreationView.tsx` | Accept and forward `translationLanguage` prop |

6 files, ~25 lines changed. No architectural changes.

