
# Video Transcript Viewer with Flashcard Creation

## Summary
Add a premium-only interactive transcript viewer to the video lesson page that allows users to read along with videos and create custom flashcards by selecting text directly from the transcript.

---

## Architecture Overview

```text
+----------------------+     +---------------------+     +-------------------+
| YouTubeVideoExercises| --> | TranscriptViewer    | --> | FlashcardCreator  |
| (Video + Transcript) |     | (Premium gated)     |     | Modal             |
+----------------------+     +---------------------+     +-------------------+
         |                           |                          |
         v                           v                          v
+-------------------+     +----------------------+     +------------------+
| useSubscription   |     | TextSelectionPopover |     | user_created_    |
| (Premium check)   |     | (Selection actions)  |     | flashcards table |
+-------------------+     +----------------------+     +------------------+
```

---

## Database Changes

### New Table: `user_created_flashcards`

This table stores flashcards created by users from transcript selections:

```sql
CREATE TABLE user_created_flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES youtube_videos(id) ON DELETE CASCADE,
  phrase TEXT NOT NULL,                    -- Selected text from transcript
  translation TEXT,                        -- User-provided translation
  part_of_speech TEXT,                     -- noun, verb, adjective, etc.
  example_sentence TEXT,                   -- Full sentence from context
  notes TEXT,                              -- Optional user notes
  source_timestamp TEXT,                   -- Timestamp in transcript (00:00)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_mastered BOOLEAN DEFAULT FALSE,
  times_reviewed INTEGER DEFAULT 0
);

-- Index for fast user lookups
CREATE INDEX idx_user_created_flashcards_user ON user_created_flashcards(user_id);
CREATE INDEX idx_user_created_flashcards_video ON user_created_flashcards(video_id);

-- RLS policies
ALTER TABLE user_created_flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own flashcards" ON user_created_flashcards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own flashcards" ON user_created_flashcards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flashcards" ON user_created_flashcards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own flashcards" ON user_created_flashcards
  FOR DELETE USING (auth.uid() = user_id);
```

---

## Components to Create

### 1. TranscriptViewer Component
**File:** `src/components/transcript/TranscriptViewer.tsx`

Main component that displays the video transcript with premium gating.

**Props:**
- `videoId: string` - Database video UUID
- `isPremium: boolean` - User subscription status
- `onUpgradeClick: () => void` - Callback to show upgrade modal

**Features:**
- Parses transcript text with timestamps `(00:00)`
- Shows full transcript for premium users
- Shows blurred/locked transcript for free users
- Auto-scroll toggle (follows video playback)
- Text size controls (small/medium/large)
- Clickable timestamps to seek video

**Layout:**
```
+-----------------------------------+
| Transcript          [Auto][Aa][+] | <- Header with controls
|-----------------------------------|
| [00:00] Good morning! I am        |
| brushing my teeth.                |
|                                   |
| [00:03] This is my toothbrush.    | <- Highlighted line (current)
|                                   |
| [00:06] This is toothpaste.       |
+-----------------------------------+
```

### 2. TranscriptLine Component
**File:** `src/components/transcript/TranscriptLine.tsx`

Individual line component with timestamp and text selection support.

**Props:**
- `timestamp: string` - Time in format "00:00"
- `text: string` - Transcript text
- `isHighlighted: boolean` - Currently playing line
- `savedPhrases: string[]` - Phrases already saved as flashcards
- `onTimestampClick: (time: number) => void`
- `onTextSelect: (text: string, fullSentence: string, timestamp: string) => void`

**Features:**
- Clickable timestamp (styled as badge)
- Text selection detection
- Saved phrases shown with highlight/underline
- Mobile-friendly touch selection

### 3. TextSelectionPopover Component
**File:** `src/components/transcript/TextSelectionPopover.tsx`

Floating popup that appears when user selects text.

**Props:**
- `selectedText: string`
- `position: { x: number, y: number }`
- `onCreateFlashcard: () => void`
- `onDismiss: () => void`

**Layout:**
```
+---------------------------+
| Create Flashcard     |
+---------------------------+
       ^
"selected text here"
```

### 4. FlashcardCreatorModal Component
**File:** `src/components/transcript/FlashcardCreatorModal.tsx`

Modal dialog for creating/editing flashcards from transcript.

**Props:**
- `open: boolean`
- `onOpenChange: (open: boolean) => void`
- `selectedText: string` - Pre-filled phrase
- `fullSentence: string` - Context sentence
- `timestamp: string` - Source timestamp
- `videoId: string` - Video UUID
- `videoTitle: string` - Video name for display
- `language: string` - Target language
- `onSuccess: () => void` - Callback after save

**Form Fields:**
1. Word/Phrase (pre-filled, editable)
2. Translation (manual input)
3. Part of Speech (dropdown: noun, verb, adjective, adverb, phrase, other)
4. Example Sentence (pre-filled with full sentence)
5. Notes (optional text area)

**Layout:**
```
+---------------------------------------+
| Create New Flashcard               X |
|---------------------------------------|
| Word/Phrase:                          |
| [brushing my teeth                  ] |
|                                       |
| Translation (English):                |
| [Enter translation...               ] |
|                                       |
| Part of Speech:                       |
| [verb phrase v]                       |
|                                       |
| Example Sentence:                     |
| [I am brushing my teeth.            ] |
|                                       |
| Notes (optional):                     |
| [                                   ] |
|                                       |
| From: Morning Routine #1              |
| Timestamp: 00:09                      |
|                                       |
| [Cancel]                    [Save]    |
+---------------------------------------+
```

### 5. LockedTranscript Component
**File:** `src/components/transcript/LockedTranscript.tsx`

Blurred transcript overlay for free users.

**Props:**
- `previewText: string` - First 2-3 lines shown clearly
- `onUpgradeClick: () => void`

**Layout:**
```
+-----------------------------------+
| Transcript              Lock      |
|-----------------------------------|
| [00:00] Good morning! I am...     | <- Clear preview
|                                   |
| ░░░░░ ░░░░░░░! ░ ░░              | <- Blurred
| ░░░░░░░░ ░░ ░░░░░.               |
|                                   |
|   [Unlock Transcript - Upgrade]   |
+-----------------------------------+
```

---

## Files to Modify

### 1. YouTubeVideoExercises.tsx
Add the TranscriptViewer component below the video player.

**Changes:**
- Import TranscriptViewer component
- Fetch transcript data (already fetched for exercises)
- Add subscription check using useSubscription hook
- Pass transcript to TranscriptViewer
- Handle upgrade modal state

**Updated Layout:**
```
+------------------+------------------+
|                  |                  |
|   VIDEO PLAYER   |   EXERCISES      |
|   (YouTube)      |   PANEL          |
|                  |                  |
+------------------+------------------+
|                                     |
|         TRANSCRIPT VIEWER           |
|         (Collapsible)               |
|                                     |
+-------------------------------------+
```

### 2. ProfilePage.tsx
Add user-created flashcards to the Flashcards section.

**Changes:**
- Fetch count of user-created flashcards
- Display combined count (system + user-created)
- Update FlashcardRepository to include user-created cards

### 3. FlashcardRepository.tsx
Include user-created flashcards in study sessions.

**Changes:**
- Fetch from both `youtube_flashcards` and `user_created_flashcards`
- Add filter option for "My Created Cards"
- Allow editing/deleting user-created cards

### 4. services/flashcardService.ts
Add functions for user-created flashcards.

**New Functions:**
```typescript
// Create flashcard from transcript selection
async function createFlashcardFromTranscript(
  userId: string,
  videoId: string,
  data: {
    phrase: string;
    translation?: string;
    partOfSpeech?: string;
    exampleSentence?: string;
    notes?: string;
    sourceTimestamp?: string;
  }
): Promise<{ success: boolean; error?: string }>

// Get user's created flashcards for a video
async function getUserCreatedFlashcards(
  userId: string,
  videoId?: string
): Promise<UserCreatedFlashcard[]>

// Check if phrase is already saved
async function isPhraseSaved(
  userId: string,
  videoId: string,
  phrase: string
): Promise<boolean>

// Get saved phrases for highlighting
async function getSavedPhrasesForVideo(
  userId: string,
  videoId: string
): Promise<string[]>
```

### 5. pdfGeneratorService.ts
Include user-created flashcards in PDF export.

**Changes:**
- Fetch user-created flashcards alongside system flashcards
- Format appropriately for PDF output

---

## Utility Functions

### Transcript Parser
**File:** `src/utils/transcriptUtils.ts`

```typescript
interface TranscriptSegment {
  timestamp: string;      // "00:00"
  timeSeconds: number;    // 0
  text: string;           // "Good morning! I am..."
}

// Parse raw transcript into segments
function parseTranscript(rawTranscript: string): TranscriptSegment[]

// Convert timestamp string to seconds
function timestampToSeconds(timestamp: string): number

// Find segment for current playback time
function getCurrentSegment(segments: TranscriptSegment[], currentTime: number): number

// Extract full sentence containing selection
function getFullSentence(text: string, selection: string): string
```

---

## User Flows

### Premium User - Create Flashcard
1. User watches video with transcript visible below
2. User sees transcript auto-scrolling with current line highlighted
3. User selects a word/phrase by clicking and dragging
4. Floating popover appears above selection: "Create Flashcard"
5. User clicks "Create Flashcard"
6. Modal opens with pre-filled phrase and example sentence
7. User enters translation and optionally selects part of speech
8. User clicks "Save"
9. Toast: "Flashcard saved! ✨"
10. Selected phrase now shows highlight in transcript
11. Modal closes, user continues watching

### Free User - See Upgrade Prompt
1. User sees blurred transcript section below video
2. First 2-3 lines are readable as preview
3. User clicks "Unlock Transcript" button
4. UpgradePrompt modal appears with benefits list
5. User can upgrade or dismiss

### Premium User - Review Created Flashcards
1. User goes to Profile > Flashcards
2. User sees "My Created Cards" filter option
3. User selects filter to see their custom flashcards
4. Study session works the same as system flashcards
5. User can edit or delete their created cards

---

## Technical Specifications

### Text Selection Detection
```typescript
// Hook for detecting text selection
function useTextSelection(containerRef: RefObject<HTMLElement>) {
  const [selection, setSelection] = useState<{
    text: string;
    position: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelection({
          text: sel.toString().trim(),
          position: { x: rect.left + rect.width / 2, y: rect.top - 10 }
        });
      }
    };

    const container = containerRef.current;
    container?.addEventListener('mouseup', handleMouseUp);
    return () => container?.removeEventListener('mouseup', handleMouseUp);
  }, []);

  return { selection, clearSelection: () => setSelection(null) };
}
```

### Transcript Format (from DB sample)
```
Title - YouTube
https://www.youtube.com/watch?v=...

Transcript:
(00:00) First sentence here.
(00:21) Second sentence continues...
```

The parser will:
1. Skip title and URL lines
2. Extract timestamp in `(MM:SS)` format
3. Group text by timestamp

### Auto-scroll Behavior
- Current line has subtle background highlight
- Scroll into view with `scrollIntoView({ behavior: 'smooth', block: 'center' })`
- Toggle button to enable/disable
- Pause auto-scroll when user manually scrolls

### Phrase Character Limit
- Maximum 100 characters for phrase selection
- Show warning if exceeded: "Selection too long. Please select a shorter phrase."

---

## Files Changed Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `supabase/migrations/xxx_create_user_created_flashcards.sql` | Create | New table for user flashcards |
| `src/integrations/supabase/types.ts` | Regenerate | Add new table types |
| `src/utils/transcriptUtils.ts` | Create | Transcript parsing utilities |
| `src/components/transcript/TranscriptViewer.tsx` | Create | Main transcript component |
| `src/components/transcript/TranscriptLine.tsx` | Create | Individual line component |
| `src/components/transcript/TextSelectionPopover.tsx` | Create | Selection action popover |
| `src/components/transcript/FlashcardCreatorModal.tsx` | Create | Flashcard creation form |
| `src/components/transcript/LockedTranscript.tsx` | Create | Free user locked state |
| `src/hooks/useTextSelection.tsx` | Create | Text selection hook |
| `src/services/flashcardService.ts` | Modify | Add user-created flashcard functions |
| `src/services/pdfGeneratorService.ts` | Modify | Include user-created in export |
| `src/components/YouTubeVideoExercises.tsx` | Modify | Add TranscriptViewer below video |
| `src/components/FlashcardRepository.tsx` | Modify | Include user-created flashcards |
| `src/components/ProfilePage.tsx` | Modify | Show combined flashcard count |

---

## Premium Feature Benefits List

Used in the LockedTranscript upgrade prompt:
- Full video transcripts with timestamps
- Create flashcards from any word
- Highlight and save phrases
- Auto-scroll with video playback
- Download flashcards as PDF

---

## Error Handling

1. **No transcript available:**
   - Show friendly message: "Transcript not available for this video"
   - Hide transcript section entirely

2. **Selection too long:**
   - Toast warning with character limit
   - Prevent flashcard creation

3. **Duplicate phrase:**
   - Check if phrase exists before saving
   - Show: "This phrase is already saved!"

4. **Save failed:**
   - Toast error with retry option
   - Keep modal open with data

5. **Not authenticated:**
   - Redirect to login if session expired

---

## Mobile Considerations

- Transcript below video (single column)
- Touch selection supported via `touchend` event
- Popover positioned above keyboard
- Modal is full-screen on mobile
- Larger touch targets for timestamps

---

## Testing Checklist

- [ ] Free user sees locked transcript with preview
- [ ] Free user clicking unlock shows upgrade modal
- [ ] Premium user sees full transcript
- [ ] Auto-scroll follows video playback
- [ ] Clicking timestamp seeks video
- [ ] Text selection shows popover
- [ ] Flashcard creation modal opens with pre-filled data
- [ ] Saving flashcard shows success toast
- [ ] Saved phrases are highlighted in transcript
- [ ] Clicking saved phrase shows edit/view options
- [ ] User-created cards appear in FlashcardRepository
- [ ] PDF export includes user-created cards
- [ ] Works on mobile devices
- [ ] Character limit enforced on selection
