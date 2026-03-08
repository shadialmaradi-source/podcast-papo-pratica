

# Plan: Add Fuzzy Matching for Cloze Exercises

## Problem
Cloze (fill-in-the-blank) exercises use exact string matching. If a user types something very close to the correct answer (e.g., a minor typo like "stema" instead of "stemma"), it's marked wrong.

## Solution
Add a Levenshtein distance helper function and use it for Cloze/fill_blank exercise types. If the edit distance is within a threshold (e.g., 1-2 characters depending on word length), accept the answer as correct.

### `src/components/YouTubeExercises.tsx`
1. Add a `levenshteinDistance(a, b)` utility function above `checkAnswerCorrectness`.
2. Add a `isFuzzyMatch(userAnswer, correctAnswer)` function that:
   - First checks exact match
   - For words ≤ 3 chars: allow distance of 0 (exact only — too short for fuzzy)
   - For words 4-6 chars: allow distance of 1
   - For words 7+ chars: allow distance of 2
3. Update `checkAnswerCorrectness` to use fuzzy matching for `"Cloze"` and `"fill_blank"` types (not MCQ/TF which use option selection).

### Files to modify:
- `src/components/YouTubeExercises.tsx`

