

# Fix Translation Hints and Mobile Exercise UI

## Issues Found

1. **English exercises show English translation**: Your profile (`shadi.almaradi@gmail.com`) has `native_language` set to `null` in the database. When generating exercises, the code defaults to `'english'`, so English exercises get translated to English (same language -- useless). The fix needs to detect when the native language matches the target language and skip the translation, or pick a sensible fallback.

2. **Italian exercises have no translation hint**: These exercises were generated before the native language feature was deployed, so their `question_translation` column is empty. New exercises will have translations, but the existing ones need to be regenerated.

3. **Ugly mobile exercise header**: The exercise screen shows "Transcript-Based Exercises" as the title, displays the raw video UUID (e.g., `c5c4bc7b-6ecc-4a29-a18c-0b38561860c7`), and shows badges like "20 Custom Exercises - Intense" that overflow on mobile.

---

## Plan

### 1. Smart translation fallback logic (`YouTubeVideoExercises.tsx`)

Update the native language resolution to handle edge cases:
- If `native_language` is null/empty, check `localStorage`
- If still empty, detect from browser language
- **If the resolved native language matches the video's target language**, skip translation (don't pass `nativeLanguage`, or pass a different fallback like `'english'` for non-English content)

### 2. Clean up exercise header for mobile (`YouTubeExercises.tsx`)

- Replace "Transcript-Based Exercises" with just "Exercises"
- Remove the badge showing the raw video UUID (`Video: c5c4bc7b-...`)
- Remove or simplify the "20 Custom Exercises - Intense" badge
- Make the header layout responsive: stack elements vertically on mobile
- Keep only the level badge (e.g., "beginner") as useful context

### 3. Hide translation when same language

In the `TranslationHint` component or at the exercise rendering level, add a check: if the translation text is essentially the same as the question (same language), don't show the hint at all. This handles existing data where translations were generated in the same language as the question.

---

## Technical Details

### Files to modify

| File | Changes |
|------|---------|
| `src/components/YouTubeVideoExercises.tsx` | Add logic: if resolved native language equals video language, use browser language or `'english'` as fallback |
| `src/components/YouTubeExercises.tsx` (lines 792-820) | Simplify header: remove "Transcript-Based Exercises" title, remove video UUID badge, remove intensity badge, make layout mobile-friendly |
| `src/components/exercises/TranslationHint.tsx` | Add guard: don't render if translation is too similar to the parent question (same-language detection) |

### Native language resolution (updated logic)

```text
1. Fetch profile.native_language
2. Fallback: localStorage 'onboarding_native_language'
3. Fallback: detect from browser (navigator.language)
4. Final fallback: 'english'
5. GUARD: if resolvedNative == videoLanguage, use 'english' instead
   (unless videoLanguage is also English, then use browser language)
```

### Header cleanup (before/after)

Before (mobile):
```text
[Back to Video] [beginner] [Video: c5c4bc7b-6ecc-...] [20 Custom Exercises - Intense]
```

After (mobile):
```text
[Back to Video]
Exercises
[beginner]
```

