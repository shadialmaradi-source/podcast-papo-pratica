

## Simplified YouTube Video Duration Detection

### Overview

Replace all complex duration detection methods with a simple, reliable approach using **YouTube Data API v3** as the primary method, with basic HTML scraping as fallback only if the API key is not configured.

---

### Changes to `supabase/functions/process-youtube-video/index.ts`

**1. Add YouTube Data API v3 function**

```typescript
async function getYouTubeAPIv3Duration(videoId: string): Promise<number> {
  const API_KEY = Deno.env.get('YOUTUBE_DATA_API_KEY');
  if (!API_KEY) {
    console.log('YOUTUBE_DATA_API_KEY not configured');
    return 0;
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${API_KEY}`
    );

    if (!response.ok) {
      console.log('YouTube API v3 failed:', response.status);
      return 0;
    }

    const data = await response.json();
    const duration = data.items?.[0]?.contentDetails?.duration;
    
    if (duration) {
      const seconds = parseISO8601Duration(duration);
      console.log(`YouTube API v3 duration: ${seconds}s (${duration})`);
      return seconds;
    }

    return 0;
  } catch (error) {
    console.log('YouTube API v3 error:', error);
    return 0;
  }
}
```

**2. Simplify HTML scraping (keep as fallback only)**

Update `scrapeDurationFromYouTube()` to add CONSENT cookie:

```typescript
async function scrapeDurationFromYouTube(videoId: string): Promise<number> {
  try {
    console.log('Fallback: Scraping YouTube HTML for duration...');
    const response = await fetch(
      `https://www.youtube.com/watch?v=${videoId}&hl=en&gl=US`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cookie': 'CONSENT=YES+1'
        }
      }
    );
    
    if (!response.ok) return 0;
    const html = await response.text();
    
    // Flexible meta tag match
    const metaMatch = html.match(/<meta[^>]*itemprop="duration"[^>]*content="([^"]+)"/i);
    if (metaMatch) {
      const duration = parseISO8601Duration(metaMatch[1]);
      if (duration > 0) return duration;
    }
    
    // lengthSeconds - accept both quoted and unquoted
    const lengthMatch = html.match(/"lengthSeconds"\s*:\s*"?(\d+)"?/);
    if (lengthMatch) {
      return parseInt(lengthMatch[1], 10);
    }
    
    return 0;
  } catch {
    return 0;
  }
}
```

**3. Simplify `getVideoDuration()` function**

Replace the entire function with:

```typescript
async function getVideoDuration(videoId: string): Promise<number> {
  // Primary: YouTube Data API v3 (official, reliable)
  let duration = await getYouTubeAPIv3Duration(videoId);
  if (duration > 0) return duration;
  
  // Fallback: Simple HTML scraping (only if API key not set)
  duration = await scrapeDurationFromYouTube(videoId);
  if (duration > 0) return duration;
  
  console.log('All duration sources failed for video:', videoId);
  return 0;
}
```

**4. Remove all complexity**

Delete:
- Supadata API calls for duration
- Invidious API fallback
- All the complex scraping logic

---

### Changes to `src/pages/AppHome.tsx`

**Improve error handling to show real messages**

Update the `handleImportVideo` function to properly extract and display error messages from the backend:

```typescript
const handleImportVideo = async () => {
  if (!videoUrl.trim()) {
    toast.error("Please enter a video URL");
    return;
  }

  if (!user) {
    toast.error("Please log in to import videos");
    return;
  }

  setImporting(true);
  try {
    const { data, error } = await supabase.functions.invoke("process-youtube-video", {
      body: { 
        videoUrl: videoUrl,
        language: profile?.selected_language || "english"
      },
    });

    // Handle function error
    if (error) {
      const errorMessage = error.message || "Failed to import video";
      
      // Check for quota/limit errors
      if (errorMessage.includes("quota") || errorMessage.includes("limit")) {
        setUpgradeReason(errorMessage);
        setShowUpgradePrompt(true);
        return;
      }
      
      // Show the actual error message
      toast.error(errorMessage);
      return;
    }

    // Handle error in response data (from non-2xx responses)
    if (data?.error) {
      toast.error(data.error);
      return;
    }

    // Success handling (existing code)
    const videoDbId = data?.video?.id;
    // ... rest of success logic
  } catch (error: any) {
    console.error("Error importing video:", error);
    toast.error(error?.message || "Failed to import video. Please try again.");
  } finally {
    setImporting(false);
  }
};
```

---

### Summary of Changes

| File | Action |
|------|--------|
| `supabase/functions/process-youtube-video/index.ts` | Add `getYouTubeAPIv3Duration()`, simplify `scrapeDurationFromYouTube()` with CONSENT cookie, simplify `getVideoDuration()`, remove Supadata/Invidious code |
| `src/pages/AppHome.tsx` | Update error handling to show real backend error messages |

---

### Error Messages

| Condition | Error Message |
|-----------|---------------|
| Duration = 0 | "Unable to verify video duration. Please try a different video." |
| Duration > 600 seconds | "Video is X minutes long. Maximum allowed is 10 minutes. Please choose a shorter video." |

---

### Technical Notes

- **YouTube Data API v3** uses the existing `YOUTUBE_DATA_API_KEY` secret
- **API endpoint**: `https://www.googleapis.com/youtube/v3/videos?id={videoId}&part=contentDetails&key={API_KEY}`
- **Duration format**: ISO 8601 (e.g., `PT3M33S`) - parsed by existing `parseISO8601Duration()` function
- **API quota**: Checking duration costs 1 quota unit per video (10,000 units/day free)

