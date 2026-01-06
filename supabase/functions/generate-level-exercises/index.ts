import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { videoId, level, transcript, language } = await req.json();

    if (!videoId || !level) {
      throw new Error('videoId and level are required');
    }

    console.log(`[generate-level-exercises] Starting for video ${videoId}`);
    console.log(`[generate-level-exercises] Level: ${level}, Language: ${language || 'not specified'}`);

    // Normalize level to lowercase
    const normalizedLevel = level.toLowerCase();

    // Check if exercises already exist for this level
    const { count: existingCount } = await supabase
      .from('youtube_exercises')
      .select('id', { count: 'exact', head: true })
      .eq('video_id', videoId)
      .eq('difficulty', normalizedLevel);

    if (existingCount && existingCount > 0) {
      console.log(`[generate-level-exercises] Exercises already exist for ${normalizedLevel} level: ${existingCount}`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Exercises already exist',
        count: existingCount
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get transcript if not provided
    let transcriptText = transcript;
    if (!transcriptText) {
      console.log(`[generate-level-exercises] No transcript provided, fetching from DB...`);
      
      const { data: transcriptData, error: transcriptError } = await supabase
        .from('youtube_transcripts')
        .select('transcript')
        .eq('video_id', videoId)
        .single();
      
      if (transcriptError) {
        console.error(`[generate-level-exercises] Transcript fetch error:`, transcriptError);
      }
      
      if (transcriptData) {
        transcriptText = transcriptData.transcript;
        console.log(`[generate-level-exercises] Fetched transcript, length: ${transcriptText?.length || 0}`);
      }
    }

    if (!transcriptText) {
      throw new Error('No transcript available for this video. Please ensure the video has been processed.');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Truncate transcript to avoid token limits
    const truncatedTranscript = transcriptText.substring(0, 5000);
    
    // Get language name for prompt
    const languageName = language || 'italian';
    const languageDisplay = languageName.charAt(0).toUpperCase() + languageName.slice(1);

    // XP based on level
    const xpReward = normalizedLevel === 'advanced' ? 15 : normalizedLevel === 'intermediate' ? 10 : 5;

    // Level-specific guidelines
    const levelGuidelines: Record<string, string> = {
      beginner: `BEGINNER Level Guidelines:
- Simple, direct questions about facts mentioned in the episode
- Short, clear sentences
- Basic vocabulary
- Concrete information (who, what, when, where)
- Example: "Dove si trova il museo?" "Quando è successo?"`,
      
      intermediate: `INTERMEDIATE Level Guidelines:
- More complex sentence structures
- Questions requiring deeper comprehension
- Understanding of context and relationships
- Some idiomatic expressions
- Numerical details and specific information
- Questions about "how" and "why"
- Example: "Quanto è costato il progetto?" "Qual era la preoccupazione principale?"`,
      
      advanced: `ADVANCED Level Guidelines:
- Sophisticated vocabulary and complex grammar
- Analysis and interpretation required
- Idiomatic expressions and metaphors
- Cultural and contextual nuances
- Critical thinking about implications
- Abstract concepts
- Example: "Cosa significa 'rafforzare' in questo contesto?" "Analizza il significato di..."`
    };

    const systemPrompt = `You are an expert ${languageDisplay} language teacher creating exercises for language learners. ALL content must be in ${languageDisplay}.`;

    const userPrompt = `Generate EXACTLY 10 exercises from this transcript with this EXACT distribution:
- 6 multiple_choice questions (60%)
- 2 fill_blank questions (20%)
- 1 sequencing question (10%)
- 1 matching question (10%)

${levelGuidelines[normalizedLevel] || levelGuidelines.beginner}

TRANSCRIPT:
${truncatedTranscript}

EXERCISE FORMAT - Return a JSON array with EXACTLY these formats:

For multiple_choice (6 total):
{
  "type": "multiple_choice",
  "question": "Question text in ${languageDisplay}",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "Exact text of correct option",
  "explanation": "Brief explanation in ${languageDisplay}"
}

For fill_blank (2 total):
{
  "type": "fill_blank",
  "question": "Sentence with _____ for the blank in ${languageDisplay}",
  "options": [],
  "correctAnswer": "word that fills the blank",
  "explanation": "Explanation in ${languageDisplay}"
}

For sequencing (1 total):
{
  "type": "sequencing",
  "question": "Ordina gli eventi in ordine cronologico.",
  "options": ["Event 1", "Event 2", "Event 3", "Event 4"],
  "correctAnswer": "Event 1|||Event 2|||Event 3|||Event 4",
  "explanation": "Explanation of correct order in ${languageDisplay}"
}

For matching (1 total):
{
  "type": "matching",
  "question": "Abbina i termini alle definizioni.",
  "options": ["Term A → Definition 1", "Term B → Definition 2", "Term C → Definition 3", "Term D → Definition 4"],
  "correctAnswer": "Term A → Definition 1|||Term B → Definition 2|||Term C → Definition 3|||Term D → Definition 4",
  "explanation": "Explanation in ${languageDisplay}"
}

CRITICAL RULES:
1. UNIQUENESS - NEVER create duplicate questions. Each question must test different information.
2. RANDOMIZATION - For multiple_choice, randomize correct answer position (1st, 2nd, 3rd, or 4th). NEVER always put correct answer in same position.
3. LANGUAGE - ALL text MUST be in ${languageDisplay} (questions, options, explanations).
4. EXACTLY 10 exercises total with the distribution above.

Return ONLY the JSON array, no markdown or explanation.`;

    console.log('[generate-level-exercises] Calling AI API...');

    // Add timeout with AbortController (50 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000);

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
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      console.log('[generate-level-exercises] API response received, status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[generate-level-exercises] AI API error:', response.status, errorText);
        
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a few minutes.');
        }
        if (response.status === 402) {
          throw new Error('AI credits exhausted. Please add credits to continue.');
        }
        throw new Error(`AI generation failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      console.log('[generate-level-exercises] Parsing response...');

      // Parse JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('[generate-level-exercises] No JSON array found in response');
        throw new Error('Failed to parse AI response - no valid JSON found');
      }

      let exercises;
      try {
        exercises = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('[generate-level-exercises] JSON parse error');
        throw new Error('Failed to parse exercise JSON');
      }

      console.log(`[generate-level-exercises] Parsed ${exercises.length} exercises`);

      // Format exercises for database
      const formattedExercises = exercises.map((exercise: any, index: number) => ({
        video_id: videoId,
        question: exercise.question,
        exercise_type: exercise.type || 'multiple_choice',
        options: exercise.options,
        correct_answer: exercise.correctAnswer,
        explanation: exercise.explanation || '',
        difficulty: normalizedLevel,
        intensity: 'intense',
        xp_reward: xpReward,
        order_index: index
      }));

      // Save exercises to database
      const { error: insertError } = await supabase
        .from('youtube_exercises')
        .insert(formattedExercises);

      if (insertError) {
        console.error('[generate-level-exercises] DB insert error:', insertError);
        throw new Error(`Failed to save exercises: ${insertError.message}`);
      }

      console.log(`[generate-level-exercises] Saved ${formattedExercises.length} exercises`);

      return new Response(JSON.stringify({ 
        success: true, 
        count: formattedExercises.length,
        message: `Generated ${formattedExercises.length} ${normalizedLevel} exercises`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (fetchError) {
      if (fetchError.name === 'AbortError') {
        console.error('[generate-level-exercises] Request timed out');
        throw new Error('AI request timed out. Please try again.');
      }
      throw fetchError;
    }

  } catch (error) {
    console.error('[generate-level-exercises] Error:', error.message);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
