

# Custom-Paragraph Quiz-Quality Deduplication — 1 File

## `supabase/functions/generate-lesson-exercises-by-type/index.ts`

### Problem
The MCQ generation loop (lines 188–250) tells the model "make it different" but provides no concrete context about what was already generated. The model frequently produces near-duplicate questions or option sets.

### Changes

**1. Add fingerprint helper (before `serve`):**

```typescript
function mcqFingerprint(content: any): string {
  const q = (content.question || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const opts = (content.options || []).map((o: string) => o.toLowerCase().replace(/[^a-z0-9]/g, "")).sort().join("|");
  return `${q}::${opts}`;
}

function isDuplicateMCQ(newContent: any, existing: any[]): boolean {
  const newFp = mcqFingerprint(newContent);
  return existing.some(e => {
    const fp = mcqFingerprint(e.content);
    return fp === newFp;
  });
}
```

**2. Inject prior questions into the prompt (line ~199, inside the system prompt for q > 0 and exerciseType === "multiple_choice"):**

When `exerciseType === "multiple_choice"` and `q > 0`, append the previously accepted questions as explicit avoidance constraints:

```typescript
const priorQuestions = exerciseType === "multiple_choice" && generatedExercises.length > 0
  ? `\n\nDo NOT repeat or rephrase any of these previously generated questions:\n${generatedExercises.map((e, i) => `${i + 1}. "${e.content.question}"`).join("\n")}`
  : "";
```

Add `${priorQuestions}` to the system prompt.

**3. Add retry loop around MCQ generation (wrap the AI call + parse block for `multiple_choice` type):**

For `multiple_choice` exercises, wrap the generate-parse-accept block in a retry loop (max 3 attempts). If the parsed result is a duplicate (per `isDuplicateMCQ`), retry. For non-MCQ types, no retry — behavior unchanged.

```typescript
const maxAttempts = exerciseType === "multiple_choice" ? 3 : 1;
let accepted = false;

for (let attempt = 0; attempt < maxAttempts && !accepted; attempt++) {
  // ... existing AI call + parse logic ...
  
  if (exerciseType === "multiple_choice" && isDuplicateMCQ(content, generatedExercises)) {
    console.log(`Duplicate MCQ rejected (q${q}, attempt ${attempt + 1})`);
    continue;
  }
  
  generatedExercises.push({ ... });
  accepted = true;
}
```

### Summary

| Change | Detail |
|--------|--------|
| `mcqFingerprint` + `isDuplicateMCQ` helpers | Normalize and compare question+options |
| Prior questions in system prompt | Tell model what to avoid |
| Bounded retry (max 3) for MCQ only | Reject duplicates before save |

1 file, ~30 lines added. Non-MCQ exercise types unaffected.

