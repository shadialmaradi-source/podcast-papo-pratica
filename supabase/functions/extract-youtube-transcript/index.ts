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
async function tryPageCaptions(videoId: string): Promise<string | null> {
  console.log(`[Method 1: page-captions] Fetching YouTube page for video: ${videoId}`);
  
  try {
    // Add hl=en and gl=US to get English page, plus consent bypass
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}&hl=en&gl=US`;
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Cookie': 'CONSENT=YES+1', // Bypass consent screen
      }
    });
    
    if (!response.ok) {
      console.log(`[Method 1] Failed to fetch page: HTTP ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    console.log(`[Method 1] Fetched HTML, length: ${html.length} chars`);
    console.log(`[Method 1] HTML preview: ${html.substring(0, 500)}...`);
    console.log(`[Method 1] Has ytInitialPlayerResponse: ${html.includes('ytInitialPlayerResponse')}`);
    console.log(`[Method 1] Has "captionTracks": ${html.includes('"captionTracks"')}`);
    console.log(`[Method 1] Has consent page: ${html.includes('consent.youtube.com')}`);
    
    // Check if video is available by parsing ytInitialPlayerResponse
    if (html.includes('class="g-recaptcha"')) {
      console.log('[Method 1] YouTube is showing CAPTCHA - likely rate limited');
      return null;
    }

    // Try to extract ytInitialPlayerResponse and check playability
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
    if (playerResponseMatch) {
      try {
        // Find the end of the JSON object more carefully
        let jsonStr = playerResponseMatch[1];
        // Attempt to find proper JSON end
        let braceCount = 0;
        let jsonEnd = 0;
        for (let i = 0; i < jsonStr.length; i++) {
          if (jsonStr[i] === '{') braceCount++;
          if (jsonStr[i] === '}') braceCount--;
          if (braceCount === 0) {
            jsonEnd = i + 1;
            break;
          }
        }
        if (jsonEnd > 0) {
          jsonStr = jsonStr.substring(0, jsonEnd);
        }
        
        const playerResponse = JSON.parse(jsonStr);
        const status = playerResponse?.playabilityStatus?.status;
        console.log(`[Method 1] Playability status: ${status}`);
        
        if (status === 'ERROR' || status === 'UNPLAYABLE') {
          console.log(`[Method 1] Video not playable: ${playerResponse?.playabilityStatus?.reason || 'unknown reason'}`);
          return null;
        }
        
        // Try to get captions from playerResponse directly
        const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (captionTracks && Array.isArray(captionTracks) && captionTracks.length > 0) {
          console.log(`[Method 1] Found ${captionTracks.length} caption tracks in playerResponse`);
          return await fetchCaptionTrack(captionTracks);
        }
      } catch (e) {
        console.log(`[Method 1] Failed to parse ytInitialPlayerResponse: ${e}`);
      }
    }

    // Fallback: Split-based parsing (like youtube-transcript library)
    const captionsSplit = html.split('"captions":');
    console.log(`[Method 1] captionsSplit.length: ${captionsSplit.length}`);
    
    if (captionsSplit.length < 2) {
      console.log('[Method 1] No "captions": found in page HTML');
      return null;
    }
    
    console.log('[Method 1] Found "captions": section, parsing...');
    
    // Get the JSON after "captions": until ,"videoDetails" or similar boundary
    let captionsJson = captionsSplit[1];
    
    // Find the end of the captions object
    const endMarkers = [',"videoDetails"', ',"microformat"', ',"cards"', ',"attestation"', ',"storyboards"'];
    let endIndex = captionsJson.length;
    
    for (const marker of endMarkers) {
      const idx = captionsJson.indexOf(marker);
      if (idx > 0 && idx < endIndex) {
        endIndex = idx;
      }
    }
    
    captionsJson = captionsJson.substring(0, endIndex);
    console.log(`[Method 1] Extracted captions JSON, length: ${captionsJson.length}`);
    console.log(`[Method 1] Captions JSON preview: ${captionsJson.substring(0, 300)}...`);
    
    try {
      const captions = JSON.parse(captionsJson);
      console.log('[Method 1] Successfully parsed captions JSON');
      
      const captionTracks = captions?.playerCaptionsTracklistRenderer?.captionTracks;
      
      if (!captionTracks || !Array.isArray(captionTracks) || captionTracks.length === 0) {
        console.log('[Method 1] No captionTracks array found in parsed JSON');
        console.log('[Method 1] Available keys:', Object.keys(captions || {}));
        return null;
      }
      
      return await fetchCaptionTrack(captionTracks);
      
    } catch (parseError) {
      console.log(`[Method 1] JSON parse error: ${parseError}`);
      console.log(`[Method 1] JSON preview: ${captionsJson.substring(0, 500)}`);
      return null;
    }
    
  } catch (error) {
    console.log(`[Method 1] Error: ${error}`);
    return null;
  }
}

// Helper to fetch and parse caption track
async function fetchCaptionTrack(captionTracks: any[]): Promise<string | null> {
  console.log(`[Method 1] Processing ${captionTracks.length} caption track(s)`);
  
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
      .replace(/<[^>]+>/g, '')
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
}

// Method 2: Try YouTube timedtext API with language fallbacks
async function tryTimedtextApi(videoId: string): Promise<string | null> {
  const languages = ['en', 'en-US', 'en-GB', 'a.en', 'en.1', 'asr'];
  
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
      console.log(`[Method 2] ${lang}: Response preview: ${text.substring(0, 200)}`);
      
      // Try JSON parse
      try {
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
      } catch (parseErr) {
        console.log(`[Method 2] ${lang}: JSON parse failed, trying XML...`);
        
        // Try XML parsing as fallback
        const textMatches = text.matchAll(/<text[^>]*>(.*?)<\/text>/gs);
        const segments: string[] = [];
        
        for (const match of textMatches) {
          const cleaned = match[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'")
            .replace(/<[^>]+>/g, '')
            .trim();
          if (cleaned) segments.push(cleaned);
        }
        
        if (segments.length > 0) {
          const transcript = segments.join(' ').replace(/\s+/g, ' ').trim();
          console.log(`[Method 2] SUCCESS with ${lang} (XML)! Extracted ${transcript.length} chars`);
          return transcript;
        }
      }
    } catch (error) {
      console.log(`[Method 2] ${lang} error: ${error}`);
    }
  }
  
  console.log('[Method 2] All language attempts failed');
  return null;
}

// Method 3: Try multiple third-party APIs as fallback
async function tryThirdPartyApi(videoId: string): Promise<string | null> {
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
      
      const text = await response.text();
      console.log(`[Method 3] ${api.name}: Response length: ${text.length}`);
      console.log(`[Method 3] ${api.name}: Response preview: ${text.substring(0, 300)}`);
      
      if (!response.ok) {
        continue;
      }
      
      const data = JSON.parse(text);
      console.log(`[Method 3] Response type: ${typeof data}, isArray: ${Array.isArray(data)}`);
      
      if (Array.isArray(data) && data.length > 0) {
        const transcript = data
          .map((item: any) => item.text || item.content || '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (transcript.length > 0) {
          console.log(`[Method 3] SUCCESS via ${api.name}! Extracted ${transcript.length} chars`);
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

// Method 4: Use YouTube's Innertube API (impersonating Android client)
async function tryInnertubeApi(videoId: string): Promise<string | null> {
  console.log(`[Method 4: Innertube] Trying YouTube Innertube API for ${videoId}`);
  
  try {
    // Step 1: Fetch video page to get INNERTUBE_API_KEY
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}&hl=en&gl=US`;
    console.log(`[Method 4: Innertube] Fetching video page for API key`);
    
    const pageResponse = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'CONSENT=YES+1',
      }
    });
    
    if (!pageResponse.ok) {
      console.log(`[Method 4: Innertube] Failed to fetch page: HTTP ${pageResponse.status}`);
      return null;
    }
    
    const html = await pageResponse.text();
    const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
    
    if (!apiKeyMatch) {
      console.log('[Method 4: Innertube] INNERTUBE_API_KEY not found in page');
      return null;
    }
    
    const apiKey = apiKeyMatch[1];
    console.log(`[Method 4: Innertube] Got API key: ${apiKey.substring(0, 10)}...`);
    
    // Step 2: Call Innertube player API as Android client
    const playerEndpoint = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`;
    console.log(`[Method 4: Innertube] Calling player API as Android client`);
    
    const playerResponse = await fetch(playerEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '20.10.38'
          }
        },
        videoId: videoId
      })
    });
    
    if (!playerResponse.ok) {
      console.log(`[Method 4: Innertube] Player API failed: HTTP ${playerResponse.status}`);
      return null;
    }
    
    const playerData = await playerResponse.json();
    console.log(`[Method 4: Innertube] Playability: ${playerData?.playabilityStatus?.status}`);
    
    // Step 3: Extract caption track URL
    const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
      console.log('[Method 4: Innertube] No caption tracks found');
      return null;
    }
    
    console.log(`[Method 4: Innertube] Found ${tracks.length} caption tracks`);
    const availableLangs = tracks.map((t: any) => `${t.languageCode}${t.kind === 'asr' ? ' (auto)' : ''}`);
    console.log(`[Method 4: Innertube] Available: ${availableLangs.join(', ')}`);
    
    // Find English track (prefer manual over auto)
    const englishManual = tracks.find((t: any) => t.languageCode === 'en' && t.kind !== 'asr');
    const englishAuto = tracks.find((t: any) => t.languageCode === 'en' && t.kind === 'asr');
    const anyEnglish = tracks.find((t: any) => t.languageCode?.startsWith('en'));
    const selectedTrack = englishManual || englishAuto || anyEnglish || tracks[0];
    
    if (!selectedTrack?.baseUrl) {
      console.log('[Method 4: Innertube] Selected track has no baseUrl');
      return null;
    }
    
    console.log(`[Method 4: Innertube] Using track: ${selectedTrack.languageCode}`);
    
    // Step 4: Fetch and parse caption XML
    const captionResponse = await fetch(selectedTrack.baseUrl);
    if (!captionResponse.ok) {
      console.log(`[Method 4: Innertube] Caption fetch failed: HTTP ${captionResponse.status}`);
      return null;
    }
    
    const xml = await captionResponse.text();
    console.log(`[Method 4: Innertube] Got caption XML, length: ${xml.length}`);
    console.log(`[Method 4: Innertube] XML preview: ${xml.substring(0, 500)}`);
    
    // Parse XML to extract text - YouTube uses <text start="X" dur="X">content</text>
    // The content might be in different formats, so try multiple patterns
    let segments: string[] = [];
    
    // Pattern 1: YouTube uses <p t="X" d="X">content</p> format
    const textMatches = [...xml.matchAll(/<p[^>]*>([^<]*)<\/p>/g)];
    console.log(`[Method 4: Innertube] Pattern 1 (<p>) matches: ${textMatches.length}`);
    
    if (textMatches.length > 0) {
      for (const match of textMatches) {
        let text = match[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' ')
          .replace(/\n/g, ' ')
          .trim();
        if (text) segments.push(text);
      }
    }
    
    // Pattern 2: Try with dotall flag for multiline content
    if (segments.length === 0) {
      const textMatches2 = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)];
      console.log(`[Method 4: Innertube] Pattern 2 matches: ${textMatches2.length}`);
      
      for (const match of textMatches2) {
        let text = match[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' ')
          .replace(/<[^>]+>/g, '')
          .replace(/\n/g, ' ')
          .trim();
        if (text) segments.push(text);
      }
    }
    
    if (segments.length > 0) {
      const transcript = segments.join(' ').replace(/\s+/g, ' ').trim();
      console.log(`[Method 4: Innertube] SUCCESS! ${transcript.length} chars from ${segments.length} segments`);
      return transcript;
    }
    
    console.log('[Method 4: Innertube] No text segments found in XML');
    return null;
    
  } catch (error) {
    console.log(`[Method 4: Innertube] Error: ${error}`);
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

    // Try Method 4: Innertube API (Android client)
    transcript = await tryInnertubeApi(videoId);
    if (transcript) {
      console.log('=== FINAL RESULT: SUCCESS via innertube ===');
      return new Response(
        JSON.stringify({
          success: true,
          transcript,
          method: 'innertube',
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
