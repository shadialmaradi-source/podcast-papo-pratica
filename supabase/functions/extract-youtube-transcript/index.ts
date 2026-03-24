import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLAN_VIDEO_LIMITS: Record<string, number> = {
  free: 5,
  pro: 10,
  premium: 15,
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

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 60 + minutes + seconds / 60;
}

async function getVideoDurationMinutes(videoId: string): Promise<number | null> {
  const apiKey = Deno.env.get('YOUTUBE_DATA_API_KEY');
  if (!apiKey) {
    console.log('[duration] No YOUTUBE_DATA_API_KEY, skipping duration check');
    return null;
  }
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${apiKey}`
    );
    if (!res.ok) {
      console.error('[duration] YouTube API error:', res.status);
      return null;
    }
    const data = await res.json();
    const iso = data.items?.[0]?.contentDetails?.duration;
    if (!iso) return null;
    return parseISO8601Duration(iso);
  } catch (e) {
    console.error('[duration] Failed to fetch duration:', e);
    return null;
  }
}

async function getTeacherPlan(teacherId: string): Promise<string> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  const { data } = await supabase
    .from('teacher_subscriptions')
    .select('plan')
    .eq('teacher_id', teacherId)
    .maybeSingle();
  return (data as any)?.plan || 'free';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabaseAuth = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { videoId, videoUrl, teacherId } = await req.json();
    const id = videoId || extractVideoId(videoUrl);
    
    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid video ID' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[extract-youtube-transcript] Processing: ${id}, teacherId: ${teacherId || 'none'}`);

    // If teacherId is provided, enforce video duration limit
    if (teacherId) {
      const durationMinutes = await getVideoDurationMinutes(id);
      if (durationMinutes !== null) {
        const plan = await getTeacherPlan(teacherId);
        const maxMinutes = PLAN_VIDEO_LIMITS[plan] || PLAN_VIDEO_LIMITS.free;
        console.log(`[duration] Video: ${durationMinutes.toFixed(1)}min, plan: ${plan}, limit: ${maxMinutes}min`);
        if (durationMinutes > maxMinutes) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `VIDEO_TOO_LONG:This video is ${Math.ceil(durationMinutes)} minutes long. Your ${plan} plan allows videos up to ${maxMinutes} minutes. Upgrade your plan for longer videos.`,
              durationMinutes: Math.ceil(durationMinutes),
              maxMinutes,
              plan,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    const SUPADATA_API_KEY = Deno.env.get('SUPADATA_API_KEY');
    if (!SUPADATA_API_KEY) {
      throw new Error('SUPADATA_API_KEY not configured');
    }

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
