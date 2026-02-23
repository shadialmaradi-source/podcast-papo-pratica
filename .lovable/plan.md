

# Make First 4 Videos Free Per Module

## Current Behavior

Premium gating is controlled by the `is_free` column on the `week_videos` table. Each video is individually flagged as free or not. The UI in `WeekDetail.tsx` checks `!video.is_free && !isPremium` to decide if a video is locked.

## Change

Instead of relying on the `is_free` database column, determine accessibility by the video's position in the module: videos with `order_in_week <= 4` are free, the rest require premium.

### File: `src/pages/WeekDetail.tsx` (line 138)

Change:
```typescript
const isPremiumLocked = !video.is_free && !isPremium;
```
to:
```typescript
const isPremiumLocked = video.order_in_week > 4 && !isPremium;
```

### File: `src/pages/WeekVideo.tsx`

Find where `is_free` is checked to gate access to the video player page. Apply the same logic: if `video.order_in_week > 4` and the user is not premium, redirect to `/premium`.

That is the only change needed -- no database migration, no edge function updates.
