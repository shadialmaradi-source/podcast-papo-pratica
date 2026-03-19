

# Student Email Normalization — 1 File

## `src/hooks/useCreateLesson.ts`

**Problem**: `teacher_lessons.student_email` (line 252) stores the raw form value, while `teacher_students.student_email` (line 283) applies `.trim().toLowerCase()`. This creates casing/whitespace mismatches between the two tables.

**Fix**: After line 246 (`setLoading(true)`), normalize the email once into a local const, then use it for both writes.

```typescript
// Add after line 247 (try {)
const normalizedEmail = values.student_email?.trim().toLowerCase() || "";
```

Then:
- Line 252: change `student_email: values.student_email` → `student_email: normalizedEmail`
- Line 283: change `student_email: values.student_email.trim().toLowerCase()` → `student_email: normalizedEmail`

| File | Change |
|------|--------|
| `src/hooks/useCreateLesson.ts` | Normalize email once, use in both lesson insert and student upsert |

1 file, 3 lines changed.

