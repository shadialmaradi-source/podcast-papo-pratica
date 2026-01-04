import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, videoId, language } = await req.json();

    if (!transcript || !videoId) {
      throw new Error('Transcript and videoId are required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`Generating 90 exercises for video ${videoId}, transcript length: ${transcript.length}`);

    // Truncate transcript to avoid token limits while keeping meaningful content
    const truncatedTranscript = transcript.substring(0, 6000);

    const systemPrompt = `You are an expert language learning exercise creator. Generate exercises based on video transcripts.

CRITICAL RULES:
1. Create UNIQUE questions - NEVER repeat the same information
2. RANDOMIZE correct answer positions - don't always put correct answer first
3. Base ALL questions on actual transcript content
4. Escape apostrophes properly in JSON

EXERCISE TYPES:
- multiple_choice: 4 options, one correct (70-80% of exercises)
- fill_blank: Sentence with blank, provide options
- matching: Pairs of terms and definitions
- sequencing: Order statements chronologically

XP REWARDS:
- beginner: 5 XP
- intermediate: 10 XP  
- advanced: 15 XP

DIFFICULTY LEVELS:
- beginner (A1-A2): Simple facts, short sentences, basic vocabulary, who/what/when/where questions
- intermediate (B1-B2): Context understanding, how/why questions, idiomatic expressions, specific details
- advanced (C1-C2): Analysis, inference, abstract concepts, nuanced vocabulary, critical thinking`;

    const userPrompt = `Generate 90 language learning exercises from this transcript.

DISTRIBUTION:
- BEGINNER: 30 exercises (10 light mode + 20 intense mode)
- INTERMEDIATE: 30 exercises (10 light mode + 20 intense mode)
- ADVANCED: 30 exercises (10 light mode + 20 intense mode)

TRANSCRIPT:
${truncatedTranscript}

Return a JSON array with exactly 90 exercises. Each exercise must have:
{
  "question": "Question text",
  "type": "multiple_choice" | "fill_blank" | "matching" | "sequencing",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "The correct option exactly as in options",
  "explanation": "Why this is correct (2-3 sentences)",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "intensity": "light" | "intense"
}

IMPORTANT:
- Randomize correct answer position for EVERY question
- Ensure NO duplicate questions across any level
- Include fill_blank (3-5/level), matching (2-3/level), sequencing (2-3/level)
- Make advanced questions require inference and analysis
- Return ONLY the JSON array, no markdown`;

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
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (response.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to continue.');
      }
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON array found in AI response');
      throw new Error('Failed to parse AI response');
    }

    const exercises = JSON.parse(jsonMatch[0]);
    console.log(`AI generated ${exercises.length} exercises`);

    // Format exercises for database
    const formattedExercises = exercises.map((exercise: any, index: number) => ({
      video_id: videoId,
      question: exercise.question,
      exercise_type: exercise.type || 'multiple_choice',
      options: exercise.options,
      correct_answer: exercise.correctAnswer,
      explanation: exercise.explanation || '',
      difficulty: mapDifficultyToCEFR(exercise.difficulty),
      intensity: exercise.intensity || 'light',
      xp_reward: getXPReward(exercise.difficulty),
      order_index: index
    }));

    return new Response(JSON.stringify({ 
      success: true, 
      exercises: formattedExercises,
      count: formattedExercises.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-ai-exercises:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function mapDifficultyToCEFR(difficulty: string): string {
  switch (difficulty?.toLowerCase()) {
    case 'beginner':
      return 'beginner';
    case 'intermediate':
      return 'intermediate';
    case 'advanced':
      return 'advanced';
    default:
      return 'beginner';
  }
}

function getXPReward(difficulty: string): number {
  switch (difficulty?.toLowerCase()) {
    case 'beginner':
      return 5;
    case 'intermediate':
      return 10;
    case 'advanced':
      return 15;
    default:
      return 5;
  }
}
