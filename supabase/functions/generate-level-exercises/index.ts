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

    const { videoId, level, transcript, language, nativeLanguage, source } = await req.json();

    if (!videoId || !level) {
      throw new Error('videoId and level are required');
    }

    console.log(`[generate-level-exercises] Starting for video ${videoId}`);
    console.log(`[generate-level-exercises] Level: ${level}, Language: ${language || 'not specified'}, NativeLanguage: ${nativeLanguage || 'not specified'}, Source: ${source || 'community'}`);

    // Normalize level to lowercase
    const normalizedLevel = level.toLowerCase();

    // Check if exercises already exist for this level + native language
    const { count: existingCount } = await supabase
      .from('youtube_exercises')
      .select('id', { count: 'exact', head: true })
      .eq('video_id', videoId)
      .eq('difficulty', normalizedLevel)
      .eq('native_language', nativeLangName);

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
Generate EXACTLY 5 exercises with this EXACT distribution:
- 3 exercises where "type" = "multiple_choice"
- 1 exercise where "type" = "fill_blank"
- 1 exercise where "type" = "sequencing"

EXERCISE FORMATS (return JSON array):

For multiple_choice (3 total):
{
  "type": "multiple_choice",
  "question": "Question in ${languageDisplay}",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": "Exact text of correct option",
  "explanation": "Brief explanation in ${languageDisplay}",
  "questionTranslation": "Translation of the question in ${nativeLangDisplay}"
}
Rules: 3-4 options, only one correct, plausible wrong options, RANDOMIZE correct answer position across questions

For fill_blank (1 total):
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

CRITICAL QUALITY CONSTRAINTS:
1. Do not reuse the same correct answer text in more than 2 questions
2. Do not create two questions whose explanations are essentially the same
3. Ensure all ${languageDisplay} text strictly matches what appears in the transcript
4. ALL text (questions, options, explanations) MUST be in ${languageDisplay}
5. The "questionTranslation" field MUST be a natural translation of the question into ${nativeLangDisplay}
6. Return ONLY the JSON array, no markdown or code blocks`;

    // Use special beginner prompt for curated learning path
    const isCuratedBeginner = source === 'curated' && normalizedLevel === 'beginner';

    const curatedBeginnerFormat = `
Generate EXACTLY 5 exercises with this EXACT distribution:
- 2 exercises where "type" = "word_recognition"
- 1 exercise where "type" = "emoji_match"
- 1 exercise where "type" = "comprehension_check"
- 1 exercise where "type" = "sequence_recall"

EXERCISE FORMATS (return JSON array):

For word_recognition (2 total):
{
  "type": "word_recognition",
  "question": "Was this word in the video?",
  "targetWord": "the key word in ${languageDisplay}",
  "options": ["Yes", "No"],
  "correctAnswer": "Yes" or "No",
  "explanation": "Brief explanation in ${nativeLangDisplay}",
  "questionTranslation": "Translation of the question in ${nativeLangDisplay}"
}
Rules: Pick important nouns or verbs from transcript. One should be TRUE (word is in video), one FALSE (word is NOT in video but plausible).

For emoji_match (1 total):
{
  "type": "emoji_match",
  "question": "Which emoji matches this word?",
  "targetWord": "word in ${languageDisplay}",
  "options": ["🦷", "🍴", "😴", "👕"],
  "correctAnswer": "🦷",
  "explanation": "Brief explanation in ${nativeLangDisplay}",
  "questionTranslation": "Translation in ${nativeLangDisplay}"
}
Rules: Pick a concrete noun from the transcript. Provide exactly 4 emoji options. One must clearly match the word. Others should be unrelated but common.

For comprehension_check (1 total):
{
  "type": "comprehension_check",
  "question": "Simple yes/no question about the video in ${languageDisplay}",
  "options": ["Yes", "No"],
  "correctAnswer": "Yes" or "No",
  "explanation": "Brief explanation in ${nativeLangDisplay}",
  "questionTranslation": "Translation of the question in ${nativeLangDisplay}"
}
Rules: Ask about a clear, obvious fact from the video. Keep the question very short and simple.

For sequence_recall (1 total):
{
  "type": "sequence_recall",
  "question": "What happened FIRST? / What did [person] do first?",
  "options": ["Action A", "Action B", "Action C"],
  "correctAnswer": "Action A",
  "explanation": "Brief explanation in ${nativeLangDisplay}",
  "questionTranslation": "Translation of the question in ${nativeLangDisplay}"
}
Rules: Use 3 clear actions/events from the video. Ask which came first. Keep options very short (2-4 words each).

CRITICAL CONSTRAINTS:
1. Keep ALL text extremely simple — A1 absolute beginner level
2. Use only concrete, common words (no abstract concepts)
3. ALL questions and options in ${languageDisplay}, explanations in ${nativeLangDisplay}
4. "questionTranslation" MUST be in ${nativeLangDisplay}
5. Return ONLY the JSON array, no markdown or code blocks
6. The "targetWord" field is required for word_recognition and emoji_match types`;

    const curatedBeginnerLevel = `SUPER BEGINNER (A1) Level — Curated Learning Path:
- These are absolute beginners who may have NEVER studied ${languageDisplay} before
- Use only the most basic, concrete words from the transcript
- Focus on recognition, not production
- No grammar knowledge required
- No reading comprehension of sentences
- Only single words or very short phrases (2-3 words max)`;

    const userPrompt = isCuratedBeginner 
      ? `${curatedBeginnerLevel}

TRANSCRIPT:
${truncatedTranscript}

${curatedBeginnerFormat}`
      : `${levelPrompts[normalizedLevel] || levelPrompts.beginner}

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
      const formattedExercises = exercises.map((exercise: any, index: number) => {
        // For curated beginner types, store targetWord in context_sentence field
        const contextSentence = exercise.targetWord || exercise.context_sentence || null;
        
        return {
          video_id: videoId,
          question: exercise.question,
          exercise_type: exercise.type || 'multiple_choice',
          options: exercise.options,
          correct_answer: exercise.correctAnswer,
          explanation: exercise.explanation || '',
          question_translation: exercise.questionTranslation || null,
          context_sentence: contextSentence,
          difficulty: normalizedLevel,
          intensity: 'intense',
          xp_reward: xpReward,
          order_index: index,
          native_language: nativeLangName
        };
      });

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
