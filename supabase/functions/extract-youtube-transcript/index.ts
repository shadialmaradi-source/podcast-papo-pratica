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

    console.log(`[extract-youtube-transcript] Processing: ${id}`);

    const SUPADATA_API_KEY = Deno.env.get('SUPADATA_API_KEY');
    if (!SUPADATA_API_KEY) {
      throw new Error('SUPADATA_API_KEY not configured');
    }

    // Call Supadata API for transcript
    const response = await fetch(
      `https://api.supadata.ai/v1/youtube/transcript?videoId=${id}&text=true`,
      {
        headers: {
          'x-api-key': SUPADATA_API_KEY
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Supadata] Error ${response.status}: ${errorText}`);
      throw new Error(`Supadata API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.content && data.content.length > 50) {
      console.log(`[extract-youtube-transcript] Success! ${data.content.length} chars, lang: ${data.lang}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          transcript: data.content,
          language: data.lang,
          availableLanguages: data.availableLangs,
          method: 'supadata' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('No transcript available for this video');

  } catch (error) {
    console.error('[extract-youtube-transcript] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to extract transcript' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});