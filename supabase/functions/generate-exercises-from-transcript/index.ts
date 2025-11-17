import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { generateAllExercises } from '../_shared/exerciseGenerator.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function validateTranscriptContent(text: string): { valid: boolean; error?: string } {
  // Check for excessive special characters
  const specialCharRatio = (text.match(/[^a-zA-Z0-9\s,.!?'\-]/g) || []).length / text.length;
  if (specialCharRatio > 0.15) {
    return { valid: false, error: 'Transcript contains too many special characters' };
  }
  
  // Check for repeated patterns (spam detection)
  if (/(.{20,})\1{3,}/.test(text)) {
    return { valid: false, error: 'Transcript contains excessive repetition' };
  }
  
  // Check for prompt injection attempts
  const dangerousPatterns = [
    'ignore previous', 'ignore all previous', 'system:', 'assistant:', 
    '<script>', 'DROP TABLE', 'DELETE FROM', 'UPDATE users'
  ];
  const lowerText = text.toLowerCase();
  for (const pattern of dangerousPatterns) {
    if (lowerText.includes(pattern)) {
      return { valid: false, error: 'Transcript contains potentially malicious content' };
    }
  }
  
  // Check for minimum word count (not just character count)
  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount < 50) {
    return { valid: false, error: 'Transcript must contain at least 50 words' };
  }
  
  return { valid: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, transcript, language } = await req.json();
    
    if (!videoId || !transcript || !language) {
      throw new Error('videoId, transcript, and language are required');
    }

    // Validate transcript length
    if (transcript.length < 100) {
      throw new Error('Transcript is too short (minimum 100 characters)');
    }

    if (transcript.length > 50000) {
      throw new Error('Transcript is too long (maximum 50,000 characters)');
    }

    // Validate content
    const validation = validateTranscriptContent(transcript);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    // Verify the video exists and belongs to the user
    const { data: video, error: videoError } = await supabase
      .from('youtube_videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      throw new Error('Video not found');
    }

    if (video.status !== 'failed') {
      throw new Error('Only failed videos can have transcripts added manually');
    }

    // Check rate limiting - max 3 submissions per hour per video
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { data: recentSubmissions, error: rateLimitError } = await supabase
      .from('youtube_transcripts')
      .select('created_at')
      .eq('video_id', videoId)
      .gte('created_at', oneHourAgo);
    
    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    }
    
    if (recentSubmissions && recentSubmissions.length >= 3) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Maximum 3 transcript submissions per hour per video.' 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Processing manual transcript for video:', videoId);

    // Update video status to processing
    await supabase
      .from('youtube_videos')
      .update({
        status: 'processing',
        processing_started_at: new Date().toISOString()
      })
      .eq('id', videoId);

    // Save transcript
    const wordCount = transcript.trim().split(/\s+/).length;
    const { error: transcriptError } = await supabase
      .from('youtube_transcripts')
      .insert({
        video_id: videoId,
        transcript: transcript.trim(),
        language,
        word_count: wordCount,
        confidence_score: null // Manual transcripts don't have confidence scores
      });

    if (transcriptError) {
      console.error('Error saving transcript:', transcriptError);
      throw new Error(`Failed to save transcript: ${transcriptError.message}`);
    }

    console.log('Saved manual transcript for video:', videoId);

    // Generate exercises for all difficulty levels and intensities
    const exercises = await generateAllExercises(transcript, videoId);
    
    if (exercises.length > 0) {
      const { error: exercisesError } = await supabase
        .from('youtube_exercises')
        .insert(exercises);

      if (exercisesError) {
        console.error('Error saving exercises:', exercisesError);
        throw new Error(`Failed to save exercises: ${exercisesError.message}`);
      }

      console.log('Saved', exercises.length, 'exercises for video:', videoId);
    }

    // Update video status to completed
    await supabase
      .from('youtube_videos')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', videoId);

    console.log('Manual transcript processing completed successfully:', videoId);

    return new Response(JSON.stringify({ 
      success: true, 
      exerciseCount: exercises.length,
      message: 'Exercises generated successfully from manual transcript' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-exercises-from-transcript function:', error);
    
    // Try to update video status to failed if we have the videoId
    try {
      const { videoId } = await req.json();
      if (videoId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        await supabase
          .from('youtube_videos')
          .update({ status: 'failed' })
          .eq('id', videoId);
      }
    } catch (e) {
      console.error('Failed to update video status:', e);
    }
    
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
