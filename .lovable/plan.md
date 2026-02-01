

## Fix Video Import Error Messages + Upload Quota Tracking

### Issues Found

**Issue 1: Error messages not showing**
- When a video is too long, the edge function correctly returns `{ error: "Video is 25 minutes long..." }`
- But `supabase.functions.invoke()` throws `FunctionsHttpError` with a generic message "Edge Function returned a non-2xx status code"
- The actual error message is buried in the response body, not in `error.message`

**Issue 2: Upload count not tracked**
- The `user_video_uploads` table has 0 records
- The edge function creates videos in `youtube_videos` but never records the upload in `user_video_uploads`
- This breaks the monthly quota enforcement (max 2 videos/month for free users)

---

### Solution

#### 1. Fix Error Messages in AppHome.tsx

Replace `supabase.functions.invoke` with direct `fetch` call to properly capture error messages from the response body:

```typescript
const handleImportVideo = async () => {
  // ... validation code ...
  
  setImporting(true);
  try {
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;
    
    if (!accessToken) {
      toast.error("Please log in to import videos");
      return;
    }
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-youtube-video`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          videoUrl: videoUrl,
          language: profile?.selected_language || "english"
        }),
      }
    );
    
    const data = await response.json();
    
    if (!response.ok || data.error) {
      const errorMessage = data.error || "Failed to import video";
      
      // Check for quota/limit errors
      if (errorMessage.includes("quota") || errorMessage.includes("limit")) {
        setUpgradeReason(errorMessage);
        setShowUpgradePrompt(true);
        return;
      }
      
      toast.error(errorMessage);
      return;
    }
    
    // Success handling...
  }
};
```

---

#### 2. Track Uploads in Edge Function

Add insert to `user_video_uploads` table in `supabase/functions/process-youtube-video/index.ts` after video is successfully created:

```typescript
// After: const { data: video, error: videoError } = await supabase.from('youtube_videos').insert(...)

// Track this upload against user's monthly quota
const { error: uploadTrackError } = await supabase
  .from('user_video_uploads')
  .insert({
    user_id: userId,
    video_id: video.id,
    duration_seconds: videoDuration
  });

if (uploadTrackError) {
  console.error('Failed to track upload quota:', uploadTrackError);
  // Non-blocking - continue with processing
}
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/AppHome.tsx` | Replace `supabase.functions.invoke` with `fetch` to capture error messages |
| `supabase/functions/process-youtube-video/index.ts` | Add insert to `user_video_uploads` table after video creation |

---

### Expected Behavior After Fix

| Scenario | Before | After |
|----------|--------|-------|
| Video > 10 min | Generic "Error" toast | Toast shows "Video is 25 minutes long. Maximum allowed is 10 minutes." |
| 3rd video upload (free user) | Allowed (quota broken) | Blocked with "You've reached your monthly limit of 2 video uploads" |
| Upload quota UI | Shows 0/2 always | Shows accurate count |

