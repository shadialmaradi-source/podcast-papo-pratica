

# Teacher Custom-Paragraph Reopen-Context Patch — 1 File

## `src/pages/TeacherLesson.tsx`

### Problem
The fetch query (line 139) does not include `paragraph_content` or `paragraph_prompt`. When a teacher reopens a custom-paragraph lesson, there is no paragraph context visible.

### Changes

**1. Add fields to the Lesson interface (lines 29-41)**

Add `paragraph_content` and `paragraph_prompt` as optional strings:

```typescript
interface Lesson {
  // ...existing fields...
  paragraph_content: string | null;
  paragraph_prompt: string | null;
}
```

**2. Add fields to the select query (line 139)**

```typescript
.select("id, title, student_email, cefr_level, topic, status, youtube_url, transcript, exercise_types, language, lesson_type, paragraph_content, paragraph_prompt")
```

**3. Add paragraph context card (after line 461, before the exercise generation buttons)**

For `lesson_type === "paragraph"` lessons, render a small context card:

```tsx
{lesson.lesson_type === "paragraph" && lesson.paragraph_content && (
  <Card>
    <CardContent className="pt-4 space-y-3">
      {lesson.paragraph_prompt && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Prompt</p>
          <p className="text-sm text-muted-foreground italic">{lesson.paragraph_prompt}</p>
        </div>
      )}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Generated Paragraph</p>
        <div className="bg-background rounded-md p-4 text-foreground leading-relaxed whitespace-pre-wrap border text-sm">
          {lesson.paragraph_content}
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

| File | Change |
|------|--------|
| `src/pages/TeacherLesson.tsx` | Add `paragraph_content`, `paragraph_prompt` to interface, query, and render a context card |

1 file, ~20 lines added.

