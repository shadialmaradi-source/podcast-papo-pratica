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

// Method 1: Try to extract caption URL from YouTube page HTML
async function tryPageCaptions(videoId: string): Promise<string | null> {
  console.log(`[Method 1: page-captions] Fetching YouTube page for video: ${videoId}`);
  
  try {
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    
    if (!response.ok) {
      console.log(`[Method 1] Failed to fetch page: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    // Look for caption track URL in the page
    const captionMatch = html.match(/"captionTracks":\s*\[(.*?)\]/);
    if (!captionMatch) {
      console.log('[Method 1] No captionTracks found in page HTML');
      return null;
    }
    
    // Parse the caption tracks JSON
    try {
      const captionTracksStr = `[${captionMatch[1]}]`;
      const captionTracks = JSON.parse(captionTracksStr);
      
      // Find English captions (prefer manual over auto-generated)
      const englishTrack = captionTracks.find((track: any) => 
        track.languageCode === 'en' && !track.kind
      ) || captionTracks.find((track: any) => 
        track.languageCode === 'en'
      ) || captionTracks.find((track: any) => 
        track.languageCode?.startsWith('en')
      ) || captionTracks[0];
      
      if (!englishTrack?.baseUrl) {
        console.log('[Method 1] No suitable caption track found');
        return null;
      }
      
      console.log(`[Method 1] Found caption track, fetching: ${englishTrack.baseUrl.substring(0, 100)}...`);
      
      // Fetch the caption XML
      const captionResponse = await fetch(englishTrack.baseUrl);
      if (!captionResponse.ok) {
        console.log(`[Method 1] Failed to fetch captions: ${captionResponse.status}`);
        return null;
      }
      
      const captionXml = await captionResponse.text();
      
      // Parse XML to extract text
      const textMatches = captionXml.matchAll(/<text[^>]*>(.*?)<\/text>/gs);
      const segments: string[] = [];
      
      for (const match of textMatches) {
        let text = match[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\n/g, ' ')
          .trim();
        
        if (text) {
          segments.push(text);
        }
      }
      
      if (segments.length > 0) {
        const transcript = segments.join(' ').replace(/\s+/g, ' ').trim();
        console.log(`[Method 1] SUCCESS! Extracted ${transcript.length} chars from ${segments.length} segments`);
        return transcript;
      }
      
      console.log('[Method 1] No text segments found in caption XML');
      return null;
    } catch (parseError) {
      console.log(`[Method 1] Failed to parse caption tracks: ${parseError}`);
      return null;
    }
  } catch (error) {
    console.log(`[Method 1] Error: ${error}`);
    return null;
  }
}

// Method 2: Try YouTube timedtext API with language fallbacks
async function tryTimedtextApi(videoId: string): Promise<string | null> {
  const languages = ['en', 'en-US', 'en-GB', 'a.en'];
  
  for (const lang of languages) {
    console.log(`[Method 2: timedtext] Trying language: ${lang}`);
    
    try {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
      
      const data = JSON.parse(text);
      
      if (data.events && Array.isArray(data.events)) {
        const transcript = data.events
          .map((event: any) => {
            if (event.segs && Array.isArray(event.segs)) {
              return event.segs.map((seg: any) => seg.utf8 || '').join('');
            }
            return '';
          })
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

// Method 3: Try third-party API as fallback
async function tryThirdPartyApi(videoId: string): Promise<string | null> {
  console.log(`[Method 3: third-party] Trying youtube-transcript-api.vercel.app`);
  
  try {
    const url = `https://youtube-transcript-api.vercel.app/api/transcript?video_id=${videoId}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`[Method 3] HTTP ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0) {
      const transcript = data
        .map((item: any) => item.text || '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (transcript.length > 0) {
        console.log(`[Method 3] SUCCESS! Extracted ${transcript.length} chars from ${data.length} segments`);
        return transcript;
      }
    }
    
    console.log('[Method 3] No valid transcript data in response');
    return null;
  } catch (error) {
    console.log(`[Method 3] Error: ${error}`);
    return null;
  }
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

    // Try Method 1: Page captions
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

    // Try Method 3: Third-party API
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
        error: 'No captions available for this video. Please try a video with captions enabled.'
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
