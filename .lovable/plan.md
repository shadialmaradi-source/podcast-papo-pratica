

## Root cause

The Lovable error toast says: `Could not find the 'source_lesson_id' column of 'user_created_flashcards' in the schema cache`.

Two issues:

1. **Migration never ran on the live DB.** The repo contains `supabase/migrations/20260418120000_expand_user_created_flashcards_sources.sql` which:
   - Drops `NOT NULL` on `video_id`
   - Adds `source_lesson_id UUID REFERENCES teacher_lessons(id)` 
   - Adds CHECK constraint requiring at least one source
   
   But the live `user_created_flashcards` table still has `video_id uuid NOT NULL` and **no** `source_lesson_id` column (verified via `information_schema`).

2. **Why it never ran:** there is a current build error in an unrelated edge function `supabase/functions/send-daily-reminders/index.ts` line 3 (`import { Resend } from "npm:resend@2.0.0";`) that the Deno deploy step rejects. This blocks the whole Supabase deploy pipeline including pending migrations.

When the student selects text inside a teacher lesson and saves a flashcard, `flashcardService.createFlashcardFromTranscript` inserts with `source_lesson_id` → PostgREST rejects because the column doesn't exist → the toast shows the error.

## Fix

### 1. Re-apply the migration (new timestamp so it actually runs)
Create `supabase/migrations/<new-ts>_user_created_flashcards_lesson_source.sql` with the same content as the stalled `20260418120000_…` file:
- `ALTER COLUMN video_id DROP NOT NULL`
- `ADD COLUMN IF NOT EXISTS source_lesson_id UUID REFERENCES teacher_lessons(id) ON DELETE CASCADE`
- Two indexes (`idx_user_created_flashcards_source_lesson`, `idx_user_created_flashcards_user_source_lesson`)
- CHECK constraint `video_id IS NOT NULL OR source_lesson_id IS NOT NULL`

(All statements are idempotent; safe to re-run.)

### 2. Fix the Resend import that is blocking deploys
In `supabase/functions/send-daily-reminders/index.ts` line 3, change:
```ts
import { Resend } from "npm:resend@2.0.0";
```
to the esm.sh equivalent used elsewhere in the project:
```ts
import { Resend } from "https://esm.sh/resend@2.0.0";
```
This unblocks the edge-function build so the migration can ship.

### 3. No client code changes
`flashcardService.createFlashcardFromTranscript` and `FlashcardCreatorModal` already handle the lesson case correctly (`source_lesson_id` is passed when `videoId` is empty) — they were just waiting on the schema. Once the migration applies and PostgREST refreshes its schema cache, saving a flashcard from a teacher lesson transcript will work.

### Files touched
- `supabase/migrations/<new-timestamp>_user_created_flashcards_lesson_source.sql` — new migration
- `supabase/functions/send-daily-reminders/index.ts` — swap `npm:` → `https://esm.sh/`

No UI changes, no breaking changes to existing flashcards.

