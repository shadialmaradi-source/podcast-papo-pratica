

# Smart Flashcard System: AI-Powered Vocabulary from Transcripts

## Overview

Transform the manual flashcard creation flow into an AI-powered, context-aware vocabulary learning experience. The system will auto-analyze selected text, suggest key words in the transcript, and offer deep-dive tools based on word type -- all without requiring the user to type anything except optional personal notes.

---

## What Changes for the User

### 1. Auto-Filled Flashcard Modal
When you select a word or phrase in the transcript, the modal opens and immediately calls AI to fill in:
- Translation (English)
- Part of Speech (noun, verb, adjective, etc.)
- Example Sentence (a new one generated from context)

All fields show a brief loading shimmer, then populate automatically. You can still edit any field, but you never have to type anything. The "Notes" field remains blank for your personal input.

### 2. AI-Suggested Vocabulary in the Transcript
When the transcript loads, the system analyzes it and highlights 8-12 high-value vocabulary words/phrases directly in the transcript text. These appear with a subtle dashed underline (distinct from the solid highlight of your saved flashcards). Clicking a suggested word opens the flashcard modal pre-filled with AI data.

### 3. Context-Aware Word Actions
When you select text or click a suggested word, a smarter popover appears offering actions based on the word type:

**For all words:**
- "Save as Flashcard" (quick save with AI auto-fill)
- "Explore Word" (opens deep-dive panel)

**The Explore Word panel shows different sections based on type:**
- **Verbs**: Full conjugation table (Present, Past, Future) + translation + example sentences
- **Nouns**: Gender, plural form, related words + translation + example in context
- **Adjectives**: Masculine/feminine forms, comparative/superlative + translation + example
- **Phrases/Expressions**: Literal vs. idiomatic meaning, usage context, formality level

From the Explore panel, you can save as flashcard with one click (all data pre-filled).

---

## UX Flow

```text
User watches video with transcript
         |
         v
Transcript loads --> AI suggests 8-12 key words (dashed underline)
         |
         +-- User clicks suggested word --> Popover: "Save Flashcard" | "Explore Word"
         |
         +-- User selects any text --> Same popover appears
                  |
                  +-- "Save Flashcard" --> Modal opens, AI auto-fills all fields, user clicks Save
                  |
                  +-- "Explore Word" --> Deep-dive panel with conjugation/grammar/context
                           |
                           +-- "Save as Flashcard" button at bottom
```

---

## Technical Plan

### New Edge Function: `analyze-word`
- **Purpose**: Takes a word/phrase + language + context sentence, returns translation, part of speech, example sentence, and type-specific data (conjugation for verbs, gender for nouns, etc.)
- **AI Model**: `google/gemini-3-flash-preview` via Lovable AI Gateway (consistent with other edge functions)
- **Uses tool calling** for structured output (translation, partOfSpeech, exampleSentence, extras)
- **Input**: `{ word, language, contextSentence }`
- **Output**: `{ translation, partOfSpeech, exampleSentence, extras: { conjugation?, gender?, plural?, relatedWords?, formality? } }`

### New Edge Function: `suggest-transcript-words`
- **Purpose**: Analyzes a transcript and returns 8-12 high-value vocabulary suggestions with their positions
- **Caching**: Results stored in a new `transcript_word_suggestions` table (keyed by video_id + difficulty level) so AI is only called once per video
- **Output**: Array of `{ phrase, translation, partOfSpeech, why, approximatePosition }` -- position is the segment index where the word appears

### Database Changes
- **New table: `transcript_word_suggestions`** -- caches AI-suggested words per video
  - `id` (uuid), `video_id` (references youtube_videos), `difficulty` (text), `phrase` (text), `translation` (text), `part_of_speech` (text), `why` (text), `segment_index` (int), `created_at`

### Frontend Changes

| File | Change |
|------|--------|
| `supabase/functions/analyze-word/index.ts` | New edge function for AI word analysis |
| `supabase/functions/suggest-transcript-words/index.ts` | New edge function for transcript vocabulary suggestions |
| `src/components/transcript/FlashcardCreatorModal.tsx` | Add AI auto-fill on open: call `analyze-word`, show loading shimmers, pre-populate all fields |
| `src/components/transcript/TextSelectionPopover.tsx` | Add "Explore Word" button alongside "Create Flashcard"; smarter layout |
| `src/components/transcript/TranscriptViewer.tsx` | Load AI-suggested words, pass them to TranscriptLine for highlighting, handle click on suggested words |
| `src/components/transcript/TranscriptLine.tsx` | Add dashed-underline highlighting for AI-suggested words (distinct from saved phrases); make suggested words clickable |
| `src/components/transcript/WordExplorerPanel.tsx` | New component: slide-out panel showing conjugation (verbs), gender/plural (nouns), comparative (adjectives), usage context |
| `supabase/config.toml` | Register new edge functions |

### AI Auto-Fill Flow (FlashcardCreatorModal)
1. Modal opens with the selected phrase pre-filled
2. Immediately calls `analyze-word` edge function
3. Shows skeleton/shimmer loaders on Translation, Part of Speech, and Example Sentence fields
4. When AI responds, fields auto-populate with a smooth transition
5. User can override any field
6. "Notes" remains empty for personal input
7. Save button works as before

### Suggested Words Flow (TranscriptViewer)
1. When transcript loads for a premium user, call `suggest-transcript-words` (which checks cache first)
2. Store suggestions in component state
3. Pass suggested words array to each TranscriptLine
4. TranscriptLine renders suggested phrases with a dashed underline and subtle background
5. Clicking a suggested word triggers the popover with pre-loaded AI data (no extra API call needed since data comes from the suggestion)

### Word Explorer Panel Design
- Opens as a slide-over panel (not a full modal -- keeps transcript visible)
- Header: the word in the target language with pronunciation guide
- Sections vary by word type:
  - **Verb**: Conjugation grid (3 tenses x 6 persons), infinitive form, translation, 2 example sentences
  - **Noun**: Translation, gender indicator, singular/plural, 2 example sentences, related words
  - **Adjective**: Translation, masc/fem forms, comparative/superlative, 2 example sentences
  - **Phrase**: Literal translation, idiomatic meaning, formality level, usage examples
- Footer: "Save as Flashcard" button (all data pre-filled from the explore results)

---

## Implementation Order

1. Create `analyze-word` edge function (AI auto-fill backbone)
2. Update `FlashcardCreatorModal` to call `analyze-word` and auto-fill fields
3. Create `suggest-transcript-words` edge function + database table
4. Update `TranscriptViewer` and `TranscriptLine` to show suggested words
5. Update `TextSelectionPopover` with "Explore Word" option
6. Create `WordExplorerPanel` component
7. Wire everything together and test

