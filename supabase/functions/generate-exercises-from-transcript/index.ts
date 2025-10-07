import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { generateAllExercises } from '../_shared/exerciseGenerator.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { error: transcriptError } = await supabase
      .from('youtube_transcripts')
      .insert({
        video_id: videoId,
        transcript: transcript.trim(),
        language,
        word_count: transcript.split(' ').length,
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
