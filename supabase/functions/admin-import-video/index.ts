import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hardcoded founder allow-list
const FOUNDER_IDS = [
  '4019daee-273d-48e5-8128-fa3332e9acb0',
  'd16921f2-9385-4bcb-9052-5fd9902956fd',
];

const TOPICS = [
  'technology', 'business', 'travel', 'culture', 'food',
  'lifestyle', 'music', 'sport', 'science', 'history',
  'language', 'art', 'conversation', 'entertainment', 'health'
];

const languageCodeMap: Record<string, string> = {
  'it': 'italian', 'pt': 'portuguese', 'en': 'english',
  'es': 'spanish', 'fr': 'french', 'de': 'german',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    // Founder check
    if (!FOUNDER_IDS.includes(user.id)) {
      return new Response(JSON.stringify({ error: 'Forbidden: founders only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { videoUrl, transcript, language } = await req.json();

    if (!videoUrl) throw new Error('Video URL is required');
    if (!transcript || transcript.trim().length < 50) throw new Error('Transcript is required (min 50 chars)');

    const videoId = extractVideoId(videoUrl);
    if (!videoId) throw new Error('Invalid YouTube URL');

    // Check if video already exists
    const { data: existingVideo } = await supabase
      .from('youtube_videos')
      .select('id, status')
      .eq('video_id', videoId)
      .single();

    if (existingVideo && existingVideo.status === 'completed') {
      return new Response(JSON.stringify({
        success: true,
        videoDbId: existingVideo.id,
        message: 'Video already exists in library'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Delete failed attempts
    if (existingVideo) {
      await supabase.from('youtube_videos').delete().eq('id', existingVideo.id);
    }

    // Fetch metadata via oEmbed
    const videoInfo = await getVideoInfo(videoId);

    // Fetch duration (non-blocking if fails)
    const duration = await getVideoDuration(videoId);

    // Detect language from transcript via AI if not provided
    const resolvedLanguage = language && language !== 'auto'
      ? language
      : await detectLanguage(transcript);

    console.log('Resolved language:', resolvedLanguage);

    // Insert video record
    const { data: video, error: videoError } = await supabase
      .from('youtube_videos')
      .insert({
        video_id: videoId,
        title: videoInfo.title,
        description: videoInfo.description,
        thumbnail_url: videoInfo.thumbnail,
        duration: duration > 0 ? duration : null,
        language: resolvedLanguage,
        difficulty_level: 'beginner',
        status: 'completed',
        processed_at: new Date().toISOString(),
        added_by_user_id: user.id,
        is_curated: false,
        is_short: false
      })
      .select()
      .single();

    if (videoError) throw new Error(`Failed to create video: ${videoError.message}`);

    console.log('Created video:', video.id);

    // Save transcript
    const { error: transcriptError } = await supabase
      .from('youtube_transcripts')
      .insert({
        video_id: video.id,
        transcript: transcript.trim(),
        language: resolvedLanguage,
        word_count: transcript.trim().split(/\s+/).length
      });

    if (transcriptError) {
      console.error('Transcript save error:', transcriptError);
    }

    // Extract and save topics
    await extractTopicsFromTranscript(supabase, transcript, video.id);

    return new Response(JSON.stringify({
      success: true,
      videoDbId: video.id,
      title: videoInfo.title,
      language: resolvedLanguage,
      message: 'Video imported successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('admin-import-video error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractVideoId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (!trimmed.includes('http') && !trimmed.includes('/') && !trimmed.includes('.')) {
    return /^[a-zA-Z0-9_-]{11}$/.test(trimmed) ? trimmed : null;
  }
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];
  return null;
}

async function getVideoInfo(videoId: string) {
  const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
  if (!response.ok) throw new Error('Video not found on YouTube');
  const data = await response.json();
  return {
    title: data.title || 'YouTube Video',
    description: data.author_name ? `Video by ${data.author_name}` : '',
    thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  };
}

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return parseInt(match[1] || '0') * 3600 + parseInt(match[2] || '0') * 60 + parseInt(match[3] || '0');
}

async function getVideoDuration(videoId: string): Promise<number> {
  const API_KEY = Deno.env.get('YOUTUBE_DATA_API_KEY');
  if (!API_KEY) return 0;
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${API_KEY}`
    );
    if (!response.ok) return 0;
    const data = await response.json();
    const duration = data.items?.[0]?.contentDetails?.duration;
    return duration ? parseISO8601Duration(duration) : 0;
  } catch { return 0; }
}

async function detectLanguage(transcript: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return 'english';

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `What language is this text written in? Reply with ONLY the language name in English, lowercase (e.g. "italian", "portuguese", "english", "spanish", "french", "german").

Text: ${transcript.substring(0, 500)}`
        }]
      })
    });

    if (!response.ok) return 'english';
    const data = await response.json();
    const lang = data.choices?.[0]?.message?.content?.trim().toLowerCase() || 'english';
    // Validate it's a known language
    const known = ['italian', 'portuguese', 'english', 'spanish', 'french', 'german'];
    return known.includes(lang) ? lang : 'english';
  } catch { return 'english'; }
}

async function extractTopicsFromTranscript(supabase: any, transcript: string, videoId: string) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `Analyze this transcript and assign 1-3 relevant topics from this list:
${TOPICS.join(', ')}

Return ONLY a JSON array with 1-3 topics. Example: ["technology", "business"]

Transcript:
${transcript.substring(0, 2000)}`
        }]
      })
    });

    if (!response.ok) return;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();

    let topics: string[] = [];
    try {
      topics = JSON.parse(cleaned);
      topics = topics.filter(t => TOPICS.includes(t.toLowerCase())).slice(0, 3).map(t => t.toLowerCase());
    } catch {
      topics = TOPICS.filter(t => content.toLowerCase().includes(t)).slice(0, 3);
    }

    if (topics.length === 0) topics = ['culture'];

    const topicInserts = topics.map((topic, index) => ({
      video_id: videoId,
      topic,
      is_primary: index === 0
    }));

    await supabase.from('video_topics').insert(topicInserts);
    await supabase.from('youtube_videos').update({ category: topics[0] }).eq('id', videoId);

    console.log('Saved topics:', topics);
  } catch (error) {
    console.error('Topic extraction error:', error);
  }
}
