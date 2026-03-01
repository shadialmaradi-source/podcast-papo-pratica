

# Reorder Create Lesson Form + Add Word Explorer to Generated Paragraph

## Overview
Two changes: (1) reorder the paragraph creation form fields so the teacher fills prompt → CEFR level → language → Generate, then title/email/exercises after; (2) add text selection with "Explore Word" and "Save Flashcard" popover to the generated paragraph, reusing the existing transcript components.

## Changes

### 1. Reorder `CreateLessonForm.tsx` (paragraph flow)
Current order: Prompt → Generate → Paragraph → Title → Email → CEFR → Exercises

New order:
1. **Describe the paragraph** (textarea prompt)
2. **CEFR Level** (moved up, before generation)
3. **Language** (new Select field — Italian, Spanish, French, Portuguese, German, etc.)
4. **Generate Paragraph** button
5. **Generated Paragraph** (editable, with text selection features)
6. **Lesson Title** (auto-suggested after generation)
7. **Student Email**
8. **Exercise Types**
9. **Create Lesson** / Cancel

Add `language` to the form schema and pass it to the edge function.

### 2. Add language field to form schema
Add `language: z.string().min(1)` to `paragraphSchema` with a default (e.g. "italian"). Add a `<Select>` with common language options.

### 3. Update `generate-lesson-paragraph` edge function
Accept `language` parameter and include it in the system prompt so the paragraph is generated in the chosen language.

### 4. Add text selection + Word Explorer to generated paragraph
Wrap the generated paragraph display area with a `ref` and use `useTextSelection` hook. When the teacher selects text:
- Show `TextSelectionPopover` with "Save Flashcard" and "Explore" buttons
- "Explore" opens `WordExplorerPanel` (calls `analyze-word` edge function)
- "Save Flashcard" opens `FlashcardCreatorModal` (adapted — no video context, use paragraph as source)

The `FlashcardCreatorModal` requires `videoId` and `videoTitle` — we'll pass empty/placeholder values or make those props optional for paragraph-based flashcards.

### File Summary
| File | Action |
|------|--------|
| `src/components/teacher/CreateLessonForm.tsx` | Reorder fields, add language selector, integrate text selection + word explorer on generated paragraph |
| `supabase/functions/generate-lesson-paragraph/index.ts` | Accept `language` param, generate paragraph in chosen language |
| `src/components/transcript/FlashcardCreatorModal.tsx` | Make `videoId`/`videoTitle`/`timestamp` optional for paragraph-based usage |

