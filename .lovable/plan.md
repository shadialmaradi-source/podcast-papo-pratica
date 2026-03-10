

# Fix Community Video Browser for Teachers

## Problem

Two issues causing "No videos found":

1. **Status mismatch**: Student library queries `status = "completed"`, but CommunityVideoBrowser queries `status = "ready"` — likely no videos have status "ready"
2. **Teacher languages gate**: The browser requires `teacher_profiles.languages_taught` to be set. If the teacher hasn't configured languages in branding settings, `teacherLanguages` stays empty and the video fetch is skipped entirely (line 72: `if (teacherLanguages.length === 0) return`)

Both libraries should query the same `youtube_videos` table with the same status filter.

## Changes

### `src/components/teacher/CommunityVideoBrowser.tsx`

- **Fix status filter**: Change `.eq("status", "ready")` → `.eq("status", "completed")` to match the student library
- **Remove teacher_profiles dependency**: Instead of requiring `languages_taught` from teacher_profiles (which may not be set), show a language dropdown defaulting to "all" and let the teacher filter freely. This removes the blocking gate that prevents any videos from loading
- **Always fetch videos**: Remove the `if (teacherLanguages.length === 0) return` guard so videos load immediately on mount
- Keep search, difficulty filter, and language filter as optional refinements

This ensures teachers see the exact same video library that students see, just with a selection UI on top.

