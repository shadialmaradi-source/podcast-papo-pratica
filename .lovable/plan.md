

## Fix YouTube Video Duration Detection

### Problem Analysis

Both Supadata and Invidious APIs are failing to return video duration:
- **Supadata**: Returns 400 error for the `/video` endpoint (metadata)
- **Invidious**: All public instances are failing or blocking requests

This causes ALL video uploads to fail with "Unable to verify video duration" - blocking both valid short videos (9 min) and videos that should be blocked (25 min).

---

### Solution: Direct YouTube HTML Scraping

YouTube embeds video duration in the HTML page as **microdata** following schema.org standards. We can extract this without any API key.

**How it works:**
1. Fetch the YouTube watch page: `https://www.youtube.com/watch?v={videoId}`
2. Extract duration from either:
   - **Meta tag**: `<meta itemprop="duration" content="PT3M33S">`
   - **JSON-LD data**: `"duration": "PT3M33S"` in the script tag
   - **ytInitialPlayerResponse**: `"lengthSeconds": "213"` in the embedded JSON
3. Parse ISO 8601 duration format (PT#H#M#S) to seconds

---

### Implementation Plan

**File: `supabase/functions/process-youtube-video/index.ts`**

Rewrite `getVideoDuration()` function with this priority order:

1. **Try Supadata API first** (if configured) - keeps existing behavior for reliability
2. **Fallback: Scrape YouTube HTML directly** - extract duration from page microdata
3. **Secondary fallback: Try Invidious instances** - as last resort

**New helper function to parse ISO 8601 duration:**
```typescript
function parseISO8601Duration(duration: string): number {
  // Parses "PT3M33S" or "PT1H5M30S" to seconds
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}
```

**New scraping function:**
```typescript
async function scrapeDurationFromYouTube(videoId: string): Promise<number> {
  const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; bot)',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  
  if (!response.ok) return 0;
  const html = await response.text();
  
  // Method 1: Extract from meta tag
  const metaMatch = html.match(/<meta\s+itemprop="duration"\s+content="([^"]+)"/);
  if (metaMatch) {
    return parseISO8601Duration(metaMatch[1]);
  }
  
  // Method 2: Extract from ytInitialPlayerResponse JSON
  const jsonMatch = html.match(/"lengthSeconds"\s*:\s*"(\d+)"/);
  if (jsonMatch) {
    return parseInt(jsonMatch[1], 10);
  }
  
  return 0;
}
```

**Updated `getVideoDuration()` flow:**
```text
getVideoDuration(videoId)
    │
    ├─→ Try Supadata API
    │   └─→ Success? Return duration
    │
    ├─→ Try scraping YouTube HTML
    │   └─→ Found duration? Return it
    │
    └─→ Try Invidious instances (existing fallback)
        └─→ Return duration or 0
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/process-youtube-video/index.ts` | Add `parseISO8601Duration()`, add `scrapeDurationFromYouTube()`, update `getVideoDuration()` to use HTML scraping as primary fallback |

---

### Technical Notes

- **No API key required**: Direct scraping works without credentials
- **Reliable**: YouTube's microdata is a stable part of their SEO implementation
- **ISO 8601 format**: Duration like "PT10M30S" = 10 minutes 30 seconds = 630 seconds
- **User-Agent**: Setting a browser-like User-Agent helps avoid blocks
- **Credit cost**: Zero - this is just fetching a public HTML page

### Advantages Over Current Approach

| Current | Proposed |
|---------|----------|
| Depends on external APIs | Direct scraping from source |
| Supadata costs credits | Free (no API) |
| Invidious is unreliable | YouTube HTML is always available |
| Multiple points of failure | Single reliable source |

