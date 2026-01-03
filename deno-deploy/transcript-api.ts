// Deno Deploy - YouTube Transcript Extraction API (USA servers)
// Deploy to: https://dash.deno.com
// This bypasses EU GDPR/LOGIN_REQUIRED issues

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

// Method 1: Extract captions from YouTube page HTML
async function tryPageCaptions(videoId: string): Promise<string | null> {
  console.log(`[Method 1: page-captions] Fetching YouTube page for video: ${videoId}`);
  
  try {
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}&hl=en&gl=US`;
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Cookie': 'CONSENT=YES+1',
      }
    });
    
    if (!response.ok) {
      console.log(`[Method 1] Failed to fetch page: HTTP ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    console.log(`[Method 1] Fetched HTML, length: ${html.length} chars`);
    
    // Check for CAPTCHA
    if (html.includes('class="g-recaptcha"')) {
      console.log('[Method 1] YouTube is showing CAPTCHA - rate limited');
      return null;
    }

    // Try to extract ytInitialPlayerResponse
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
    if (playerResponseMatch) {
      try {
        let jsonStr = playerResponseMatch[1];
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
          console.log(`[Method 1] Video not playable`);
          return null;
        }
        
        const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (captionTracks && Array.isArray(captionTracks) && captionTracks.length > 0) {
          console.log(`[Method 1] Found ${captionTracks.length} caption tracks`);
          return await fetchCaptionTrack(captionTracks);
        }
      } catch (e) {
        console.log(`[Method 1] Failed to parse ytInitialPlayerResponse: ${e}`);
      }
    }

    // Fallback: Split-based parsing
    const captionsSplit = html.split('"captions":');
    if (captionsSplit.length < 2) {
      console.log('[Method 1] No "captions": found in page HTML');
      return null;
    }
    
    let captionsJson = captionsSplit[1];
    const endMarkers = [',"videoDetails"', ',"microformat"', ',"cards"', ',"attestation"', ',"storyboards"'];
    let endIndex = captionsJson.length;
    
    for (const marker of endMarkers) {
      const idx = captionsJson.indexOf(marker);
      if (idx > 0 && idx < endIndex) {
        endIndex = idx;
      }
    }
    
    captionsJson = captionsJson.substring(0, endIndex);
    
    try {
      const captions = JSON.parse(captionsJson);
      const captionTracks = captions?.playerCaptionsTracklistRenderer?.captionTracks;
      
      if (!captionTracks || !Array.isArray(captionTracks) || captionTracks.length === 0) {
        console.log('[Method 1] No captionTracks array found');
        return null;
      }
      
      return await fetchCaptionTrack(captionTracks);
    } catch (parseError) {
      console.log(`[Method 1] JSON parse error: ${parseError}`);
      return null;
    }
    
  } catch (error) {
    console.log(`[Method 1] Error: ${error}`);
    return null;
  }
}

// Helper to fetch and parse caption track
async function fetchCaptionTrack(captionTracks: any[]): Promise<string | null> {
  console.log(`[fetchCaptionTrack] Processing ${captionTracks.length} tracks`);
  
  const availableLangs = captionTracks.map((t: any) => `${t.languageCode}${t.kind === 'asr' ? ' (auto)' : ''}`);
  console.log(`[fetchCaptionTrack] Available: ${availableLangs.join(', ')}`);
  
  // Prefer Italian for Italian videos, then English, then any
  const italianManual = captionTracks.find((t: any) => t.languageCode === 'it' && t.kind !== 'asr');
  const italianAuto = captionTracks.find((t: any) => t.languageCode === 'it' && t.kind === 'asr');
  const englishManual = captionTracks.find((t: any) => t.languageCode === 'en' && t.kind !== 'asr');
  const englishAuto = captionTracks.find((t: any) => t.languageCode === 'en' && t.kind === 'asr');
  const anyEnglish = captionTracks.find((t: any) => t.languageCode?.startsWith('en'));
  
  const selectedTrack = italianManual || italianAuto || englishManual || englishAuto || anyEnglish || captionTracks[0];
  
  if (!selectedTrack?.baseUrl) {
    console.log('[fetchCaptionTrack] Selected track has no baseUrl');
    return null;
  }
  
  console.log(`[fetchCaptionTrack] Using track: ${selectedTrack.languageCode}`);
  
  const captionResponse = await fetch(selectedTrack.baseUrl);
  if (!captionResponse.ok) {
    console.log(`[fetchCaptionTrack] Failed to fetch captions: HTTP ${captionResponse.status}`);
    return null;
  }
  
  const captionContent = await captionResponse.text();
  console.log(`[fetchCaptionTrack] Fetched caption content, length: ${captionContent.length}`);
  
  // Try JSON first
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
          console.log(`[fetchCaptionTrack] SUCCESS! ${transcript.length} chars from JSON`);
          return transcript;
        }
      }
    } catch {
      // Not JSON, try XML
    }
  }
  
  // Parse XML
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
    
    if (text) segments.push(text);
  }
  
  if (segments.length > 0) {
    const transcript = segments.join(' ').replace(/\s+/g, ' ').trim();
    console.log(`[fetchCaptionTrack] SUCCESS! ${transcript.length} chars from XML`);
    return transcript;
  }
  
  console.log('[fetchCaptionTrack] No text segments found');
  return null;
}

// Method 2: Timedtext API
async function tryTimedtextApi(videoId: string): Promise<string | null> {
  const languages = ['it', 'en', 'en-US', 'en-GB'];
  
  for (const lang of languages) {
    console.log(`[Method 2: timedtext] Trying language: ${lang}`);
    
    try {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });
      
      if (!response.ok) continue;
      
      const text = await response.text();
      if (!text || text.trim().length === 0) continue;
      
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
            console.log(`[Method 2] SUCCESS with ${lang}! ${transcript.length} chars`);
            return transcript;
          }
        }
      } catch {
        // Try XML
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
          console.log(`[Method 2] SUCCESS with ${lang} (XML)! ${transcript.length} chars`);
          return transcript;
        }
      }
    } catch (error) {
      console.log(`[Method 2] ${lang} error: ${error}`);
    }
  }
  
  console.log('[Method 2] All attempts failed');
  return null;
}

// Method 3: Innertube API (Android client)
async function tryInnertubeApi(videoId: string): Promise<string | null> {
  console.log(`[Method 3: Innertube] Trying for ${videoId}`);
  
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}&hl=en&gl=US`;
    const pageResponse = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'CONSENT=YES+1',
      }
    });
    
    if (!pageResponse.ok) return null;
    
    const html = await pageResponse.text();
    const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
    
    if (!apiKeyMatch) {
      console.log('[Method 3] API key not found');
      return null;
    }
    
    const apiKey = apiKeyMatch[1];
    
    const playerResponse = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38' } },
        videoId
      })
    });
    
    if (!playerResponse.ok) return null;
    
    const playerData = await playerResponse.json();
    const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    
    if (!tracks || tracks.length === 0) {
      console.log('[Method 3] No caption tracks');
      return null;
    }
    
    // Prefer Italian then English
    const italianTrack = tracks.find((t: any) => t.languageCode === 'it');
    const englishTrack = tracks.find((t: any) => t.languageCode === 'en');
    const selectedTrack = italianTrack || englishTrack || tracks[0];
    
    if (!selectedTrack?.baseUrl) return null;
    
    const captionResponse = await fetch(selectedTrack.baseUrl);
    if (!captionResponse.ok) return null;
    
    const xml = await captionResponse.text();
    const segments: string[] = [];
    
    // Pattern 1: <p> tags
    const pMatches = [...xml.matchAll(/<p[^>]*>([^<]*)<\/p>/g)];
    if (pMatches.length > 0) {
      for (const match of pMatches) {
        const text = match[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#39;/g, "'")
          .trim();
        if (text) segments.push(text);
      }
    }
    
    // Pattern 2: <text> tags
    if (segments.length === 0) {
      const textMatches = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)];
      for (const match of textMatches) {
        const text = match[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#39;/g, "'")
          .replace(/<[^>]+>/g, '')
          .trim();
        if (text) segments.push(text);
      }
    }
    
    if (segments.length > 0) {
      const transcript = segments.join(' ').replace(/\s+/g, ' ').trim();
      console.log(`[Method 3] SUCCESS! ${transcript.length} chars`);
      return transcript;
    }
    
    return null;
  } catch (error) {
    console.log(`[Method 3] Error: ${error}`);
    return null;
  }
}

// Main handler
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== Deno Deploy transcript-api called ===');

  try {
    const body = await req.json();
    const { videoUrl, videoId: providedVideoId, lang } = body;
    
    console.log(`Request: videoUrl=${videoUrl}, videoId=${providedVideoId}, lang=${lang}`);

    const videoId = extractVideoId(videoUrl || providedVideoId || '');
    
    if (!videoId) {
      return new Response(
        JSON.stringify({ success: false, transcript: null, method: null, error: 'Invalid video ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Video ID: ${videoId}`);

    // Try Method 1: Page captions
    let transcript = await tryPageCaptions(videoId);
    if (transcript) {
      console.log('=== SUCCESS via page-captions ===');
      return new Response(
        JSON.stringify({ success: true, transcript, method: 'page-captions', error: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try Method 2: Timedtext API
    transcript = await tryTimedtextApi(videoId);
    if (transcript) {
      console.log('=== SUCCESS via timedtext ===');
      return new Response(
        JSON.stringify({ success: true, transcript, method: 'timedtext', error: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try Method 3: Innertube API
    transcript = await tryInnertubeApi(videoId);
    if (transcript) {
      console.log('=== SUCCESS via innertube ===');
      return new Response(
        JSON.stringify({ success: true, transcript, method: 'innertube', error: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('=== FAILURE - all methods exhausted ===');
    return new Response(
      JSON.stringify({
        success: false,
        transcript: null,
        method: null,
        error: 'No captions available for this video'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        transcript: null,
        method: null,
        error: error instanceof Error ? error.message : 'Unexpected error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
