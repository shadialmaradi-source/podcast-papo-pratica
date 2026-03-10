

# Auto-Add Students on Lesson Creation + Fix Video Browser

## Issue 1: Auto-add student to teacher_students on lesson creation

When a teacher creates a lesson with a student email, that student should automatically appear in the "My Students" roster. Currently nothing inserts into `teacher_students`.

### Change: `src/components/teacher/CreateLessonForm.tsx`

After the lesson is successfully inserted (line ~310, after `if (error) throw error`), add an upsert to `teacher_students`:

```typescript
// Auto-add student to roster if not already there
await supabase
  .from("teacher_students" as any)
  .upsert({
    teacher_id: user.id,
    student_email: values.student_email.toLowerCase(),
    status: "invited",
  } as any, { onConflict: "teacher_id,student_email", ignoreDuplicates: true });
```

This uses `ignoreDuplicates: true` so existing students aren't overwritten. The unique constraint on `(teacher_id, student_email)` prevents duplicates. The student appears with at least the email; the teacher can later edit to add name, level, native language.

## Issue 2: Video browser shows "No videos found"

The `CommunityVideoBrowser` component queries `youtube_videos` with `status = 'completed'`. There are 13 completed videos in the DB and RLS allows reading them. The query should work for any authenticated user.

The likely cause: the component casts `from("youtube_videos" as any)` but `youtube_videos` **is** in the generated types, so it doesn't need the `as any` cast. Removing it ensures proper type inference and avoids potential silent failures.

### Change: `src/components/teacher/CommunityVideoBrowser.tsx`

- Remove the `as any` cast from the `.from("youtube_videos" as any)` call (line 55) to use proper typed queries
- Also pass the video title properly to `VideoBrowserModal` by extending the `onSelectVideo` callback to include title

### Change: `src/components/teacher/VideoBrowserModal.tsx`

- Update `handleSelectVideo` and `CommunityVideoBrowser` usage to pass the video title along with the URL, so the assign modal shows the real title instead of "YouTube Video (id)"

---

**Files to edit:**
- `src/components/teacher/CreateLessonForm.tsx` — add upsert to teacher_students after lesson creation
- `src/components/teacher/CommunityVideoBrowser.tsx` — remove `as any` cast, pass title with URL
- `src/components/teacher/VideoBrowserModal.tsx` — receive title from browser

