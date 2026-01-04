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

    const { videoUrl, language = 'english', difficulty = 'beginner' } = await req.json();
    
    if (!videoUrl) {
      throw new Error('Video URL is required');
    }

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
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

async function processVideoInBackground(supabase: any, video: any, videoId: string) {
  try {
    console.log('Starting transcript extraction for video:', videoId);
    
    // Extract transcript from YouTube captions
    const transcript = await extractTranscriptFromCaptions(videoId);
    
    if (!transcript || transcript.trim().length < 100) {
      throw new Error('Could not extract transcript. Video may not have captions enabled.');
    }

    console.log('Extracted transcript, length:', transcript.length);

    // Save transcript
    const { error: transcriptError } = await supabase
      .from('youtube_transcripts')
      .insert({
        video_id: video.id,
        transcript,
        language: video.language,
        word_count: transcript.split(' ').length
      });

    if (transcriptError) {
      throw new Error(`Failed to save transcript: ${transcriptError.message}`);
    }

    console.log('Saved transcript for video:', video.id);

    // Generate exercises using AI
    const exercises = await generateAIExercises(transcript, video.id, video.language);
    
    if (exercises.length > 0) {
      const { error: exercisesError } = await supabase
        .from('youtube_exercises')
        .insert(exercises);

      if (exercisesError) {
        throw new Error(`Failed to save exercises: ${exercisesError.message}`);
      }

      console.log('Saved', exercises.length, 'exercises for video:', video.id);
    }

    // Update video status to completed
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

async function extractTranscriptFromCaptions(videoId: string): Promise<string> {
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
    return data.content;
    
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
  
  console.log('Generating exercises using AI...');
  
  const difficulties = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const intensities = ['light', 'intense'];
  const allExercises: any[] = [];
  
  // Use a subset of transcript to avoid token limits
  const truncatedTranscript = transcript.substring(0, 3000);
  
  for (const difficulty of difficulties) {
    for (const intensity of intensities) {
      const exerciseCount = intensity === 'light' ? 5 : 10;
      
      try {
        const prompt = `You are a language learning expert. Based on this video transcript, create ${exerciseCount} exercises for ${difficulty} level learners (intensity: ${intensity}).

TRANSCRIPT:
${truncatedTranscript}

Generate exercises in JSON format. Return ONLY a valid JSON array, no markdown or explanations.

Each exercise should have:
{
  "type": "multiple_choice" | "true_false" | "gap_fill",
  "question": "the question text",
  "options": ["option1", "option2", "option3", "option4"],
  "correctAnswer": "the correct answer exactly as it appears in options",
  "explanation": "brief explanation"
}

For ${difficulty} level:
- A1/A2: Simple vocabulary, short sentences, common words
- B1/B2: Moderate complexity, idiomatic expressions
- C1/C2: Complex ideas, nuanced vocabulary, abstract concepts

Return a JSON array with exactly ${exerciseCount} exercises.`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'user', content: prompt }
            ],
            max_tokens: 2000
          })
        });
        
        if (!response.ok) {
          console.error('AI API error:', response.status);
          continue;
        }
        
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        
        // Parse the JSON from the response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const exercises = JSON.parse(jsonMatch[0]);
          
          for (let i = 0; i < exercises.length; i++) {
            const exercise = exercises[i];
            allExercises.push({
              video_id: videoId,
              question: exercise.question,
              exercise_type: exercise.type || 'multiple_choice',
              options: exercise.options ? JSON.stringify(exercise.options) : null,
              correct_answer: exercise.correctAnswer,
              explanation: exercise.explanation || '',
              difficulty,
              intensity,
              xp_reward: getPointsByLevel(difficulty),
              order_index: i
            });
          }
        }
        
      } catch (error) {
        console.error(`Error generating exercises for ${difficulty}/${intensity}:`, error);
      }
    }
  }
  
  // If AI generation failed, fall back to basic exercises
  if (allExercises.length === 0) {
    console.log('AI exercise generation failed, using basic generator');
    return generateBasicExercises(transcript, videoId);
  }
  
  return allExercises;
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
