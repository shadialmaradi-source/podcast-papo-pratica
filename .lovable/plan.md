

# Plan: Add "From Community" Video Source for YouTube Lessons

## Summary

When a teacher selects "YouTube / Video Link", they see a new sub-choice: **From Scratch** (paste URL manually) or **From Community** (browse platform videos filtered by their taught languages). Selecting a community video passes its URL to the existing `CreateLessonForm`, which now accepts an optional `prefillYoutubeUrl` prop to pre-fill and lock the URL field.

## Flow

```text
Home -> Choose Type -> [Paragraph | YouTube]
                                  |
                          YouTube Sub-Choice
                         /                  \
                  From Scratch         From Community
                  (form as-is)         (video browser)
                                            |
                                      Select video
                                            |
                                      form (URL pre-filled)
```

After selecting a community video, the teacher lands on the same form shown in the screenshot: CEFR Level, Video Language, Lesson Title, Student Email, Translation Language, Exercise Types, Create Lesson / Cancel.

## Files to Create

### 1. `src/components/teacher/YouTubeSourceSelector.tsx`
Two-card picker (reuses `LessonTypeSelector` pattern):
- "From Scratch" (Link icon) -- teacher enters a URL manually
- "From Community" (Globe icon) -- browse existing platform videos

### 2. `src/components/teacher/CommunityVideoBrowser.tsx`
Video browser that:
- Fetches teacher's `languages_taught` from `teacher_profiles`
- Queries `youtube_videos` table filtered by those languages + `status = 'ready'`
- Shows search input (debounced), language filter dropdown, difficulty filter
- Displays video cards (thumbnail, title, duration, difficulty) using a simplified card layout
- On click, calls `onSelectVideo(youtubeUrl: string)` with the reconstructed YouTube URL

## Files to Modify

### 3. `src/pages/TeacherDashboard.tsx`
- Add new flow steps: `"youtube_source"` and `"youtube_browse"`
- When teacher selects YouTube type -> go to `"youtube_source"` step
- "From Scratch" -> go to `"form"` step (current behavior)
- "From Community" -> go to `"youtube_browse"` step showing `CommunityVideoBrowser`
- When video selected -> set `prefillYoutubeUrl` state, go to `"form"` step

### 4. `src/components/teacher/CreateLessonForm.tsx`
- Add optional `prefillYoutubeUrl?: string` prop
- If provided, set `youtube_url` default value and make the URL input read-only (teacher already chose the video)

## Technical Details

- Community video query: `supabase.from("youtube_videos").select("id, video_id, title, thumbnail_url, duration, difficulty_level, language, is_short, category").eq("status", "ready").in("language", teacherLanguages)`
- URL reconstruction: `https://www.youtube.com/watch?v=${video.video_id}`
- Debounced search uses existing `useDebounce` hook on title field
- Reuses existing `VideoCard` component from `src/components/library/VideoCard.tsx`

