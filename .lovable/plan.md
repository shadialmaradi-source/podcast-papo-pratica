

# Add Interactive Transcript and Exercises to Learning Path Videos

## What's Missing Today

The hybrid mode (transcript exists but no `linked_video_id`) currently shows the transcript as **plain text** in a scrollable box. It's missing:

1. **Interactive transcript** -- word highlighting, text selection to create flashcards, AI-suggested vocabulary, word explorer panel
2. **Exercise flow** -- no "Start Exercises" button, no speaking practice, no flashcards step

## The Solution

Replace the plain-text transcript with the full **TranscriptViewer** component, and add exercise generation + lesson flow using the transcript from `week_videos.transcript`.

### Step 1: Use TranscriptViewer in Hybrid Mode

In `src/pages/WeekVideo.tsx`, replace the plain `<p>` transcript display with the `TranscriptViewer` component for premium users:

```
<TranscriptViewer
  videoId={video.id}         // week_video ID (used for flashcard/suggestion storage)
  transcript={video.transcript}
  videoTitle={video.title}
  language={week.language || "english"}
  isPremium={isPremium}
  onUpgradeClick={() => navigate("/premium")}
/>
```

The `TranscriptViewer` accepts the transcript as a string prop, so it works directly with `week_videos.transcript`. The `videoId` is used for saving flashcards and loading suggestions -- using `video.id` (the week_video UUID) keeps these scoped correctly.

### Step 2: Add "Start Exercises" Button to Hybrid Mode

Below the transcript, add a "Start Exercises" button that transitions into the exercise flow. This will:

- Call the `generate-exercises-from-transcript` edge function with `video.transcript` to generate exercises on the fly
- Store them in `youtube_exercises` keyed by `video.id` (the week_video UUID)
- Then transition to the exercises step using `YouTubeExercises` with `videoId={video.id}`

Since `YouTubeExercises` fetches exercises from `youtube_exercises` by `video_id`, and the generate function inserts them there, this will work if we use the week_video's UUID as the `video_id`.

### Step 3: Enable Full Lesson Flow in Hybrid Mode

Change the hybrid mode from "video + transcript + complete" to the full step flow:

**Video + Interactive Transcript** --> **Exercises** --> **Speaking** --> **Flashcards** --> **Complete**

- The "video" step shows the YouTube embed plus `TranscriptViewer` with a "Start Exercises" button
- Clicking "Start Exercises" generates exercises from the transcript (if not already generated) and moves to the exercises step
- Speaking and flashcards steps use the same components, passing `video.id` as the videoId

### Step 4: Handle Exercise Generation for Week Videos

Add a generate-exercises flow in the hybrid video step:
- Before starting exercises, check if exercises exist in `youtube_exercises` for this `video.id`
- If not, call the `generate-exercises-from-transcript` edge function with the transcript text
- Show a loading spinner while generating
- Once ready, transition to the exercises step

## Technical Details

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/WeekVideo.tsx` | Replace plain transcript with `TranscriptViewer`. Add exercise generation logic. Enable full lesson step flow (video, exercises, speaking, flashcards, complete) in hybrid mode. Add "Start Exercises" button with generate-on-demand. |

### How Exercise Generation Works

The existing `generate-exercises-from-transcript` edge function accepts a transcript string and returns exercises. We reuse this:

1. User clicks "Start Exercises"
2. Check `youtube_exercises` table for existing exercises with `video_id = week_video.id`
3. If none exist, call the edge function with `video.transcript`
4. Insert returned exercises into `youtube_exercises` with `video_id = week_video.id`
5. Transition to `YouTubeExercises` component

### No Database Changes Needed

- `TranscriptViewer` works with any UUID as `videoId` -- flashcards and suggestions will be stored against the `week_video.id`
- Exercises will be stored in `youtube_exercises` using `week_video.id` as `video_id`
- No new tables or columns required

