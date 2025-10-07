import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { generateAllExercises } from '../_shared/exerciseGenerator.ts';

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

interface Exercise {
  id: string;
  type: string;
  question: string;
  options?: any;
  correctAnswer: string;
  explanation: string;
  points: number;
  difficulty: string;
  level: string;
  mode: string;
  orderIndex?: number;
  vocabularyWords?: string[];
  contextSentence?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, language = 'italian', difficulty = 'beginner', userId } = await req.json();
    
    if (!videoUrl) {
      throw new Error('Video URL is required');
    }

    // Extract video ID from URL
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if video already exists
    const { data: existingVideo } = await supabase
      .from('youtube_videos')
      .select('*')
      .eq('video_id', videoId)
      .single();

    if (existingVideo) {
      console.log('Video already exists:', videoId);
      return new Response(JSON.stringify({ 
        success: true, 
        video: existingVideo,
        message: 'Video already processed' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    // Start background processing
    await processVideoInBackground(supabase, video, videoId);

    return new Response(JSON.stringify({ 
      success: true, 
      video,
      message: 'Video processing started' 
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
    console.log('Starting transcript generation for video:', videoId);
    
    // Generate transcript using OpenAI Whisper
    const transcript = await generateTranscript(videoId);
    
    if (!transcript) {
      throw new Error('Failed to generate transcript');
    }

    console.log('Generated transcript, length:', transcript.length);

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

    // Generate exercises for all difficulty levels and intensities
    const exercises = await generateAllExercises(transcript, video.id);
    
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
    
    // Update video status to failed
    await supabase
      .from('youtube_videos')
      .update({
        status: 'failed'
      })
      .eq('id', video.id);
  }
}

async function generateTranscript(videoId: string): Promise<string> {
  console.log('Starting transcript generation for video:', videoId);
  
  try {
    // Try multiple transcript APIs in order (same as client-side)
    const APIs = [
      {
        url: `https://youtube-transcript-api.vercel.app/api/transcript?video_id=${videoId}`,
        parser: (data: any) => Array.isArray(data) ? data.map((item: any) => item.text).join(' ') : null
      },
      {
        url: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
        parser: (data: any) => data.events?.map((event: any) => 
          event.segs?.map((seg: any) => seg.utf8).join('') || ''
        ).join(' ') || null
      }
    ];

    for (const api of APIs) {
      try {
        console.log(`Trying transcript API: ${api.url}`);
        
        const response = await fetch(api.url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('API Response received:', typeof data);
          
          const transcript = api.parser(data);
          
          if (transcript && transcript.trim().length > 0) {
            console.log(`Transcript loaded successfully, length: ${transcript.length}`);
            return transcript.trim();
          }
        }
      } catch (error) {
        console.log(`API ${api.url} failed:`, error);
        continue; // Try next API
      }
    }
    
    throw new Error('All transcript APIs failed - no captions available');
  } catch (error) {
    console.error('Error generating transcript:', error);
    throw new Error('This video does not have captions available or the transcript service is temporarily unavailable.');
  }
}

// Exercise generation logic moved to _shared/exerciseGenerator.ts