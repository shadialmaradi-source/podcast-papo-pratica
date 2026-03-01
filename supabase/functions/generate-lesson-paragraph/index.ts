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
    const { prompt, cefrLevel, language, paragraphLength } = await req.json();

    if (!prompt || !cefrLevel) {
      return new Response(JSON.stringify({ error: "prompt and cefrLevel are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetLanguage = language || "italian";
    const lengthRanges: Record<string, string> = {
      short: "50-80",
      medium: "80-150",
      long: "150-250",
    };
    const wordRange = lengthRanges[paragraphLength] || lengthRanges["medium"];

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not set");

    const levelDescriptions: Record<string, string> = {
      A1: "beginner (very simple vocabulary, short sentences, present tense only)",
      A2: "elementary (simple vocabulary, basic past tense, common expressions)",
      B1: "intermediate (varied vocabulary, multiple tenses, some complex sentences)",
      B2: "upper-intermediate (rich vocabulary, all tenses, complex sentence structures)",
      C1: "advanced (sophisticated vocabulary, nuanced grammar, idiomatic expressions)",
      C2: "proficiency (native-level complexity, literary quality, rare vocabulary)",
    };

    const levelDesc = levelDescriptions[cefrLevel] || levelDescriptions["A1"];

    const systemPrompt = `You are a language-learning content creator. Generate a short paragraph (${wordRange} words) in ${targetLanguage} suitable for language learners at CEFR level ${cefrLevel} (${levelDesc}).

The paragraph MUST be written entirely in ${targetLanguage}. It should be engaging, tell a small story or describe a situation, and be useful for language exercises.

Also suggest a short lesson title (max 6 words, in English) based on the paragraph's theme.

Respond ONLY with valid JSON in this exact format:
{
  "paragraph": "The generated paragraph text here in ${targetLanguage}...",
  "suggestedTitle": "Short Lesson Title"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Topic/scenario: ${prompt}` },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI gateway error: ${response.status} ${errText}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) throw new Error("No content returned from AI");

    // Clean potential markdown code fences
    const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
