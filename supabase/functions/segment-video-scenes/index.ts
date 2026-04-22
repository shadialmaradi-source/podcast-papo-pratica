import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

interface Scene {
  scene_index: number;
  start_time: number;
  end_time: number;
  scene_title: string;
  scene_transcript: string;
}

function isValidDuration(duration: number | null | undefined): duration is number {
  return typeof duration === 'number' && Number.isFinite(duration) && duration > 0;
}

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

async function scrapeDurationFromYouTube(videoId: string): Promise<number> {
  if (!videoId) return 0;

  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!response.ok) return 0;

    const html = await response.text();

    const metaMatch = html.match(/<meta\s+itemprop="duration"\s+content="([^"]+)"/i);
    if (metaMatch) {
      const parsed = parseISO8601Duration(metaMatch[1]);
      if (parsed > 0) return parsed;
    }

    const lengthMatch = html.match(/"lengthSeconds"\s*:\s*"?(\d+)"?/);
    if (lengthMatch) {
      const parsed = parseInt(lengthMatch[1], 10);
      if (parsed > 0) return parsed;
    }

    const approxMatch = html.match(/"approxDurationMs"\s*:\s*"(\d+)"/);
    if (approxMatch) {
      const parsed = Math.round(parseInt(approxMatch[1], 10) / 1000);
      if (parsed > 0) return parsed;
    }

    return 0;
  } catch {
    return 0;
  }
}

function deriveDurationFromSegments(segments: TranscriptSegment[]): number {
  if (segments.length === 0) return 0;

  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (!Number.isFinite(seg.start) || seg.start < 0) continue;
    const end = seg.start + (Number.isFinite(seg.duration) && seg.duration > 0 ? seg.duration : 0);
    if (end > 0) return Math.ceil(end);
  }

  return 0;
}

function estimateDurationFromTranscript(rawTranscript: string): number {
  const wordsPerMinute = 150;
  const secondsPerWord = 60 / wordsPerMinute;

  const plainText = typeof rawTranscript === 'string' ? rawTranscript : '';
  let textContent = plainText;

  try {
    const parsed = JSON.parse(plainText);
    if (Array.isArray(parsed)) {
      textContent = parsed.map((s: any) => s.text || '').join(' ');
    }
  } catch {
    // plain text transcript
  }

  const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount === 0) return 60;

  return Math.max(1, Math.round(wordCount * secondsPerWord));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { videoId } = await req.json();
    if (!videoId) throw new Error('videoId is required');

    console.log(`[segment-video-scenes] Starting for video ${videoId}`);

    // Check if scenes already exist (cache)
    const { data: existingScenes } = await supabase
      .from('video_scenes')
      .select('*')
      .eq('video_id', videoId)
      .order('scene_index', { ascending: true });

    if (existingScenes && existingScenes.length > 0) {
      console.log(`[segment-video-scenes] Returning ${existingScenes.length} cached scenes`);
      return new Response(JSON.stringify({ scenes: existingScenes, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch video duration
    const { data: videoData, error: videoError } = await supabase
      .from('youtube_videos')
      .select('id, video_id, duration, title, status, processing_started_at, processed_at')
      .eq('id', videoId)
      .single();

    if (videoError || !videoData) {
      throw new Error('Video not found');
    }

    // Fetch transcript from canonical store
    const { data: transcriptData } = await supabase
      .from('youtube_transcripts')
      .select('transcript')
      .eq('video_id', videoId)
      .single();

    let rawTranscript = transcriptData?.transcript || null;

    // Recovery path: some teacher-uploaded lessons may have transcript persisted on
    // teacher_lessons.transcript even when youtube_transcripts is missing.
    // Reuse that transcript and backfill canonical storage so segmentation can proceed.
    if (!rawTranscript && videoData.video_id) {
      const { data: lessonTranscriptSource } = await supabase
        .from('teacher_lessons')
        .select('id, transcript, created_at')
        .ilike('youtube_url', `%${videoData.video_id}%`)
        .not('transcript', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lessonTranscript = lessonTranscriptSource?.transcript?.trim() || '';
      if (lessonTranscript.length > 50) {
        rawTranscript = lessonTranscript;
        const { error: backfillError } = await supabase
          .from('youtube_transcripts')
          .upsert({
            video_id: videoId,
            transcript: rawTranscript,
            language: videoData.language || 'english',
            word_count: rawTranscript.split(/\s+/).filter(Boolean).length,
          }, { onConflict: 'video_id' });

        if (backfillError) {
          console.warn('[segment-video-scenes] Failed transcript backfill from teacher_lessons', {
            videoId,
            lessonId: lessonTranscriptSource?.id,
            error: backfillError.message,
          });
        } else {
          console.log('[segment-video-scenes] Recovered transcript from teacher_lessons', {
            videoId,
            lessonId: lessonTranscriptSource?.id,
          });
        }
      }
    }

    if (!rawTranscript) {
      const processingStartedAt = videoData.processing_started_at
        ? new Date(videoData.processing_started_at).getTime()
        : null;
      const processingAgeMs = processingStartedAt ? Date.now() - processingStartedAt : null;
      const hasTimedOutInProcessing = processingAgeMs !== null && processingAgeMs > (15 * 60 * 1000);

      let reason = 'transcript_not_ready';
      let retryable = true;

      if (videoData.status === 'failed') {
        reason = 'transcript_failed';
        retryable = false;
      } else if (videoData.status === 'completed') {
        // Completed video but missing transcript row indicates an upstream write/link issue.
        reason = 'transcript_missing';
        retryable = false;
      } else if (videoData.status === 'processing' && hasTimedOutInProcessing) {
        // Guard against stale "processing" records that can trap the UI in retry loops.
        reason = 'transcript_stalled';
        retryable = false;
      }

      console.warn('[segment-video-scenes] Transcript unavailable', {
        videoId,
        status: videoData.status,
        reason,
        retryable,
      });
      return new Response(JSON.stringify({
        scenes: [],
        reason,
        retryable,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to parse timed segments
    let segments: TranscriptSegment[] = [];
    try {
      const parsed = JSON.parse(rawTranscript);
      if (Array.isArray(parsed)) {
        segments = parsed.map((s: any) => ({
          text: s.text || '',
          start: parseFloat(s.start || s.offset || 0),
          duration: parseFloat(s.duration || s.dur || 0),
        }));
      }
    } catch {
      // Plain text transcript - no timed segments
    }

    let resolvedDuration = isValidDuration(videoData.duration) ? Math.ceil(videoData.duration) : 0;

    if (!isValidDuration(resolvedDuration)) {
      resolvedDuration = deriveDurationFromSegments(segments);
      if (isValidDuration(resolvedDuration)) {
        console.log(`[segment-video-scenes] Using duration from transcript timing: ${resolvedDuration}s`);
      }
    }

    if (!isValidDuration(resolvedDuration)) {
      resolvedDuration = await scrapeDurationFromYouTube(videoData.video_id);
      if (isValidDuration(resolvedDuration)) {
        console.log(`[segment-video-scenes] Using scraped YouTube duration: ${resolvedDuration}s`);
      }
    }

    if (!isValidDuration(resolvedDuration)) {
      resolvedDuration = estimateDurationFromTranscript(rawTranscript);
      console.log(`[segment-video-scenes] Using estimated transcript duration: ${resolvedDuration}s`);
    }

    if (isValidDuration(resolvedDuration) && videoData.duration !== resolvedDuration) {
      const { error: updateDurationError } = await supabase
        .from('youtube_videos')
        .update({ duration: resolvedDuration })
        .eq('id', videoId);

      if (updateDurationError) {
        console.warn(`[segment-video-scenes] Failed to persist duration for ${videoId}: ${updateDurationError.message}`);
      }
    }

    if (resolvedDuration <= 120) {
      console.log(`[segment-video-scenes] Video too short (${resolvedDuration}s), no segmentation needed`);
      return new Response(JSON.stringify({ scenes: [], reason: 'video_too_short' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let scenes: Scene[];

    if (segments.length > 0) {
      scenes = await segmentWithAI(segments, resolvedDuration, videoData.title);
    } else {
      // Fallback: split plain text by time estimate
      scenes = fallbackTimeSplit(rawTranscript, resolvedDuration);
    }

    if (scenes.length === 0) {
      scenes = fallbackTimeSplit(rawTranscript, resolvedDuration);
    }

    // Insert scenes
    const scenesToInsert = scenes.map(s => ({
      video_id: videoId,
      scene_index: s.scene_index,
      start_time: s.start_time,
      end_time: s.end_time,
      scene_title: s.scene_title,
      scene_transcript: s.scene_transcript,
    }));

    const { error: insertError } = await supabase
      .from('video_scenes')
      .upsert(scenesToInsert, { onConflict: 'video_id,scene_index' });

    if (insertError) {
      console.error('[segment-video-scenes] Insert error:', insertError);
      throw new Error(`Failed to save scenes: ${insertError.message}`);
    }

    console.log(`[segment-video-scenes] Saved ${scenes.length} scenes`);

    // Return the inserted scenes
    const { data: savedScenes } = await supabase
      .from('video_scenes')
      .select('*')
      .eq('video_id', videoId)
      .order('scene_index', { ascending: true });

    return new Response(JSON.stringify({ scenes: savedScenes || scenes, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[segment-video-scenes] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function segmentWithAI(segments: TranscriptSegment[], totalDuration: number, videoTitle: string): Promise<Scene[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.error('[segment-video-scenes] No LOVABLE_API_KEY, using fallback');
    return [];
  }

  // Build timed transcript text for AI
  const timedText = segments.map(s => {
    const mins = Math.floor(s.start / 60);
    const secs = Math.floor(s.start % 60);
    return `[${mins}:${secs.toString().padStart(2, '0')}] ${s.text}`;
  }).join('\n');

  // Truncate to avoid token limits
  const truncated = timedText.substring(0, 8000);

  const systemPrompt = `You are a video content analyzer. Split this video transcript into learning scenes for language learners.

Rules:
- Target scene duration: ~60 seconds
- Minimum: 20 seconds, Maximum: 120 seconds
- Split at: topic changes, dialogue exchanges, natural pauses, speaker changes, punctuation breaks
- If no natural break, split at the nearest sentence boundary to reach ~60s
- Generate a short descriptive title (3-6 words) for each scene summarizing its content
- Each scene must include the full transcript text for that segment

Return a JSON array:
[{"scene_index": 0, "start_time": 0, "end_time": 58, "scene_title": "Ordering Coffee", "scene_transcript": "full text..."}]

CRITICAL: Return ONLY the JSON array. No markdown, no code blocks.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Video: "${videoTitle}" (${Math.round(totalDuration)}s)\n\nTranscript:\n${truncated}` }
        ]
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[segment-video-scenes] AI error:', response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];

    // Validate scenes
    return parsed.map((s: any, i: number) => ({
      scene_index: i,
      start_time: parseFloat(s.start_time) || 0,
      end_time: parseFloat(s.end_time) || 0,
      scene_title: String(s.scene_title || `Scene ${i + 1}`),
      scene_transcript: String(s.scene_transcript || ''),
    })).filter((s: Scene) => s.end_time > s.start_time);

  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[segment-video-scenes] AI request timed out');
    } else {
      console.error('[segment-video-scenes] AI error:', err.message);
    }
    return [];
  }
}

function fallbackTimeSplit(transcript: string, totalDuration: number): Scene[] {
  const safeTotalDuration = isValidDuration(totalDuration) ? totalDuration : Math.max(60, estimateDurationFromTranscript(transcript));
  const targetDuration = 60;
  const sceneCount = Math.max(1, Math.round(safeTotalDuration / targetDuration));
  const sceneDuration = safeTotalDuration / sceneCount;

  // Split transcript roughly by proportion
  const plainText = typeof transcript === 'string' ? transcript : '';
  let textContent = plainText;
  try {
    const parsed = JSON.parse(plainText);
    if (Array.isArray(parsed)) {
      textContent = parsed.map((s: any) => s.text || '').join(' ');
    }
  } catch {
    // plain text transcript
  }

  const words = textContent.split(/\s+/);
  const wordsPerScene = Math.ceil(words.length / sceneCount);

  const scenes: Scene[] = [];
  for (let i = 0; i < sceneCount; i++) {
    const startWords = i * wordsPerScene;
    const endWords = Math.min((i + 1) * wordsPerScene, words.length);
    scenes.push({
      scene_index: i,
      start_time: Math.round(i * sceneDuration),
      end_time: Math.round(Math.min((i + 1) * sceneDuration, safeTotalDuration)),
      scene_title: `Part ${i + 1}`,
      scene_transcript: words.slice(startWords, endWords).join(' '),
    });
  }

  return scenes;
}
