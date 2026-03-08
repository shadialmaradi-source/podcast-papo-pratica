

# Plan: Grant Lifetime Premium (Student + Teacher) & Fix Duration Bug

## Current State
- **User ID**: `d16921f2-9385-4bcb-9052-5fd9902956fd`
- **Student subscription**: `tier: free`, `status: cancelled`
- **Teacher subscription**: No record exists
- **Role**: `teacher` (already set)
- **Duration bug**: Line 200 in `Lesson.tsx` — `(videoData.duration || 0) <= 120` treats NULL as 0, skipping segmentation for all videos without duration data

## Changes

### Step 1: Database updates (via migration for structure, insert tool for data)

**Update student subscription** to lifetime premium:
```sql
UPDATE subscriptions
SET tier = 'premium', status = 'active', expires_at = NULL, updated_at = NOW()
WHERE user_id = 'd16921f2-9385-4bcb-9052-5fd9902956fd';
```

**Create teacher subscription** with premium plan:
```sql
INSERT INTO teacher_subscriptions (teacher_id, plan, status)
VALUES ('d16921f2-9385-4bcb-9052-5fd9902956fd', 'premium', 'active')
ON CONFLICT DO NOTHING;
```

### Step 2: Fix NULL duration in `Lesson.tsx` (line 200)

Change from:
```typescript
if (!videoData || (videoData.duration || 0) <= 120) {
```
To:
```typescript
if (!videoData) {
  setIsSegmented(false);
  setLessonState("exercises");
  return;
}
// If duration is unknown or > 120s, attempt segmentation
if (videoData.duration !== null && videoData.duration <= 120) {
  setIsSegmented(false);
  setLessonState("exercises");
  return;
}
```

This way, videos with NULL duration will attempt segmentation (the edge function can determine if splitting makes sense based on the transcript length).

### Step 3: Backfill video durations (data migration)

Estimate durations from transcript timestamps for existing videos:
```sql
UPDATE youtube_videos yv
SET duration = sub.max_ts
FROM (
  SELECT video_id,
    GREATEST(
      (SELECT MAX((t->>'start')::numeric + COALESCE((t->>'duration')::numeric, 0))
       FROM jsonb_array_elements(transcript::jsonb) t),
      0
    )::int AS max_ts
  FROM youtube_transcripts
) sub
WHERE yv.id = sub.video_id
  AND yv.duration IS NULL
  AND sub.max_ts > 0;
```

## Files to Change
- `src/pages/Lesson.tsx` — fix NULL duration logic (line 200)
- Database data updates — grant premium subscriptions + backfill durations

