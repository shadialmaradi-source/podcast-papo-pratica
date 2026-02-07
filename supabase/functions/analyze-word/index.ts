import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { word, language, contextSentence } = await req.json();

    if (!word || !language) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: word, language" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a language learning assistant specializing in ${language}. 
Analyze the given word or phrase and provide detailed linguistic information.
The user is learning ${language} and speaks English.
Always respond using the analyze_word function tool.`;

    const userPrompt = contextSentence
      ? `Analyze this ${language} word/phrase: "${word}"\nContext sentence: "${contextSentence}"`
      : `Analyze this ${language} word/phrase: "${word}"`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_word",
              description: "Return detailed analysis of a word or phrase for language learners.",
              parameters: {
                type: "object",
                properties: {
                  translation: {
                    type: "string",
                    description: "English translation of the word/phrase",
                  },
                  partOfSpeech: {
                    type: "string",
                    enum: ["noun", "verb", "adjective", "adverb", "phrase", "expression", "preposition", "conjunction", "pronoun", "other"],
                    description: "Grammatical category of the word",
                  },
                  exampleSentence: {
                    type: "string",
                    description: `A new example sentence in ${language} using this word/phrase (different from context if provided)`,
                  },
                  exampleTranslation: {
                    type: "string",
                    description: "English translation of the example sentence",
                  },
                  extras: {
                    type: "object",
                    description: "Additional info based on part of speech",
                    properties: {
                      // Verb extras
                      conjugation: {
                        type: "object",
                        description: "Verb conjugation table (only for verbs)",
                        properties: {
                          infinitive: { type: "string" },
                          present: {
                            type: "object",
                            properties: {
                              io: { type: "string" },
                              tu: { type: "string" },
                              lui_lei: { type: "string" },
                              noi: { type: "string" },
                              voi: { type: "string" },
                              loro: { type: "string" },
                            },
                          },
                          past: {
                            type: "object",
                            properties: {
                              io: { type: "string" },
                              tu: { type: "string" },
                              lui_lei: { type: "string" },
                              noi: { type: "string" },
                              voi: { type: "string" },
                              loro: { type: "string" },
                            },
                          },
                          future: {
                            type: "object",
                            properties: {
                              io: { type: "string" },
                              tu: { type: "string" },
                              lui_lei: { type: "string" },
                              noi: { type: "string" },
                              voi: { type: "string" },
                              loro: { type: "string" },
                            },
                          },
                        },
                      },
                      // Noun extras
                      gender: {
                        type: "string",
                        enum: ["masculine", "feminine", "neuter"],
                        description: "Grammatical gender (only for nouns)",
                      },
                      plural: {
                        type: "string",
                        description: "Plural form (only for nouns)",
                      },
                      // Adjective extras
                      forms: {
                        type: "object",
                        description: "Adjective forms (only for adjectives)",
                        properties: {
                          masculine_singular: { type: "string" },
                          feminine_singular: { type: "string" },
                          masculine_plural: { type: "string" },
                          feminine_plural: { type: "string" },
                          comparative: { type: "string" },
                          superlative: { type: "string" },
                        },
                      },
                      // Phrase/expression extras
                      literalMeaning: {
                        type: "string",
                        description: "Literal translation (for phrases/expressions)",
                      },
                      formality: {
                        type: "string",
                        enum: ["formal", "informal", "neutral", "slang"],
                        description: "Formality level",
                      },
                      // Common extras
                      relatedWords: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            word: { type: "string" },
                            translation: { type: "string" },
                          },
                          required: ["word", "translation"],
                        },
                        description: "Related words or synonyms (2-4 items)",
                      },
                      usageNotes: {
                        type: "string",
                        description: "Brief usage tips or common mistakes",
                      },
                    },
                  },
                },
                required: ["translation", "partOfSpeech", "exampleSentence", "exampleTranslation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_word" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
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
    
    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "analyze_word") {
      throw new Error("Unexpected AI response format");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-word error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
