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

// Read admin override email from server-side env var so it never ships
// in the client bundle. Empty string disables the override.
const ADMIN_OVERRIDE_EMAIL = (Deno.env.get('ADMIN_OVERRIDE_EMAIL') || '').trim().toLowerCase();

async function resolveCallerRole(supabase: any, userId: string, email?: string | null): Promise<'teacher' | 'student'> {
  if (ADMIN_OVERRIDE_EMAIL && (email || '').trim().toLowerCase() === ADMIN_OVERRIDE_EMAIL) return 'teacher';
  try {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (roleData?.role === 'teacher' || roleData?.role === 'student') return roleData.role;
    const { data: teacherProfile } = await supabase
      .from('teacher_profiles')
      .select('teacher_id')
      .eq('teacher_id', userId)
      .maybeSingle();
    if (teacherProfile) return 'teacher';
  } catch (e) {
    console.error('[role] resolveCallerRole error:', e);
  }
  return 'student';
}

async function trySupadata(videoId: string): Promise<{ text: string; lang: string; method: string } | null> {
  const SUPADATA_API_KEY = Deno.env.get('SUPADATA_API_KEY');
  if (!SUPADATA_API_KEY) {
    console.log('[transcript] Supadata key missing, skipping');
    return null;
  }
  try {
    const res = await fetch(
      `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=true`,
      { headers: { 'x-api-key': SUPADATA_API_KEY } }
    );
    if (!res.ok) {
      console.error(`[transcript] supadata HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (data?.content && data.content.length > 50) {
      return { text: data.content, lang: data.lang || 'unknown', method: 'supadata' };
    }
    return null;
  } catch (e) {
    console.error('[transcript] supadata error:', e);
    return null;
  }
}

async function tryYouTubeTimedText(videoId: string): Promise<{ text: string; lang: string; method: string } | null> {
  // Try several languages — auto-detect tracks via list endpoint first
  try {
    const listRes = await fetch(`https://video.google.com/timedtext?type=list&v=${videoId}`);
    if (!listRes.ok) {
      console.log(`[transcript] timedtext list HTTP ${listRes.status}`);
      return null;
    }
    const listXml = await listRes.text();
    const langMatches = [...listXml.matchAll(/lang_code="([^"]+)"/g)].map((m) => m[1]);
    const langs = langMatches.length > 0 ? langMatches : ['en', 'pt', 'pt-BR', 'es', 'it', 'fr', 'de'];

    for (const lang of langs) {
      const res = await fetch(`https://video.google.com/timedtext?lang=${lang}&v=${videoId}`);
      if (!res.ok) continue;
      const xml = await res.text();
      if (!xml || xml.length < 50) continue;
      const text = xml
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
      if (text.length > 50) {
        return { text, lang, method: 'timedtext' };
      }
    }
    return null;
  } catch (e) {
    console.error('[transcript] timedtext error:', e);
    return null;
  }
}

async function getYouTubeAudioUrl(videoId: string): Promise<string | null> {
  // Plan 1: Supadata audio endpoint (uses our existing SUPADATA_API_KEY)
  const SUPADATA_API_KEY = Deno.env.get('SUPADATA_API_KEY');
  if (SUPADATA_API_KEY) {
    try {
      const res = await fetch(
        `https://api.supadata.ai/v1/youtube/video?videoId=${videoId}&audio=true`,
        { headers: { 'x-api-key': SUPADATA_API_KEY } }
      );
      if (res.ok) {
        const data = await res.json();
        const url =
          data?.audioUrl ||
          data?.audio_url ||
          data?.audio?.url ||
          data?.audio?.[0]?.url ||
          (Array.isArray(data?.formats)
            ? data.formats.find((f: any) => f.mimeType?.startsWith('audio/') || f.type === 'audio')?.url
            : null);
        if (url) {
          console.log('[audio] resolved via supadata');
          return url;
        }
        console.log('[audio] supadata response had no audio URL');
      } else {
        console.error(`[audio] supadata HTTP ${res.status}: ${await res.text().catch(() => '')}`);
      }
    } catch (e) {
      console.error('[audio] supadata error:', e);
    }
  }

  // Plan 2: optional hosted yt-dlp microservice
  const AUDIO_RESOLVER_URL = Deno.env.get('AUDIO_RESOLVER_URL');
  if (AUDIO_RESOLVER_URL) {
    try {
      const sep = AUDIO_RESOLVER_URL.includes('?') ? '&' : '?';
      const res = await fetch(`${AUDIO_RESOLVER_URL}${sep}id=${videoId}`);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const url = data?.audioUrl || data?.url || null;
        if (url) {
          console.log('[audio] resolved via fallback resolver');
          return url;
        }
      } else {
        console.error(`[audio] fallback resolver HTTP ${res.status}`);
      }
    } catch (e) {
      console.error('[audio] fallback resolver error:', e);
    }
  }

  console.log('[audio] no resolver available — set SUPADATA_API_KEY or AUDIO_RESOLVER_URL');
  return null;
}

async function tryWhisper(videoId: string, languageHint?: string): Promise<{ text: string; lang: string; method: string } | null> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    console.log('[whisper] OPENAI_API_KEY missing, skipping');
    return null;
  }
  try {
    const audioUrl = await getYouTubeAudioUrl(videoId);
    if (!audioUrl) {
      console.log('[whisper] No audio URL resolved');
      return null;
    }
    console.log('[whisper] Fetching audio stream…');
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) {
      console.error(`[whisper] audio fetch HTTP ${audioRes.status}`);
      return null;
    }
    const audioBlob = await audioRes.blob();
    console.log(`[whisper] audio bytes: ${audioBlob.size}`);
    if (audioBlob.size > 25 * 1024 * 1024) {
      console.log('[whisper] audio > 25MB, skipping (OpenAI limit)');
      return null;
    }

    const form = new FormData();
    form.append('file', audioBlob, 'audio.webm');
    form.append('model', 'whisper-1');
    form.append('response_format', 'json');
    if (languageHint) form.append('language', languageHint.slice(0, 2));

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: form,
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[whisper] openai HTTP ${res.status}: ${errText}`);
      return null;
    }
    const result = await res.json();
    const text = result?.text || '';
    if (text.length > 50) {
      return { text, lang: languageHint || 'unknown', method: 'whisper' };
    }
    return null;
  } catch (e) {
    console.error('[whisper] error:', e);
    return null;
  }
}

async function tryVoxtral(videoId: string, languageHint?: string): Promise<{ text: string; lang: string; method: string } | null> {
  const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');
  if (!MISTRAL_API_KEY) {
    console.log('[voxtral] MISTRAL_API_KEY missing, skipping');
    return null;
  }
  try {
    const audioUrl = await getYouTubeAudioUrl(videoId);
    if (!audioUrl) {
      console.log('[voxtral] No audio URL resolved');
      return null;
    }
    console.log('[voxtral] Fetching audio stream…');
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) {
      console.error(`[voxtral] audio fetch HTTP ${audioRes.status}`);
      return null;
    }
    const audioBlob = await audioRes.blob();
    console.log(`[voxtral] audio bytes: ${audioBlob.size}`);

    const form = new FormData();
    form.append('file', audioBlob, 'audio.webm');
    form.append('model', 'voxtral-mini-latest');
    if (languageHint) form.append('language', languageHint.slice(0, 2));

    const transRes = await fetch('https://api.mistral.ai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${MISTRAL_API_KEY}` },
      body: form,
    });
    if (!transRes.ok) {
      const errText = await transRes.text();
      console.error(`[voxtral] mistral HTTP ${transRes.status}: ${errText}`);
      return null;
    }
    const result = await transRes.json();
    const text = result?.text || '';
    if (text.length > 50) {
      return { text, lang: result?.language || languageHint || 'unknown', method: 'voxtral' };
    }
    return null;
  } catch (e) {
    console.error('[voxtral] error:', e);
    return null;
  }
}



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

    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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
    const callerRole = await resolveCallerRole(supabaseService, userId, claimsData?.claims?.email);
    console.log(`[extract-youtube-transcript] Caller role: ${callerRole}`);

    // Fast-path reuse: only after access checks and caller role resolution.
    const { data: existingVideo } = await supabaseService
      .from('youtube_videos')
      .select('id, status')
      .eq('video_id', id)
      .maybeSingle();

    if (existingVideo?.id) {
      const { data: existingTranscript } = await supabaseService
        .from('youtube_transcripts')
        .select('transcript, language')
        .eq('video_id', existingVideo.id)
        .maybeSingle();

      const transcriptText = existingTranscript?.transcript?.trim() || '';
      if (transcriptText.length > 50) {
        console.log(`[extract-youtube-transcript] Reusing canonical transcript for ${id}`);
        return new Response(
          JSON.stringify({
            success: true,
            transcript: transcriptText,
            language: existingTranscript?.language || language || 'english',
            source: 'database',
            reused: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let transcript: { text: string; lang: string; method: string } | null = null;

    // Plan A: Supadata
    transcript = await trySupadata(id);

    // Plan B: YouTube timedtext (free, captions)
    if (!transcript) {
      transcript = await tryYouTubeTimedText(id);
    }

    // Plan C: OpenAI Whisper (teacher only, audio ASR — primary)
    // Plan D: Voxtral (teacher only, audio ASR — backup)
    if (!transcript && callerRole === 'teacher') {
      const durationMinutes = await getVideoDurationMinutes(id);
      const ASR_HARD_CAP = 15;
      if (durationMinutes !== null && durationMinutes > ASR_HARD_CAP) {
        console.log(`[transcript] Skipping ASR: ${durationMinutes.toFixed(1)}min > ${ASR_HARD_CAP}min cap`);
      } else {
        transcript = await tryWhisper(id, language);
        if (!transcript) {
          transcript = await tryVoxtral(id, language);
        }
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
