## Reuse lesson — with new student, level, and translation language

Add a **Reuse** button next to each lesson on `/teacher/lessons`. Clicking it opens a small modal where the teacher picks:

1. **Student email** (with autocomplete from the teacher's existing students; can also type a new one — leaving blank is allowed)
2. **CEFR level** (A1–C2, defaults to original)
3. **Translation language** (defaults to original)

Everything else is copied 1:1 from the source lesson: title, video/paragraph content, transcript, exercise types, language, lesson type, topic. A fresh `share_token` is generated. **Exercises are not copied** — they're re-generated from scratch using the new level/translation language so the difficulty actually matches what the teacher picked. The new lesson is created with `status = 'draft'`, exercises generate in the background, then status flips to `'ready'`.

### Flow

```text
[Reuse] click
   │
   ▼
ReuseLessonModal
  - student email (combobox: existing students + free text)
  - cefr_level (select, prefilled)
  - translation_language (select, prefilled)
  - [Cancel]  [Reuse lesson]
   │
   ▼
1. Insert new teacher_lessons row
   (copy: title, lesson_type, language, youtube_url, paragraph_*, transcript,
    topic, exercise_types; new: teacher_id=me, student_email, cefr_level,
    translation_language, share_token, status='draft')
2. Upsert teacher_students if email is new
3. For each exercise type → invoke generate-lesson-exercises-by-type
   (already uses the lesson's own cefr_level + translation_language)
4. Toast "Lesson reused — exercises generating…"
5. Navigate to /teacher/lesson/<new-id>
```

### Files

- **New:** `src/components/teacher/ReuseLessonModal.tsx` — the modal (Dialog + Select + email combobox + submit handler that does the insert + generate calls).
- **Edit:** `src/components/teacher/LessonList.tsx`
  - Fetch a couple more fields needed for the copy (`language`, `translation_language`, `lesson_type`, `youtube_url`, `paragraph_prompt`, `paragraph_content`, `transcript`, `topic`).
  - Add a "Reuse" button (Copy icon) in the actions column next to Generate / Start.
  - Wire it to open `ReuseLessonModal` with the source lesson.
  - On success, refresh the list and navigate to the new lesson.

### Why exercises are re-generated, not copied

The user explicitly wants to **change difficulty and translation language** — copied exercises would still be at the old level/translation. The existing `generate-lesson-exercises-by-type` edge function reads `cefr_level` and `translation_language` from the new lesson row, so it produces correct content automatically. Transcript is preserved, so generation is fast (no re-fetch).

### Edge cases handled

- Lesson limit trigger (`enforce_teacher_lesson_limit`) still applies → surfaced as a clear toast.
- If the teacher's monthly quota is exceeded, the modal shows the error and stays open.
- Empty student email allowed (creates an unassigned reusable copy).
- If the source lesson has no transcript yet, the new lesson will fetch it on-demand the same way the original page does (existing logic from earlier fix).

No DB migration needed.
