

# Exclude Curated Videos from Community Tab

## Problem
Videos that are part of the curated learning path (linked via `week_videos.linked_video_id`) also appear in the Community tab, creating duplicates.

## Change

**File: `src/pages/Library.tsx`**

1. Fetch all `linked_video_id` values from `week_videos` table alongside the existing video fetch
2. In the `filteredVideos` memo, when `activeTab === 'community'`, exclude any video whose `id` is in the set of curated linked video IDs

```typescript
// New state
const [curatedVideoIds, setCuratedVideoIds] = useState<Set<string>>(new Set());

// Fetch curated video IDs
useEffect(() => {
  supabase.from("week_videos").select("linked_video_id")
    .not("linked_video_id", "is", null)
    .then(({ data }) => {
      setCuratedVideoIds(new Set(data?.map(r => r.linked_video_id) || []));
    });
}, []);

// In filteredVideos filter, add:
if (activeTab === 'community') {
  return levelMatch && topicMatch && lengthMatch && !curatedVideoIds.has(video.id);
}
```

This ensures any video linked to a learning week is hidden from the Community tab while still appearing in the Curated learning path.

