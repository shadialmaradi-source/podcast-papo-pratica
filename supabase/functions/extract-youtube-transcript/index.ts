import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PLAN_VIDEO_LIMITS: Record<string, number> = {
  free: 5,
  trial: 10,
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

async function fetchVideoTitle(videoId: string): Promise<string> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (res.ok) {
      const data = await res.json();
      return data.title || `YouTube Video ${videoId}`;
    }
  } catch { /* ignore */ }
  return `YouTube Video ${videoId}`;
}

async function upsertVideoAndTranscript(
  supabase: any,
  youtubeVideoId: string,
  transcript: string,
  language: string,
  userId: string
): Promise<void> {
  try {
    // Check if youtube_videos record already exists
    const { data: existing } = await supabase
      .from('youtube_videos')
      .select('id, status, processed_at')
      .eq('video_id', youtubeVideoId)
      .maybeSingle();

    let dbVideoId: string;

    if (existing) {
      dbVideoId = existing.id;
      console.log(`[extract-youtube-transcript] youtube_videos record already exists: ${dbVideoId}`);
      if (existing.status !== 'completed') {
        const { error: statusUpdateError } = await supabase
          .from('youtube_videos')
          .update({
            status: 'completed',
            processed_at: existing.processed_at || new Date().toISOString(),
          })
          .eq('id', dbVideoId);
        if (statusUpdateError) {
          console.error('[extract-youtube-transcript] Failed to mark existing video as completed:', statusUpdateError.message);
        }
      }
    } else {
      // Fetch title from oEmbed
      const title = await fetchVideoTitle(youtubeVideoId);
      
      const { data: inserted, error: insertError } = await supabase
        .from('youtube_videos')
        .insert({
          video_id: youtubeVideoId,
          title,
          language: language || 'italian',
          difficulty_level: 'beginner',
          status: 'completed',
          processed_at: new Date().toISOString(),
          is_curated: false,
          added_by_user_id: userId,
          thumbnail_url: `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[extract-youtube-transcript] Failed to insert youtube_videos:', insertError.message);
        return;
      }
      dbVideoId = inserted.id;
      console.log(`[extract-youtube-transcript] Created youtube_videos record: ${dbVideoId}`);
    }

    // Upsert transcript into youtube_transcripts
    const { data: existingTranscript } = await supabase
      .from('youtube_transcripts')
      .select('id')
      .eq('video_id', dbVideoId)
      .maybeSingle();

    if (!existingTranscript) {
      const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
      const { error: transcriptError } = await supabase
        .from('youtube_transcripts')
        .insert({
          video_id: dbVideoId,
          transcript,
          language: language || 'italian',
          word_count: wordCount,
        });

      if (transcriptError) {
        console.error('[extract-youtube-transcript] Failed to insert youtube_transcripts:', transcriptError.message);
      } else {
        console.log(`[extract-youtube-transcript] Created youtube_transcripts record for video ${dbVideoId}`);
      }
    }
  } catch (err) {
    console.error('[extract-youtube-transcript] upsertVideoAndTranscript error:', err);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabaseAuth = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } }
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: authError } = await supabaseAuth.auth.getClaims(token);
    if (authError || !claimsData?.claims?.sub) {
      console.error('[extract-youtube-transcript] Auth failed:', authError?.message);
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub;

    const { videoId, videoUrl, teacherId, language } = await req.json();
    const id = videoId || extractVideoId(videoUrl);
    
    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid video ID' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[extract-youtube-transcript] Processing: ${id}, teacherId: ${teacherId || 'none'}`);

    // If teacherId is provided, require authenticated caller to match teacher identity
    if (teacherId) {
      if (userId !== teacherId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized: teacherId does not match authenticated user' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // teacherId is validated — enforce video duration limit
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

    // Resolve caller role for fallback gating
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const callerRole = await resolveCallerRole(supabaseService, userId, claimsData?.claims?.email);
    console.log(`[extract-youtube-transcript] Caller role: ${callerRole}`);

    let transcript: { text: string; lang: string; method: string } | null = null;

    // Plan A: Supadata
    transcript = await trySupadata(id);

    // Plan B: YouTube timedtext (free, captions)
    if (!transcript) {
      transcript = await tryYouTubeTimedText(id);
    }

    // Plan C: Voxtral (teacher only, audio ASR)
    if (!transcript && callerRole === 'teacher') {
      const durationMinutes = await getVideoDurationMinutes(id);
      const VOXTRAL_HARD_CAP = 15;
      if (durationMinutes !== null && durationMinutes > VOXTRAL_HARD_CAP) {
        console.log(`[transcript] Skipping Voxtral: ${durationMinutes.toFixed(1)}min > ${VOXTRAL_HARD_CAP}min cap`);
      } else {
        transcript = await tryVoxtral(id, language);
      }
    }

    if (transcript && transcript.text.length > 50) {
      console.log(`[transcript] method=${transcript.method} success, ${transcript.text.length} chars, lang: ${transcript.lang}`);
      await upsertVideoAndTranscript(
        supabaseService,
        id,
        transcript.text,
        language || transcript.lang || 'italian',
        userId
      );
      return new Response(
        JSON.stringify({
          success: true,
          transcript: transcript.text,
          language: transcript.lang,
          method: transcript.method,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // All providers failed
    const studentMessage = "This video has no captions available. Ask your teacher to add it, or try a different video.";
    const teacherMessage = "We couldn't extract a transcript from this video. The video may not have captions and audio transcription failed.";
    return new Response(
      JSON.stringify({
        success: false,
        error: callerRole === 'teacher' ? teacherMessage : studentMessage,
        reason: 'NO_TRANSCRIPT_AVAILABLE',
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
