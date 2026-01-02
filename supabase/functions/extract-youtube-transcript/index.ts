import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to extract video ID from full YouTube URL
function extractVideoId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  
  const trimmed = urlOrId.trim();
  
  // If it doesn't look like a URL, assume it's already a video ID
  if (!trimmed.includes('http') && !trimmed.includes('/') && !trimmed.includes('.')) {
    return trimmed;
  }
  
  // Handle youtube.com/watch?v=ID
  const watchMatch = trimmed.match(/[?&]v=([^&]+)/);
  if (watchMatch) return watchMatch[1];
  
  // Handle youtu.be/ID
  const shortMatch = trimmed.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return shortMatch[1];
  
  // Handle youtube.com/embed/ID
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([^?&]+)/);
  if (embedMatch) return embedMatch[1];
  
  return null;
}

// Method 1: Extract captions from YouTube page HTML using split-based parsing
// This mirrors the approach used by the youtube-transcript npm package
async function tryPageCaptions(videoId: string): Promise<string | null> {
  console.log(`[Method 1: page-captions] Fetching YouTube page for video: ${videoId}`);
  
  try {
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      }
    });
    
    if (!response.ok) {
      console.log(`[Method 1] Failed to fetch page: HTTP ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    console.log(`[Method 1] Fetched HTML, length: ${html.length} chars`);
    
    // Check if video is available
    if (html.includes('class="g-recaptcha"')) {
      console.log('[Method 1] YouTube is showing CAPTCHA - likely rate limited');
      return null;
    }
    
    if (html.includes('"playabilityStatus":{"status":"ERROR"')) {
      console.log('[Method 1] Video is not available');
      return null;
    }

    // Split-based parsing (like youtube-transcript library)
    // Look for "captions": in the page and extract the JSON object
    const captionsSplit = html.split('"captions":');
    
    if (captionsSplit.length < 2) {
      console.log('[Method 1] No "captions": found in page HTML');
      
      // Debug: check what player data exists
      if (html.includes('ytInitialPlayerResponse')) {
        console.log('[Method 1] ytInitialPlayerResponse exists but no captions section');
      }
      if (html.includes('"captionTracks"')) {
        console.log('[Method 1] captionTracks string exists somewhere in HTML');
      }
      return null;
    }
    
    console.log('[Method 1] Found "captions": section, parsing...');
    
    // Get the JSON after "captions": until ,"videoDetails" or similar boundary
    let captionsJson = captionsSplit[1];
    
    // Find the end of the captions object - it ends before ,"videoDetails" or similar
    const endMarkers = [',"videoDetails"', ',"microformat"', ',"cards"', ',"attestation"'];
    let endIndex = captionsJson.length;
    
    for (const marker of endMarkers) {
      const idx = captionsJson.indexOf(marker);
      if (idx > 0 && idx < endIndex) {
        endIndex = idx;
      }
    }
    
    captionsJson = captionsJson.substring(0, endIndex);
    console.log(`[Method 1] Extracted captions JSON, length: ${captionsJson.length}`);
    
    try {
      const captions = JSON.parse(captionsJson);
      console.log('[Method 1] Successfully parsed captions JSON');
      
      // Navigate to caption tracks
      const captionTracks = captions?.playerCaptionsTracklistRenderer?.captionTracks;
      
      if (!captionTracks || !Array.isArray(captionTracks) || captionTracks.length === 0) {
        console.log('[Method 1] No captionTracks array found in parsed JSON');
        console.log('[Method 1] Available keys:', Object.keys(captions || {}));
        return null;
      }
      
      console.log(`[Method 1] Found ${captionTracks.length} caption track(s)`);
      
      // Log available languages
      const availableLangs = captionTracks.map((t: any) => `${t.languageCode}${t.kind === 'asr' ? ' (auto)' : ''}`);
      console.log(`[Method 1] Available languages: ${availableLangs.join(', ')}`);
      
      // Find English captions - prefer manual over auto-generated (asr)
      const englishManual = captionTracks.find((track: any) => 
        track.languageCode === 'en' && track.kind !== 'asr'
      );
      const englishAuto = captionTracks.find((track: any) => 
        track.languageCode === 'en' && track.kind === 'asr'
      );
      const anyEnglish = captionTracks.find((track: any) => 
        track.languageCode?.startsWith('en')
      );
      
      const selectedTrack = englishManual || englishAuto || anyEnglish || captionTracks[0];
      
      if (!selectedTrack?.baseUrl) {
        console.log('[Method 1] Selected track has no baseUrl');
        return null;
      }
      
      console.log(`[Method 1] Using track: ${selectedTrack.languageCode}${selectedTrack.kind === 'asr' ? ' (auto-generated)' : ' (manual)'}`);
      console.log(`[Method 1] Fetching caption URL: ${selectedTrack.baseUrl.substring(0, 80)}...`);
      
      // Fetch the caption XML/JSON
      const captionResponse = await fetch(selectedTrack.baseUrl);
      if (!captionResponse.ok) {
        console.log(`[Method 1] Failed to fetch captions: HTTP ${captionResponse.status}`);
        return null;
      }
      
      const captionContent = await captionResponse.text();
      console.log(`[Method 1] Fetched caption content, length: ${captionContent.length}`);
      
      // Try to parse as JSON first (json3 format)
      if (captionContent.trim().startsWith('{')) {
        try {
          const jsonCaptions = JSON.parse(captionContent);
          if (jsonCaptions.events) {
            const transcript = jsonCaptions.events
              .filter((e: any) => e.segs)
              .map((e: any) => e.segs.map((s: any) => s.utf8 || '').join(''))
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();
            
            if (transcript.length > 0) {
              console.log(`[Method 1] SUCCESS! Extracted ${transcript.length} chars from JSON format`);
              return transcript;
            }
          }
        } catch {
          // Not JSON, continue to XML parsing
        }
      }
      
      // Parse as XML
      const textMatches = captionContent.matchAll(/<text[^>]*>(.*?)<\/text>/gs);
      const segments: string[] = [];
      
      for (const match of textMatches) {
        let text = match[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' ')
          .replace(/<[^>]+>/g, '') // Remove any nested tags
          .replace(/\n/g, ' ')
          .trim();
        
        if (text) {
          segments.push(text);
        }
      }
      
      if (segments.length > 0) {
        const transcript = segments.join(' ').replace(/\s+/g, ' ').trim();
        console.log(`[Method 1] SUCCESS! Extracted ${transcript.length} chars from ${segments.length} XML segments`);
        return transcript;
      }
      
      console.log('[Method 1] No text segments found in caption content');
      return null;
      
    } catch (parseError) {
      console.log(`[Method 1] JSON parse error: ${parseError}`);
      // Log first 500 chars to debug
      console.log(`[Method 1] JSON preview: ${captionsJson.substring(0, 500)}`);
      return null;
    }
    
  } catch (error) {
    console.log(`[Method 1] Error: ${error}`);
    return null;
  }
}

// Method 2: Try YouTube timedtext API with language fallbacks
async function tryTimedtextApi(videoId: string): Promise<string | null> {
  const languages = ['en', 'en-US', 'en-GB', 'a.en', 'asr'];
  
  for (const lang of languages) {
    console.log(`[Method 2: timedtext] Trying language: ${lang}`);
    
    try {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`;
      console.log(`[Method 2] URL: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });
      
      if (!response.ok) {
        console.log(`[Method 2] ${lang}: HTTP ${response.status}`);
        continue;
      }
      
      const text = await response.text();
      if (!text || text.trim().length === 0) {
        console.log(`[Method 2] ${lang}: Empty response`);
        continue;
      }
      
      console.log(`[Method 2] ${lang}: Got response, length: ${text.length}`);
      
      const data = JSON.parse(text);
      
      if (data.events && Array.isArray(data.events)) {
        const transcript = data.events
          .filter((event: any) => event.segs)
          .map((event: any) => event.segs.map((seg: any) => seg.utf8 || '').join(''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (transcript.length > 0) {
          console.log(`[Method 2] SUCCESS with ${lang}! Extracted ${transcript.length} chars`);
          return transcript;
        }
      }
      
      console.log(`[Method 2] ${lang}: No events in response`);
    } catch (error) {
      console.log(`[Method 2] ${lang} error: ${error}`);
    }
  }
  
  console.log('[Method 2] All language attempts failed');
  return null;
}

// Method 3: Try multiple third-party APIs as fallback
async function tryThirdPartyApi(videoId: string): Promise<string | null> {
  // List of third-party transcript APIs to try
  const apis = [
    {
      name: 'youtube-transcript-api.vercel.app',
      url: `https://youtube-transcript-api.vercel.app/api/transcript?videoId=${videoId}`,
    },
    {
      name: 'yt-transcript-api (alt param)',
      url: `https://youtube-transcript-api.vercel.app/api/transcript?video_id=${videoId}`,
    },
  ];
  
  for (const api of apis) {
    console.log(`[Method 3: third-party] Trying ${api.name}`);
    console.log(`[Method 3] URL: ${api.url}`);
    
    try {
      const response = await fetch(api.url, {
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log(`[Method 3] ${api.name}: HTTP ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`[Method 3] Error response: ${errorText.substring(0, 200)}`);
        continue;
      }
      
      const data = await response.json();
      console.log(`[Method 3] Response type: ${typeof data}, isArray: ${Array.isArray(data)}`);
      
      if (Array.isArray(data) && data.length > 0) {
        const transcript = data
          .map((item: any) => item.text || item.content || '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (transcript.length > 0) {
          console.log(`[Method 3] SUCCESS via ${api.name}! Extracted ${transcript.length} chars from ${data.length} segments`);
          return transcript;
        }
      }
      
      // Handle object response with transcript field
      if (data && typeof data === 'object' && data.transcript) {
        if (Array.isArray(data.transcript)) {
          const transcript = data.transcript
            .map((item: any) => item.text || item.content || '')
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (transcript.length > 0) {
            console.log(`[Method 3] SUCCESS via ${api.name}! Extracted ${transcript.length} chars`);
            return transcript;
          }
        }
      }
      
      console.log(`[Method 3] ${api.name}: No valid transcript data in response`);
      
    } catch (error) {
      console.log(`[Method 3] ${api.name} error: ${error}`);
    }
  }
  
  console.log('[Method 3] All third-party APIs failed');
  return null;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== extract-youtube-transcript function called ===');

  try {
    const body = await req.json();
    const { videoUrl, videoId: providedVideoId } = body;
    
    console.log(`Request body: videoUrl=${videoUrl}, videoId=${providedVideoId}`);

    // Extract video ID from URL or use provided ID
    const videoId = extractVideoId(videoUrl || providedVideoId || '');
    
    if (!videoId) {
      console.log('ERROR: Could not extract video ID');
      return new Response(
        JSON.stringify({
          success: false,
          transcript: null,
          method: null,
          error: 'Could not extract video ID from the provided URL or ID'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Extracted video ID: ${videoId}`);
    console.log('Starting transcript extraction with multiple methods...');

    // Try Method 1: Page captions (most reliable)
    let transcript = await tryPageCaptions(videoId);
    if (transcript) {
      console.log('=== FINAL RESULT: SUCCESS via page-captions ===');
      return new Response(
        JSON.stringify({
          success: true,
          transcript,
          method: 'page-captions',
          error: null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try Method 2: Timedtext API
    transcript = await tryTimedtextApi(videoId);
    if (transcript) {
      console.log('=== FINAL RESULT: SUCCESS via timedtext ===');
      return new Response(
        JSON.stringify({
          success: true,
          transcript,
          method: 'timedtext',
          error: null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try Method 3: Third-party APIs
    transcript = await tryThirdPartyApi(videoId);
    if (transcript) {
      console.log('=== FINAL RESULT: SUCCESS via third-party ===');
      return new Response(
        JSON.stringify({
          success: true,
          transcript,
          method: 'third-party',
          error: null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // All methods failed
    console.log('=== FINAL RESULT: FAILURE - all methods exhausted ===');
    return new Response(
      JSON.stringify({
        success: false,
        transcript: null,
        method: null,
        error: 'No captions available for this video. The video may not have captions, or they may be disabled.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        transcript: null,
        method: null,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
