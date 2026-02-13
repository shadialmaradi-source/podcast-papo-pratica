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

    const { videoId, level, transcript, language, nativeLanguage } = await req.json();

    if (!videoId || !level) {
      throw new Error('videoId and level are required');
    }

    console.log(`[generate-level-exercises] Starting for video ${videoId}`);
    console.log(`[generate-level-exercises] Level: ${level}, Language: ${language || 'not specified'}, NativeLanguage: ${nativeLanguage || 'not specified'}`);

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
    const nativeLangName = nativeLanguage || 'english';
    const nativeLangDisplay = nativeLangName.charAt(0).toUpperCase() + nativeLangName.slice(1);

    // XP based on level
    const xpReward = normalizedLevel === 'advanced' ? 15 : normalizedLevel === 'intermediate' ? 10 : 5;

    // Pedagogical system prompt
    const systemPrompt = `You are a specialist in second-language pedagogy. Your job is to create effective comprehension and form-focused exercises from a single video transcript.

Pedagogical principles to follow strictly:
- All questions must be answerable only from the transcript (no outside knowledge)
- Prioritize global understanding and key details that matter for real communication (who, where, what problem, what solution), not minor trivia
- Encourage noticing of useful chunks (high-frequency phrases, polite expressions, common verbs) by using them as correct answers or blanks
- Avoid trick questions; the goal is learning, not trapping the learner
- Aim for 70-85% expected success if they understood the video
- Each question must target a different part or idea from the transcript. No duplicates or near-duplicates.`;

    // Level-specific pedagogical guidelines
    const levelPrompts: Record<string, string> = {
      beginner: `BEGINNER Level:
- Use very simple ${languageDisplay} in questions
- Focus on who/where/what questions, obvious choices, highly frequent words
- Simple, direct questions about facts mentioned
- Short, clear sentences with basic vocabulary
- Concrete information only
- Avoid idioms or subtle inferences`,

      intermediate: `INTERMEDIATE Level:
- Include some "why/how" questions and short inference (e.g. how the speaker feels based on what they say)
- More complex sentence structures
- Questions requiring deeper comprehension
- You may include common idiomatic expressions but keep questions clear
- Understanding of context and relationships
- Numerical details and specific information`,

      advanced: `ADVANCED Level:
- Sophisticated vocabulary and complex grammar
- Analysis and interpretation required
- Idiomatic expressions and metaphors
- Cultural and contextual nuances
- Critical thinking about implications
- Abstract concepts and advanced reasoning`
    };

    const formatInstructions = `
Generate EXACTLY 10 exercises with this EXACT distribution:
- 6 exercises where "type" = "multiple_choice"
- 2 exercises where "type" = "fill_blank"
- 1 exercise where "type" = "sequencing"
- 1 exercise where "type" = "matching"

EXERCISE FORMATS (return JSON array):

For multiple_choice (6 total):
{
  "type": "multiple_choice",
  "question": "Question in ${languageDisplay}",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "Exact text of correct option",
  "explanation": "Brief explanation in ${languageDisplay}",
  "questionTranslation": "Translation of the question in ${nativeLangDisplay}"
}
Rules: 3-4 options, only one correct, plausible wrong options, RANDOMIZE correct answer position across questions

For fill_blank (2 total):
{
  "type": "fill_blank",
  "question": "Sentence with _____ for the blank",
  "options": [],
  "correctAnswer": "word that fills the blank",
  "explanation": "Explanation in ${languageDisplay}",
  "questionTranslation": "Translation of the question in ${nativeLangDisplay}"
}
Rules: Use high-value chunks from transcript, 1 blank per question, meaningful word (not articles)

For sequencing (1 total):
{
  "type": "sequencing",
  "question": "Ordina gli eventi in ordine cronologico.",
  "options": ["Event 1", "Event 2", "Event 3", "Event 4"],
  "correctAnswer": "0,1,2,3",
  "explanation": "Explanation in ${languageDisplay}",
  "questionTranslation": "Translation of the question in ${nativeLangDisplay}"
}
Rules: 3-5 key events from transcript, options are shuffled events, correctAnswer is comma-separated indices for correct order

For matching (1 total):
{
  "type": "matching",
  "question": "Abbina i termini alle definizioni.",
  "options": ["Term A", "Term B", "Term C", "Term D", "Def 1", "Def 2", "Def 3", "Def 4"],
  "correctAnswer": "Term A->Def 1|||Term B->Def 2|||Term C->Def 3|||Term D->Def 4",
  "explanation": "Explanation in ${languageDisplay}",
  "questionTranslation": "Translation of the question in ${nativeLangDisplay}"
}
Rules: Match 4 items to meanings/roles (person<->action, place<->event, phrase<->meaning)

CRITICAL QUALITY CONSTRAINTS:
1. Do not reuse the same correct answer text in more than 2 questions
2. Do not create two questions whose explanations are essentially the same
3. Ensure all ${languageDisplay} text strictly matches what appears in the transcript
4. ALL text (questions, options, explanations) MUST be in ${languageDisplay}
5. The "questionTranslation" field MUST be a natural translation of the question into ${nativeLangDisplay}
6. Return ONLY the JSON array, no markdown or code blocks`;

    const userPrompt = `${levelPrompts[normalizedLevel] || levelPrompts.beginner}

TRANSCRIPT:
${truncatedTranscript}

${formatInstructions}`;

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
        question_translation: exercise.questionTranslation || null,
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
