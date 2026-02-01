import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoInfo {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { videoUrl, language = 'english', difficulty = 'beginner', skipDurationCheck = false } = await req.json();
    
    if (!videoUrl) {
      throw new Error('Video URL is required');
    }

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Fetch video duration and enforce 10-minute limit for user uploads
    const MAX_DURATION_SECONDS = 600; // 10 minutes
    let videoDuration = 0;
    
    if (!skipDurationCheck) {
      videoDuration = await getVideoDuration(videoId);
      console.log('Video duration:', videoDuration, 'seconds');
      
      // If we couldn't get duration, block the upload for safety
      if (videoDuration === 0) {
        throw new Error('Unable to verify video duration. Please try again or contact support.');
      }
      
      if (videoDuration > MAX_DURATION_SECONDS) {
        const durationMins = Math.ceil(videoDuration / 60);
        throw new Error(
          `Video is ${durationMins} minutes long. Maximum allowed is 10 minutes. Please choose a shorter video.`
        );
      }
    }

    const userId = user.id;

    // Check if video already exists with transcript
    const { data: existingVideo } = await supabase
      .from('youtube_videos')
      .select(`
        *,
        youtube_transcripts(transcript)
      `)
      .eq('video_id', videoId)
      .single();

    if (existingVideo && existingVideo.status === 'completed') {
      console.log('Video already exists and completed:', videoId);
      return new Response(JSON.stringify({ 
        success: true, 
        video: existingVideo,
        hasTranscript: !!existingVideo.youtube_transcripts?.[0]?.transcript,
        message: 'Video already processed - using existing data' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If video exists but is still processing, return status
    if (existingVideo && existingVideo.status === 'processing') {
      console.log('Video is currently processing:', videoId);
      return new Response(JSON.stringify({ 
        success: true, 
        video: existingVideo,
        message: 'Video is currently being processed' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If video exists but failed, delete and retry
    if (existingVideo && existingVideo.status === 'failed') {
      console.log('Retrying failed video:', videoId);
      await supabase.from('youtube_videos').delete().eq('id', existingVideo.id);
    }

    // Get video info from YouTube oEmbed API
    const videoInfo = await getVideoInfo(videoId);
    
    // Create video record with processing status
    const { data: video, error: videoError } = await supabase
      .from('youtube_videos')
      .insert({
        video_id: videoId,
        title: videoInfo.title,
        description: videoInfo.description,
        thumbnail_url: videoInfo.thumbnail,
        duration: videoDuration > 0 ? videoDuration : null,
        language,
        difficulty_level: difficulty,
        status: 'processing',
        processing_started_at: new Date().toISOString(),
        added_by_user_id: userId,
        is_curated: false
      })
      .select()
      .single();

    if (videoError) {
      throw new Error(`Failed to create video record: ${videoError.message}`);
    }

    console.log('Created video record:', video.id);

    // Start background processing (don't await - let it run async)
    processVideoInBackground(supabase, video, videoId);

    return new Response(JSON.stringify({ 
      success: true, 
      video,
      message: 'Video processing started. This may take 1-2 minutes.' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-youtube-video function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

async function getVideoInfo(videoId: string): Promise<VideoInfo> {
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    
    if (!response.ok) {
      throw new Error('Video not found');
    }
    
    const data = await response.json();
    
    return {
      id: videoId,
      title: data.title || 'YouTube Video',
      description: data.author_name ? `Video by ${data.author_name}` : 'YouTube Video',
      duration: 'N/A',
      thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    };
  } catch (error) {
    console.error('Error fetching video info:', error);
    throw new Error('Could not fetch video information.');
  }
}

// Parse ISO 8601 duration format (PT#H#M#S) to seconds
function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

// Primary method: YouTube Data API v3 (official, reliable)
async function getYouTubeAPIv3Duration(videoId: string): Promise<number> {
  const API_KEY = Deno.env.get('YOUTUBE_DATA_API_KEY');
  if (!API_KEY) {
    console.log('YOUTUBE_DATA_API_KEY not configured');
    return 0;
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${API_KEY}`
    );

    if (!response.ok) {
      console.log('YouTube API v3 failed:', response.status);
      return 0;
    }

    const data = await response.json();
    const duration = data.items?.[0]?.contentDetails?.duration;
    
    if (duration) {
      const seconds = parseISO8601Duration(duration);
      console.log(`YouTube API v3 duration: ${seconds}s (${duration})`);
      return seconds;
    }

    return 0;
  } catch (error) {
    console.log('YouTube API v3 error:', error);
    return 0;
  }
}

// Fallback: Simple HTML scraping with CONSENT cookie (only if API key not set)
async function scrapeDurationFromYouTube(videoId: string): Promise<number> {
  try {
    console.log('Fallback: Scraping YouTube HTML for duration...');
    const response = await fetch(
      `https://www.youtube.com/watch?v=${videoId}&hl=en&gl=US`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cookie': 'CONSENT=YES+1'
        }
      }
    );
    
    if (!response.ok) return 0;
    const html = await response.text();
    
    // Flexible meta tag match (order-independent)
    const metaMatch = html.match(/<meta[^>]*itemprop="duration"[^>]*content="([^"]+)"/i);
    if (metaMatch) {
      const duration = parseISO8601Duration(metaMatch[1]);
      if (duration > 0) {
        console.log(`Got duration from YouTube meta tag: ${duration}s`);
        return duration;
      }
    }
    
    // lengthSeconds - accept both quoted and unquoted
    const lengthMatch = html.match(/"lengthSeconds"\s*:\s*"?(\d+)"?/);
    if (lengthMatch) {
      const duration = parseInt(lengthMatch[1], 10);
      console.log(`Got duration from lengthSeconds: ${duration}s`);
      return duration;
    }
    
    return 0;
  } catch {
    return 0;
  }
}

async function getVideoDuration(videoId: string): Promise<number> {
  // Primary: YouTube Data API v3 (official, reliable)
  let duration = await getYouTubeAPIv3Duration(videoId);
  if (duration > 0) return duration;
  
  // Fallback: Simple HTML scraping (only if API key not set or failed)
  duration = await scrapeDurationFromYouTube(videoId);
  if (duration > 0) return duration;
  
  console.log('All duration sources failed for video:', videoId);
  return 0;
}

// Language code mapping for detected languages
const languageCodeMap: Record<string, string> = {
  'it': 'italian',
  'pt': 'portuguese',
  'pt-BR': 'portuguese',
  'pt-PT': 'portuguese',
  'en': 'english',
  'en-US': 'english',
  'en-GB': 'english',
  'es': 'spanish',
  'fr': 'french',
  'de': 'german',
  'ja': 'japanese',
  'ko': 'korean',
  'zh': 'chinese',
  'ru': 'russian',
  'ar': 'arabic',
  'hi': 'hindi'
};

async function processVideoInBackground(supabase: any, video: any, videoId: string) {
  try {
    console.log('Starting transcript extraction for video:', videoId);
    
    // Extract transcript from YouTube captions (now returns language too)
    const { transcript, detectedLanguage } = await extractTranscriptFromCaptions(videoId);
    
    if (!transcript || transcript.trim().length < 100) {
      throw new Error('Could not extract transcript. Video may not have captions enabled.');
    }

    console.log('Extracted transcript, length:', transcript.length, 'detected language:', detectedLanguage);

    // Map detected language code to full language name
    const correctLanguage = languageCodeMap[detectedLanguage] || languageCodeMap[detectedLanguage.split('-')[0]] || 'english';
    console.log('Mapped language:', detectedLanguage, '->', correctLanguage);

    // Update video with correct detected language
    if (correctLanguage !== video.language) {
      console.log('Updating video language from', video.language, 'to', correctLanguage);
      await supabase
        .from('youtube_videos')
        .update({ language: correctLanguage })
        .eq('id', video.id);
      video.language = correctLanguage;
    }

    // Save transcript with correct language
    const { error: transcriptError } = await supabase
      .from('youtube_transcripts')
      .insert({
        video_id: video.id,
        transcript,
        language: correctLanguage,
        word_count: transcript.split(' ').length
      });

    if (transcriptError) {
      throw new Error(`Failed to save transcript: ${transcriptError.message}`);
    }

    console.log('Saved transcript for video:', video.id, 'with language:', correctLanguage);

    // Extract topics from transcript using AI (1-3 topics)
    const topics = await extractTopicsFromTranscript(supabase, transcript, video.id);
    console.log('Extracted topics:', topics);

    // Update video with theme and status to completed (no exercise generation here)
    // Exercises will be generated on-demand when user selects a difficulty level
    await supabase
      .from('youtube_videos')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', video.id);

    console.log('Video processing completed successfully:', video.id);

  } catch (error) {
    console.error('Error in background processing:', error);
    
    // Update video status to failed with error message
    await supabase
      .from('youtube_videos')
      .update({
        status: 'failed'
      })
      .eq('id', video.id);
  }
}

// Expanded topic list with English identifiers
const TOPICS = [
  'technology', 'business', 'travel', 'culture', 'food',
  'lifestyle', 'music', 'sport', 'science', 'history',
  'language', 'art', 'conversation', 'entertainment', 'health'
];

async function extractTopicsFromTranscript(supabase: any, transcript: string, videoId: string): Promise<string[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    console.log('No LOVABLE_API_KEY, defaulting to culture');
    return ['culture'];
  }

  try {
    const truncatedTranscript = transcript.substring(0, 2000);

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

Return ONLY a JSON array with 1-3 topics, ordered by relevance (most relevant first).
Example: ["technology", "business"]

Transcript:
${truncatedTranscript}

Return ONLY the JSON array, nothing else.`
        }]
      })
    });

    if (!response.ok) {
      return ['culture'];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Parse JSON array from response
    let topics: string[] = [];
    try {
      // Clean response - remove markdown code blocks if present
      const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
      topics = JSON.parse(cleaned);
      
      // Validate topics are from our list and limit to 3
      topics = topics
        .filter((t: string) => TOPICS.includes(t.toLowerCase()))
        .slice(0, 3)
        .map((t: string) => t.toLowerCase());
    } catch (parseError) {
      // Fallback: try to find topics in the response text
      topics = TOPICS.filter(t => content.toLowerCase().includes(t)).slice(0, 3);
    }

    if (topics.length === 0) {
      topics = ['culture'];
    }

    console.log('Extracted topics:', topics);

    // Save topics to video_topics table
    const topicInserts = topics.map((topic, index) => ({
      video_id: videoId,
      topic,
      is_primary: index === 0
    }));

    const { error: topicsError } = await supabase
      .from('video_topics')
      .insert(topicInserts);

    if (topicsError) {
      console.error('Error saving topics:', topicsError);
    }

    // Also update the category field with primary topic for backward compatibility
    await supabase
      .from('youtube_videos')
      .update({ category: topics[0] })
      .eq('id', videoId);

    return topics;
  } catch (error) {
    console.error('Topic extraction error:', error);
    return ['culture'];
  }
}

interface TranscriptResult {
  transcript: string;
  detectedLanguage: string;
}

async function extractTranscriptFromCaptions(videoId: string): Promise<TranscriptResult> {
  console.log('Extracting transcript via Supadata API for video:', videoId);
  
  const SUPADATA_API_KEY = Deno.env.get('SUPADATA_API_KEY');
  if (!SUPADATA_API_KEY) {
    console.error('SUPADATA_API_KEY not configured');
    throw new Error('Transcript service not configured. Please contact support.');
  }

  try {
    const response = await fetch(
      `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=true`,
      {
        headers: {
          'x-api-key': SUPADATA_API_KEY
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Supadata API error ${response.status}: ${errorText}`);
      
      if (response.status === 404) {
        throw new Error('No captions available for this video. Try a video with subtitles enabled.');
      }
      throw new Error('Failed to extract transcript. Please try again or use manual input.');
    }

    const data = await response.json();
    
    if (!data.content || data.content.length < 50) {
      console.error('Transcript too short or empty:', data.content?.length || 0);
      throw new Error('Transcript is too short or unavailable. Try another video.');
    }

    console.log(`Supadata success: ${data.content.length} chars, lang: ${data.lang}`);
    return {
      transcript: data.content,
      detectedLanguage: data.lang || 'en'
    };
    
  } catch (error) {
    console.error('Supadata transcript extraction failed:', error);
    throw error;
  }
}

async function generateAIExercises(transcript: string, videoId: string, language: string): Promise<any[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    console.log('LOVABLE_API_KEY not found, using basic exercise generator');
    return generateBasicExercises(transcript, videoId);
  }
  
  console.log('Generating 90 AI exercises for video:', videoId);
  
  // Truncate transcript to avoid token limits
  const truncatedTranscript = transcript.substring(0, 6000);

  const systemPrompt = `You are an expert language learning exercise creator. Generate exercises based on video transcripts.

CRITICAL RULES:
1. Create UNIQUE questions - NEVER repeat the same information
2. RANDOMIZE correct answer positions
3. Base ALL questions on actual transcript content

EXERCISE TYPES:
- multiple_choice: 4 options (70-80% of exercises)
- fill_blank: Sentence with blank
- matching: Term-definition pairs
- sequencing: Order statements

XP REWARDS: beginner=5, intermediate=10, advanced=15

DIFFICULTY:
- beginner: Simple facts, basic vocabulary
- intermediate: Context, how/why questions
- advanced: Analysis, inference, nuance`;

  const userPrompt = `Generate 90 language learning exercises from this transcript.

DISTRIBUTION:
- BEGINNER: 30 exercises (10 light + 20 intense)
- INTERMEDIATE: 30 exercises (10 light + 20 intense)
- ADVANCED: 30 exercises (10 light + 20 intense)

TRANSCRIPT:
${truncatedTranscript}

Return JSON array with 90 exercises. Each:
{
  "question": "Question text",
  "type": "multiple_choice" | "fill_blank" | "matching" | "sequencing",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "Exact option text",
  "explanation": "Why correct",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "intensity": "light" | "intense"
}

Return ONLY JSON array.`;

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
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      return generateBasicExercises(transcript, videoId);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON in AI response');
      return generateBasicExercises(transcript, videoId);
    }

    const exercises = JSON.parse(jsonMatch[0]);
    console.log(`AI generated ${exercises.length} exercises`);

    return exercises.map((ex: any, i: number) => ({
      video_id: videoId,
      question: ex.question,
      exercise_type: ex.type || 'multiple_choice',
      options: ex.options,
      correct_answer: ex.correctAnswer,
      explanation: ex.explanation || '',
      difficulty: ex.difficulty || 'beginner',
      intensity: ex.intensity || 'light',
      xp_reward: ex.difficulty === 'advanced' ? 15 : ex.difficulty === 'intermediate' ? 10 : 5,
      order_index: i
    }));

  } catch (error) {
    console.error('AI exercise generation failed:', error);
    return generateBasicExercises(transcript, videoId);
  }
}

function generateBasicExercises(transcript: string, videoId: string): any[] {
  const exercises: any[] = [];
  const sentences = transcript.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
  const difficulties = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const intensities = ['light', 'intense'];
  
  for (const difficulty of difficulties) {
    for (const intensity of intensities) {
      const exerciseCount = intensity === 'light' ? 5 : 10;
      const types = ['multiple_choice', 'true_false', 'gap_fill'];
      
      for (let i = 0; i < exerciseCount && i < sentences.length; i++) {
        const sentence = sentences[i % sentences.length];
        const type = types[i % types.length];
        
        const words = sentence.split(' ').filter(w => w.length > 3);
        const targetWord = words[Math.floor(Math.random() * words.length)] || 'word';
        
        let exercise: any;
        
        if (type === 'multiple_choice') {
          exercise = {
            video_id: videoId,
            question: `What word fits best in this context: "${sentence}"?`,
            exercise_type: 'multiple_choice',
            options: JSON.stringify([targetWord, targetWord + 's', 'the ' + targetWord, 'a ' + targetWord]),
            correct_answer: targetWord,
            explanation: `The correct answer is "${targetWord}" based on the context.`,
            difficulty,
            intensity,
            xp_reward: getPointsByLevel(difficulty),
            order_index: i
          };
        } else if (type === 'true_false') {
          exercise = {
            video_id: videoId,
            question: `True or False: "${sentence}"`,
            exercise_type: 'true_false',
            options: JSON.stringify(['True', 'False']),
            correct_answer: 'True',
            explanation: 'This statement is from the video transcript.',
            difficulty,
            intensity,
            xp_reward: getPointsByLevel(difficulty),
            order_index: i
          };
        } else {
          const gappedSentence = sentence.replace(targetWord, '___');
          exercise = {
            video_id: videoId,
            question: `Fill in the blank: ${gappedSentence}`,
            exercise_type: 'gap_fill',
            options: JSON.stringify([targetWord, targetWord + 's', 'un' + targetWord]),
            correct_answer: targetWord,
            explanation: `The correct word is "${targetWord}".`,
            difficulty,
            intensity,
            xp_reward: getPointsByLevel(difficulty),
            order_index: i
          };
        }
        
        exercises.push(exercise);
      }
    }
  }
  
  return exercises;
}

function getPointsByLevel(level: string): number {
  const points: Record<string, number> = {
    'A1': 5,
    'A2': 7,
    'B1': 10,
    'B2': 12,
    'C1': 15,
    'C2': 20
  };
  return points[level] || 10;
}
