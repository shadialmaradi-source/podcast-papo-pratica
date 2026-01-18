import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FlashcardInput {
  videoId: string;
  transcript: string;
  language: string;
  level: string;
}

interface Flashcard {
  phrase: string;
  translation: string;
  why: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user
    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { videoId, transcript, language, level } = await req.json() as FlashcardInput;

    if (!videoId || !transcript) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: videoId, transcript' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if flashcards already exist for this video and level
    const { data: existingFlashcards, error: fetchError } = await supabaseClient
      .from('youtube_flashcards')
      .select('*')
      .eq('video_id', videoId)
      .eq('difficulty', level || 'beginner')
      .order('order_index');

    if (fetchError) {
      console.error('Error fetching existing flashcards:', fetchError);
    }

    if (existingFlashcards && existingFlashcards.length > 0) {
      console.log(`Found ${existingFlashcards.length} existing flashcards for video ${videoId}`);
      return new Response(
        JSON.stringify({ 
          flashcards: existingFlashcards.map(f => ({
            phrase: f.phrase,
            translation: f.translation,
            why: f.why
          })),
          cached: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate flashcards using AI
    const targetLevel = level || 'beginner';
    const targetLanguage = language || 'portuguese';

    const systemPrompt = `You are a language learning expert specializing in ${targetLanguage}. Your task is to extract exactly 5 key vocabulary items or phrases from a video transcript that would be most valuable for a ${targetLevel} learner.

RULES:
1. Choose high-frequency, practical words/phrases that appear in the transcript
2. For beginners: focus on basic vocabulary, common expressions, and simple phrases
3. For intermediate: include useful expressions, common verb forms, and practical phrases
4. For advanced: include idioms, nuanced expressions, and complex structures
5. Each item should have a clear, practical explanation of why it's useful
6. Return phrases in ${targetLanguage} with English translations
7. Make sure the "why" explanation is concise (1-2 sentences) and learner-focused

RESPONSE FORMAT (strict JSON):
{
  "flashcards": [
    {
      "phrase": "phrase in ${targetLanguage}",
      "translation": "English translation",
      "why": "Why this is useful for learners (1-2 sentences)"
    }
  ]
}`;

    const userPrompt = `Extract exactly 5 key vocabulary flashcards from this ${targetLanguage} transcript. Focus on the most useful and memorable phrases for a ${targetLevel} learner:

TRANSCRIPT:
${transcript.slice(0, 4000)}`;

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate flashcards' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || '';

    // Parse JSON from response (handle markdown code blocks)
    if (content.includes('```json')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (content.includes('```')) {
      content = content.replace(/```\n?/g, '');
    }

    let flashcards: Flashcard[] = [];
    try {
      const parsed = JSON.parse(content.trim());
      flashcards = parsed.flashcards || [];
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, content);
      // Fallback: create basic flashcards
      flashcards = [
        { phrase: "Olá", translation: "Hello", why: "The most common greeting you'll use every day." },
        { phrase: "Obrigado/a", translation: "Thank you", why: "Essential for showing politeness in any situation." },
        { phrase: "Por favor", translation: "Please", why: "Used to make requests polite and respectful." },
        { phrase: "Desculpe", translation: "Excuse me / Sorry", why: "Useful for getting attention or apologizing." },
        { phrase: "Até logo", translation: "See you later", why: "A friendly way to say goodbye." }
      ];
    }

    // Ensure we have exactly 5 flashcards
    flashcards = flashcards.slice(0, 5);

    // Store flashcards in database
    const flashcardsToInsert = flashcards.map((f, index) => ({
      video_id: videoId,
      phrase: f.phrase,
      translation: f.translation,
      why: f.why,
      order_index: index,
      difficulty: targetLevel,
    }));

    const { error: insertError } = await supabaseClient
      .from('youtube_flashcards')
      .insert(flashcardsToInsert);

    if (insertError) {
      console.error('Error storing flashcards:', insertError);
      // Still return the generated flashcards even if storage fails
    }

    console.log(`Generated and stored ${flashcards.length} flashcards for video ${videoId}`);

    return new Response(
      JSON.stringify({ flashcards, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-flashcards:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
