

# Custom-Paragraph Student UX Patch — 2 Files

## Problem
Paragraph lessons render content as plain text in a Card, missing the word selection, explorer, and suggestion interactions available in TranscriptViewer. Also, `getTranscriptSuggestions` already accepts a `difficulty` param but TranscriptViewer never passes it.

## Changes

### 1. `src/pages/StudentLesson.tsx` (lines 626-634)
Replace the plain-text paragraph Card with a TranscriptViewer, passing `paragraph_content` as the transcript. Format it as a simple timestamped block (`0:00 <content>`) so `parseTranscript` can handle it. Pass `cefrLevel` prop.

```tsx
{lesson.lesson_type === "paragraph" && lesson.paragraph_content && (
  <TranscriptViewer
    videoId={lesson.id}
    transcript={`0:00\n${lesson.paragraph_content}`}
    videoTitle={lesson.title}
    language={lesson.language || "italian"}
    isPremium={true}
    onUpgradeClick={() => {}}
    cefrLevel={lesson.cefr_level}
  />
)}
```

### 2. `src/components/transcript/TranscriptViewer.tsx`
- Add optional `cefrLevel?: string` to the props interface (line 20-36).
- Pass it to `getTranscriptSuggestions` call (line 143) as the 4th `difficulty` argument.
- Hide auto-scroll toggle and timestamp clicks when no `onSeek` is provided (paragraph mode has no video to seek to) — keep this minimal: just conditionally hide the auto-scroll toggle.

## Summary

| File | Change |
|------|--------|
| `src/pages/StudentLesson.tsx` | Replace plain paragraph Card with TranscriptViewer |
| `src/components/transcript/TranscriptViewer.tsx` | Add `cefrLevel` prop, pass to suggestions call |

2 files, ~10 lines changed.

