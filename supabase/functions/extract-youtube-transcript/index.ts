import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractVideoId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  
  if (!trimmed.includes('http') && !trimmed.includes('/') && !trimmed.includes('.')) {
    return trimmed;
  }
  
  const watchMatch = trimmed.match(/[?&]v=([^&]+)/);
  if (watchMatch) return watchMatch[1];
  
  const shortMatch = trimmed.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return shortMatch[1];
  
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([^?&]+)/);
  if (embedMatch) return embedMatch[1];
  
  return null;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, videoUrl } = await req.json();
    const id = videoId || extractVideoId(videoUrl);
    
    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid video ID' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[extract-youtube-transcript] Fetching transcript for: ${id}`);

    // SUPADATA API (server USA - no CORS, no GDPR blocks!)
    const response = await fetch(
      `https://supadata.ai/api/youtube-transcript?video_id=${id}`
    );

    if (response.ok) {
      const transcript = await response.text();
      
      if (transcript.trim().length > 50) {
        console.log(`[extract-youtube-transcript] Success! ${transcript.length} chars`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            transcript: transcript.trim(), 
            method: 'supadata' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: 'No transcript available for this video' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[extract-youtube-transcript] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Failed to extract transcript' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
