import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
  
  // Check for minimum word count
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

    // Verify the video exists
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

    // Check rate limiting
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { data: recentSubmissions } = await supabase
      .from('youtube_transcripts')
      .select('created_at')
      .eq('video_id', videoId)
      .gte('created_at', oneHourAgo);
    
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
        confidence_score: null
      });

    if (transcriptError) {
      console.error('Error saving transcript:', transcriptError);
      throw new Error(`Failed to save transcript: ${transcriptError.message}`);
    }

    console.log('Saved manual transcript for video:', videoId);

    // Generate exercises using AI
    const exercises = await generateAIExercises(transcript.trim(), videoId, language);
    
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
    
    // Try to update video status to failed
    try {
      const bodyText = await req.clone().text();
      const body = JSON.parse(bodyText);
      if (body.videoId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        await supabase
          .from('youtube_videos')
          .update({ status: 'failed' })
          .eq('id', body.videoId);
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
