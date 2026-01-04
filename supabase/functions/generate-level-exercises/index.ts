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

    console.log(`Generating ${level} exercises for video ${videoId}, language: ${language}`);

    // Check if exercises already exist for this level
    const { count: existingCount } = await supabase
      .from('youtube_exercises')
      .select('id', { count: 'exact', head: true })
      .eq('video_id', videoId)
      .eq('difficulty', level);

    if (existingCount && existingCount > 0) {
      console.log(`Exercises already exist for ${level} level: ${existingCount}`);
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
      const { data: transcriptData } = await supabase
        .from('youtube_transcripts')
        .select('transcript')
        .eq('video_id', videoId)
        .single();
      
      if (transcriptData) {
        transcriptText = transcriptData.transcript;
      }
    }

    if (!transcriptText) {
      throw new Error('No transcript available for this video');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Truncate transcript to avoid token limits
    const truncatedTranscript = transcriptText.substring(0, 8000);
    
    // Get language name for prompt
    const languageName = language || 'italian';
    const languageDisplay = languageName.charAt(0).toUpperCase() + languageName.slice(1);

    // XP based on level
    const xpReward = level === 'advanced' ? 15 : level === 'intermediate' ? 10 : 5;

    // Difficulty descriptions
    const difficultyDesc = {
      beginner: `BEGINNER Level (A1-A2):
- Simple, direct questions about facts mentioned in the video
- Short, clear sentences
- Basic vocabulary
- Concrete information (who, what, when, where)
- Simple true/false with obvious answers
- Example: "Dove si trova il museo?" "Quando è successo l'evento?"`,
      intermediate: `INTERMEDIATE Level (B1-B2):
- More complex sentence structures
- Questions requiring deeper comprehension
- Understanding of context and relationships
- Some idiomatic expressions
- Numerical details and specific information
- Questions about "how" and "why"
- Example: "Quanto è costato il progetto?" "Qual era la principale preoccupazione dei critici?"`,
      advanced: `ADVANCED Level (C1-C2):
- Sophisticated vocabulary and complex grammar
- Analysis and interpretation required
- Idiomatic expressions and metaphors
- Cultural and contextual nuances
- Critical thinking about implications
- Understanding of abstract concepts
- Example: "Cosa significa l'espressione 'rafforzare' in questo contesto?" "Analizza il significato di..."`
    };

    const systemPrompt = `You are an expert ${languageDisplay} language learning exercise creator.
Create exercises ENTIRELY in ${languageDisplay}. ALL questions, options, and explanations MUST be in ${languageDisplay}.

CRITICAL RULES:
1. ALL text (questions, options, explanations) MUST be in ${languageDisplay} - NEVER use English
2. Create UNIQUE questions - NEVER repeat the same information
3. RANDOMIZE correct answer positions - mix first, second, third, fourth positions
4. Base ALL questions on actual transcript content
5. Escape apostrophes properly in JSON

EXERCISE TYPES DISTRIBUTION:
- multiple_choice: 70-80% (4 options each)
- fill_blank: 3-5 questions
- matching: 2-3 questions
- sequencing: 2-3 questions

${difficultyDesc[level as keyof typeof difficultyDesc]}

XP REWARD: ${xpReward} XP per question`;

    const userPrompt = `Generate exactly 30 ${level.toUpperCase()} level exercises from this transcript.
All 30 exercises should be for "intense" mode (challenging comprehensive exercises).

TRANSCRIPT (${languageDisplay}):
${truncatedTranscript}

Return a JSON array with exactly 30 exercises. Each exercise must have:
{
  "question": "Question text in ${languageDisplay}",
  "type": "multiple_choice" | "fill_blank" | "matching" | "sequencing",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "The correct option exactly as written in options",
  "explanation": "Why this is correct (2-3 sentences in ${languageDisplay})"
}

CRITICAL REQUIREMENTS:
- ALL TEXT must be in ${languageDisplay}, including explanations
- Randomize correct answer position for EVERY question
- Ensure NO duplicate questions
- Include variety: fill_blank (3-5), matching (2-3), sequencing (2-3), rest multiple_choice
- Make questions test actual content from the transcript
- Return ONLY the JSON array, no markdown or extra text`;

    console.log('Calling GPT-5 for exercise generation...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
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

    console.log('GPT-5 response received, parsing JSON...');

    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON array found in AI response:', content.substring(0, 500));
      throw new Error('Failed to parse AI response - no valid JSON found');
    }

    let exercises;
    try {
      exercises = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, jsonMatch[0].substring(0, 500));
      throw new Error('Failed to parse exercise JSON');
    }

    console.log(`GPT-5 generated ${exercises.length} exercises`);

    // Format exercises for database
    const formattedExercises = exercises.map((exercise: any, index: number) => ({
      video_id: videoId,
      question: exercise.question,
      exercise_type: exercise.type || 'multiple_choice',
      options: exercise.options,
      correct_answer: exercise.correctAnswer,
      explanation: exercise.explanation || '',
      difficulty: level,
      intensity: 'intense',
      xp_reward: xpReward,
      order_index: index
    }));

    // Save exercises to database
    const { error: insertError } = await supabase
      .from('youtube_exercises')
      .insert(formattedExercises);

    if (insertError) {
      console.error('Failed to save exercises:', insertError);
      throw new Error(`Failed to save exercises: ${insertError.message}`);
    }

    console.log(`Saved ${formattedExercises.length} exercises for ${level} level`);

    return new Response(JSON.stringify({ 
      success: true, 
      count: formattedExercises.length,
      message: `Generated ${formattedExercises.length} ${level} exercises`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-level-exercises:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
