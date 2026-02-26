import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { weekVideoId } = await req.json();

    if (!weekVideoId) {
      throw new Error('weekVideoId is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    // Load the week_video
    const { data: weekVideo, error: wvError } = await supabase
      .from('week_videos')
      .select('*, learning_weeks(*)')
      .eq('id', weekVideoId)
      .single();

    if (wvError || !weekVideo) {
      throw new Error('Week video not found');
    }

    // If already linked, just return the linked_video_id
    if (weekVideo.linked_video_id) {
      return new Response(JSON.stringify({
        success: true,
        linkedVideoId: weekVideo.linked_video_id,
        message: 'Already linked'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!weekVideo.transcript || weekVideo.transcript.trim().length < 50) {
      throw new Error('Week video has no transcript or transcript is too short');
    }

    const language = weekVideo.learning_weeks?.language || 'english';
    const transcript = weekVideo.transcript.trim();

    console.log('Setting up exercises for week video:', weekVideoId, 'youtube_id:', weekVideo.youtube_id);

    // Step 1: Create a youtube_videos record
    // Check if one already exists for this youtube_id
    let { data: existingVideo } = await supabase
      .from('youtube_videos')
      .select('id')
      .eq('video_id', weekVideo.youtube_id)
      .maybeSingle();

    let youtubeVideoId: string;

    if (existingVideo) {
      youtubeVideoId = existingVideo.id;
      console.log('Found existing youtube_videos record:', youtubeVideoId);
    } else {
      const { data: newVideo, error: createError } = await supabase
        .from('youtube_videos')
        .insert({
          video_id: weekVideo.youtube_id,
          title: weekVideo.title,
          language,
          difficulty_level: 'beginner',
          status: 'completed',
          thumbnail_url: weekVideo.thumbnail_url,
          processed_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createError || !newVideo) {
        console.error('Error creating youtube_videos record:', createError);
        throw new Error('Failed to create video record');
      }

      youtubeVideoId = newVideo.id;
      console.log('Created youtube_videos record:', youtubeVideoId);
    }

    // Step 2: Save transcript to youtube_transcripts (if not exists)
    const { data: existingTranscript } = await supabase
      .from('youtube_transcripts')
      .select('id')
      .eq('video_id', youtubeVideoId)
      .maybeSingle();

    if (!existingTranscript) {
      const wordCount = transcript.split(/\s+/).length;
      await supabase
        .from('youtube_transcripts')
        .insert({
          video_id: youtubeVideoId,
          transcript,
          language,
          word_count: wordCount,
        });
      console.log('Saved transcript for video:', youtubeVideoId);
    }

    // Step 3: For curated source, delete existing beginner exercises to force regeneration
    const { data: existingExercises } = await supabase
      .from('youtube_exercises')
      .select('id')
      .eq('video_id', youtubeVideoId)
      .limit(1);

    const shouldGenerate = !existingExercises || existingExercises.length === 0;
    
    if (!shouldGenerate) {
      // Delete existing beginner exercises for curated to force fresh generation
      console.log('Curated source: deleting existing beginner exercises to regenerate');
      await supabase
        .from('youtube_exercises')
        .delete()
        .eq('video_id', youtubeVideoId)
        .eq('difficulty', 'beginner');
    }

    {
      // Step 4: Generate exercises via generate-level-exercises edge function with source='curated'
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
      
      const genResponse = await fetch(`${supabaseUrl}/functions/v1/generate-level-exercises`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader!,
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          videoId: youtubeVideoId,
          level: 'beginner',
          transcript: transcript,
          language: language,
          source: 'curated'
        })
      });

      const genData = await genResponse.json();
      if (!genResponse.ok || genData.error) {
        console.error('Error generating exercises via edge function:', genData.error);
        // Non-fatal: we still link the video even if exercise generation fails
      } else {
        console.log('Generated exercises via edge function:', genData.count);
      }
    }

    // Step 5: Link the week_video to the youtube_video
    const { error: linkError } = await supabase
      .from('week_videos')
      .update({ linked_video_id: youtubeVideoId })
      .eq('id', weekVideoId);

    if (linkError) {
      console.error('Error linking video:', linkError);
      throw new Error('Failed to link video');
    }

    console.log('Successfully set up week video:', weekVideoId, '-> youtube_video:', youtubeVideoId);

    return new Response(JSON.stringify({
      success: true,
      linkedVideoId: youtubeVideoId,
      message: 'Exercises generated and video linked successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in setup-week-video-exercises:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateExercises(transcript: string, videoId: string, language: string): Promise<any[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  if (!LOVABLE_API_KEY) {
    console.log('LOVABLE_API_KEY not found, using basic exercises');
    return generateBasicExercises(transcript, videoId);
  }

  const truncatedTranscript = transcript.substring(0, 3000);

  const prompt = `You are a language learning expert. Based on this video transcript, create exactly 15 exercises for A1-A2 beginner learners.

TRANSCRIPT:
${truncatedTranscript}

Generate exercises in JSON format. Return ONLY a valid JSON array, no markdown or explanations.

Create these 3 types of exercises:

1. VOCABULARY MATCHING (5 items, exercise_type: "vocabulary_matching"):
   - Match simple words from the video to their definitions/descriptions
   - Use basic nouns, colors, numbers, or common verbs from the transcript
   - Each exercise has a "question" (the word), "options" (4 possible definitions), and "correctAnswer" (the right definition)
   - Include "explanation" with a simple sentence using the word

2. LISTEN AND REPEAT (5 items, exercise_type: "listen_and_repeat"):
   - Single words or very short phrases (max 3 words) taken directly from the video
   - "question" is the word/phrase to repeat
   - "correctAnswer" is the same word/phrase
   - "explanation" contains the phonetic pronunciation guide (e.g., "Pronounced: BEH-ar")
   - "options" should be null

3. AUDIO FLASHCARDS (5 items, exercise_type: "audio_flashcard"):
   - Simple, concrete nouns from the video
   - "question" is the word in ${language}
   - "correctAnswer" is the translation
   - "explanation" contains pronunciation guide
   - "options" should be null

Each exercise object must have:
{
  "type": "vocabulary_matching" | "listen_and_repeat" | "audio_flashcard",
  "question": "the word or phrase",
  "options": ["opt1", "opt2", "opt3", "opt4"] or null,
  "correctAnswer": "the correct answer",
  "explanation": "brief explanation or pronunciation guide"
}

Order: first 5 vocabulary_matching, then 5 listen_and_repeat, then 5 audio_flashcard.
Return a JSON array with exactly 15 exercises.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      return generateBasicExercises(transcript, videoId);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      const exercises = JSON.parse(jsonMatch[0]);
      return exercises.map((ex: any, i: number) => ({
        video_id: videoId,
        question: ex.question,
        exercise_type: ex.type || 'vocabulary_matching',
        options: ex.options ? JSON.stringify(ex.options) : null,
        correct_answer: ex.correctAnswer,
        explanation: ex.explanation || '',
        difficulty: 'beginner',
        intensity: 'intense',
        xp_reward: 5,
        order_index: i
      }));
    }
  } catch (error) {
    console.error('Error generating A1-A2 exercises:', error);
  }

  return generateBasicExercises(transcript, videoId);
}

function generateBasicExercises(transcript: string, videoId: string): any[] {
  const exercises: any[] = [];
  const sentences = transcript.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
  const difficulties = ['beginner'];

  for (const difficulty of difficulties) {
    for (const intensity of ['light', 'intense']) {
      const count = intensity === 'light' ? 5 : 10;
      for (let i = 0; i < count && i < sentences.length; i++) {
        const sentence = sentences[i % sentences.length];
        const words = sentence.split(' ').filter(w => w.length > 3);
        const targetWord = words[Math.floor(Math.random() * words.length)] || 'word';

        exercises.push({
          video_id: videoId,
          question: `What word fits best in this context: "${sentence}"?`,
          exercise_type: 'multiple_choice',
          options: JSON.stringify([targetWord, targetWord + 's', 'the ' + targetWord, 'a ' + targetWord]),
          correct_answer: targetWord,
          explanation: `The correct answer is "${targetWord}" based on the context.`,
          difficulty,
          intensity,
          xp_reward: getXp(difficulty),
          order_index: i
        });
      }
    }
  }

  return exercises;
}

function getXp(level: string): number {
  const xp: Record<string, number> = { 'A1': 5, 'A2': 7, 'B1': 10, 'B2': 12, 'C1': 15, 'C2': 20 };
  return xp[level] || 10;
}
