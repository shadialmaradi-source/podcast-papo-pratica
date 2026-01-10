import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BeginnerResult {
  phrase: string;
  match: boolean;
  confidence: number;
  feedback: string;
}

interface BeginnerResponse {
  mode: "beginner";
  transcription: string;
  results: BeginnerResult[];
  overallScore: number;
}

interface SummaryResponse {
  mode: "summary";
  transcription: string;
  contentScore: number;
  keyIdeasTotal: number;
  keyIdeasMentioned: number;
  strengths: string[];
  improvements: string[];
  toReach100: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioBase64, mode, phrases, videoTranscript } = await req.json();

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    if (!audioBase64) {
      throw new Error("No audio data provided");
    }

    // Convert base64 to binary for Whisper API
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create FormData for Whisper API
    const formData = new FormData();
    const audioBlob = new Blob([bytes], { type: "audio/webm" });
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-1");
    formData.append("language", "es");
    formData.append("response_format", "text");

    console.log("Sending audio to Whisper API...");

    // Call Whisper API for transcription
    const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error("Whisper API error:", errorText);
      throw new Error(`Whisper API error: ${whisperResponse.status}`);
    }

    const transcription = await whisperResponse.text();
    console.log("Transcription received:", transcription);

    // Prepare GPT analysis prompt based on mode
    let analysisPrompt: string;

    if (mode === "beginner" && phrases) {
      analysisPrompt = `You are a Spanish pronunciation coach analyzing a beginner's speech.

Target phrases the student was asked to repeat:
${JSON.stringify(phrases, null, 2)}

What the student actually said (transcription):
"${transcription}"

Analyze how well the student pronounced each target phrase. For each phrase, determine:
1. Did they attempt to say it? (match: true/false)
2. How confident/accurate was the pronunciation? (0-100%)
3. Give brief encouraging feedback

Return ONLY a valid JSON object with this exact structure:
{
  "results": [
    {"phrase": "exact phrase from target", "match": true/false, "confidence": 85, "feedback": "Great job!" or "Try again, focus on..."}
  ],
  "overallScore": 88
}

Be encouraging but accurate. If they clearly tried to say the phrase, match=true even if not perfect.`;
    } else {
      // Summary mode for intermediate/advanced
      analysisPrompt = `You are a Spanish speaking coach analyzing a student's video summary.

Original video transcript:
"${videoTranscript}"

Student's spoken summary:
"${transcription}"

Analyze the summary for:
1. Content coverage - what percentage of key ideas were mentioned (0-100)?
2. Key ideas - count total important points and how many were covered
3. Strengths - what did they do well?
4. Areas to improve - specific suggestions
5. To reach 100% - exact phrases/words they should include next time

Return ONLY a valid JSON object with this exact structure:
{
  "contentScore": 75,
  "keyIdeasTotal": 5,
  "keyIdeasMentioned": 3,
  "strengths": ["clear pronunciation", "good vocabulary"],
  "improvements": ["add time expressions", "use more connectors"],
  "toReach100": ["say 'mesa para uno' instead of just 'mesa'", "mention 'café con leche'", "include the greeting 'hola'"]
}

Be specific and actionable with feedback. The "toReach100" items should be concrete Spanish phrases they could add.`;
    }

    console.log("Sending to GPT for analysis...");

    // Call GPT for analysis
    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful Spanish language coach. Always respond with valid JSON only, no markdown or extra text.",
          },
          {
            role: "user",
            content: analysisPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error("GPT API error:", errorText);
      throw new Error(`GPT API error: ${gptResponse.status}`);
    }

    const gptData = await gptResponse.json();
    const analysisText = gptData.choices?.[0]?.message?.content || "";
    
    console.log("GPT analysis received:", analysisText);

    // Parse the JSON response
    let analysis;
    try {
      // Clean up the response - remove any markdown code blocks if present
      let cleanedText = analysisText.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.slice(7);
      }
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.slice(3);
      }
      if (cleanedText.endsWith("```")) {
        cleanedText = cleanedText.slice(0, -3);
      }
      analysis = JSON.parse(cleanedText.trim());
    } catch (parseError) {
      console.error("Failed to parse GPT response:", analysisText);
      // Provide fallback response
      if (mode === "beginner") {
        analysis = {
          results: phrases.map((p: string) => ({
            phrase: p,
            match: true,
            confidence: 75,
            feedback: "Good attempt! Keep practicing.",
          })),
          overallScore: 75,
        };
      } else {
        analysis = {
          contentScore: 70,
          keyIdeasTotal: 4,
          keyIdeasMentioned: 3,
          strengths: ["Good effort", "Clear speaking"],
          improvements: ["Add more details", "Use more vocabulary"],
          toReach100: ["Include all main points", "Add time expressions"],
        };
      }
    }

    // Build response based on mode
    let response: BeginnerResponse | SummaryResponse;

    if (mode === "beginner") {
      response = {
        mode: "beginner",
        transcription,
        results: analysis.results || [],
        overallScore: analysis.overallScore || 75,
      };
    } else {
      response = {
        mode: "summary",
        transcription,
        contentScore: analysis.contentScore || 70,
        keyIdeasTotal: analysis.keyIdeasTotal || 4,
        keyIdeasMentioned: analysis.keyIdeasMentioned || 3,
        strengths: analysis.strengths || [],
        improvements: analysis.improvements || [],
        toReach100: analysis.toReach100 || [],
      };
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Speech analyze error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
