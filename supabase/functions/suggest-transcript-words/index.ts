import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, transcript, language, difficulty } = await req.json();

    if (!videoId || !transcript || !language) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: videoId, transcript, language" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const difficultyLevel = difficulty || "intermediate";

    // Check cache first
    const { data: cached, error: cacheError } = await supabase
      .from("transcript_word_suggestions")
      .select("*")
      .eq("video_id", videoId)
      .eq("difficulty", difficultyLevel);

    if (!cacheError && cached && cached.length > 0) {
      console.log(`Returning ${cached.length} cached suggestions for video ${videoId}`);
      return new Response(JSON.stringify({ suggestions: cached, fromCache: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate suggestions via AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Truncate transcript if too long (keep first ~4000 chars)
    const truncatedTranscript = transcript.length > 4000
      ? transcript.substring(0, 4000) + "..."
      : transcript;

    const systemPrompt = `You are a ${language} language learning expert. Analyze the transcript and identify 8-12 high-value vocabulary words or phrases that would be most useful for a language learner at ${difficultyLevel} level.

Focus on:
- Words/phrases that are commonly used in everyday ${language}
- Idiomatic expressions or culturally significant phrases
- Words that might be tricky for English speakers
- A mix of different parts of speech (nouns, verbs, adjectives, expressions)

Do NOT suggest very common/basic words (like "the", "and", "is" equivalents) unless they have an unusual usage in context.

IMPORTANT: Include at least 2 of your suggestions from the first 3 transcript segments (the beginning of the transcript), so users immediately see interactive vocabulary when they start reading.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this ${language} transcript and suggest vocabulary:\n\n${truncatedTranscript}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_vocabulary",
              description: "Return 8-12 high-value vocabulary suggestions from the transcript.",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        phrase: {
                          type: "string",
                          description: `The word or phrase in ${language} exactly as it appears in the transcript`,
                        },
                        translation: {
                          type: "string",
                          description: "English translation",
                        },
                        partOfSpeech: {
                          type: "string",
                          enum: ["noun", "verb", "adjective", "adverb", "phrase", "expression", "other"],
                        },
                        why: {
                          type: "string",
                          description: "Brief reason why this is valuable to learn (max 15 words)",
                        },
                      },
                      required: ["phrase", "translation", "partOfSpeech", "why"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_vocabulary" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "suggest_vocabulary") {
      throw new Error("Unexpected AI response format");
    }

    const { suggestions } = JSON.parse(toolCall.function.arguments);

    // Find segment indices for each suggestion by matching in the transcript
    const lines = transcript.split("\n");
    const enrichedSuggestions = suggestions.map((s: any) => {
      let segmentIndex = 0;
      const phraseLower = s.phrase.toLowerCase();
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(phraseLower)) {
          segmentIndex = i;
          break;
        }
      }
      return { ...s, segmentIndex };
    });

    // Cache in database
    const records = enrichedSuggestions.map((s: any) => ({
      video_id: videoId,
      difficulty: difficultyLevel,
      phrase: s.phrase,
      translation: s.translation,
      part_of_speech: s.partOfSpeech,
      why: s.why,
      segment_index: s.segmentIndex,
    }));

    const { error: insertError } = await supabase
      .from("transcript_word_suggestions")
      .insert(records);

    if (insertError) {
      console.error("Error caching suggestions:", insertError);
      // Don't fail - still return the suggestions
    }

    return new Response(
      JSON.stringify({ suggestions: enrichedSuggestions, fromCache: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("suggest-transcript-words error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
