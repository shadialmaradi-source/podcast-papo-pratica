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

// Extract audio URL using cobalt.tools API
async function getAudioUrl(videoId: string): Promise<string> {
  console.log('[Whisper] Getting audio URL from cobalt.tools...');
  
  const response = await fetch('https://api.cobalt.tools/api/json', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: `https://www.youtube.com/watch?v=${videoId}`,
      aFormat: 'mp3',
      isAudioOnly: true,
      filenamePattern: 'basic'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Whisper] Cobalt API error:', response.status, errorText);
    throw new Error(`Cobalt API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('[Whisper] Cobalt response:', JSON.stringify(data));
  
  if (data.status === 'error') {
    throw new Error(data.text || 'Cobalt API returned error');
  }
  
  // Handle different response formats
  const audioUrl = data.url || data.audio;
  if (!audioUrl) {
    throw new Error('No audio URL in cobalt response');
  }
  
  return audioUrl;
}

// Download audio file
async function downloadAudio(audioUrl: string): Promise<Blob> {
  console.log('[Whisper] Downloading audio...');
  
  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.status}`);
  }
  
  const blob = await response.blob();
  console.log(`[Whisper] Downloaded audio: ${blob.size} bytes`);
  
  // Whisper has a 25MB limit
  if (blob.size > 25 * 1024 * 1024) {
    throw new Error('Audio file too large (max 25MB). Try a shorter video.');
  }
  
  return blob;
}

// Transcribe audio using OpenAI Whisper
async function transcribeWithWhisper(audioBlob: Blob): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  
  console.log('[Whisper] Sending to OpenAI Whisper API...');
  
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.mp3');
  formData.append('model', 'whisper-1');
  
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Whisper] OpenAI API error:', response.status, errorText);
    throw new Error(`Whisper API error: ${response.status}`);
  }

  const result = await response.json();
  console.log(`[Whisper] Transcription complete: ${result.text?.length || 0} chars`);
  
  return result.text;
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

    console.log(`[extract-youtube-transcript] Processing video: ${id}`);

    // Step 1: Get audio URL from cobalt.tools
    const audioUrl = await getAudioUrl(id);
    
    // Step 2: Download audio
    const audioBlob = await downloadAudio(audioUrl);
    
    // Step 3: Transcribe with Whisper
    const transcript = await transcribeWithWhisper(audioBlob);
    
    if (!transcript || transcript.trim().length < 50) {
      throw new Error('Transcript too short or empty');
    }

    console.log(`[extract-youtube-transcript] Success! ${transcript.length} chars via Whisper`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        transcript: transcript.trim(), 
        method: 'whisper' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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
