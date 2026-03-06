import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXERCISE_PROMPTS: Record<string, string> = {
  fill_in_blank: `Generate a fill-in-the-blank exercise. Return JSON: { "sentence": "string with ___ for the blank", "answer": "string", "hint": "string (optional grammar note)", "question_translation": "string", "answer_translation": "string" }`,
  multiple_choice: `Generate a multiple-choice quiz question. Return JSON: { "question": "string", "options": ["A", "B", "C", "D"], "correct": "A|B|C|D", "explanation": "string", "question_translation": "string", "answer_translation": "string (translation of the correct option)" }`,
  role_play: `Generate a role-play scenario inspired by the video content. Return JSON: { "scenario": "string (2-3 sentences)", "teacher_role": "string", "student_role": "string", "starter": "string (first line)", "useful_phrases": ["phrase1", "phrase2", "phrase3"], "question_translation": "string (translation of scenario)", "answer_translation": "string (translation of starter)" }`,
  spot_the_mistake: `Generate a spot-the-mistake exercise. Return JSON: { "instruction": "Find the mistake in this sentence:", "sentence": "string with ONE grammatical mistake", "corrected": "string (correct version)", "explanation": "string", "question_translation": "string (translation of the sentence with mistake)", "answer_translation": "string (translation of the corrected sentence)" }`,
};

function extractVideoId(url: string): string | null {
  if (!url) return null;
  let match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  match = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  match = url.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  return null;
}

async function fetchTranscript(youtubeUrl: string): Promise<string | null> {
  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) return null;

  const SUPADATA_API_KEY = Deno.env.get("SUPADATA_API_KEY");
  if (!SUPADATA_API_KEY) return null;

  try {
    const response = await fetch(
      `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=true`,
      { headers: { "x-api-key": SUPADATA_API_KEY } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (data.content && data.content.length > 50) return data.content;
    return null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Unauthorized");

    const { lessonId, exerciseType } = await req.json();
    if (!lessonId) throw new Error("lessonId is required");
    if (!exerciseType) throw new Error("exerciseType is required");

    const typePrompt = EXERCISE_PROMPTS[exerciseType];
    if (!typePrompt) throw new Error(`Unknown exercise type: ${exerciseType}`);

    // Fetch lesson — verify teacher owns it OR student has access
    const { data: lesson, error: lessonError } = await supabase
      .from("teacher_lessons")
      .select("*")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson) throw new Error("Lesson not found");

    // Check access: teacher or assigned student
    const isTeacher = lesson.teacher_id === user.id;
    const { data: userEmail } = await supabase.rpc("get_auth_user_email");
    const isStudent = lesson.student_email === userEmail;
    if (!isTeacher && !isStudent) throw new Error("Access denied");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI key not configured");

    // Fetch transcript if not already stored
    let transcriptText = lesson.transcript;
    if (!transcriptText && lesson.youtube_url) {
      transcriptText = await fetchTranscript(lesson.youtube_url);
      if (transcriptText) {
        await supabase
          .from("teacher_lessons")
          .update({ transcript: transcriptText })
          .eq("id", lessonId);
      }
    }

    // Check existing exercises count for order_index offset
    const { count: existingCount } = await supabase
      .from("lesson_exercises")
      .select("id", { count: "exact", head: true })
      .eq("lesson_id", lessonId);

    let orderIndex = existingCount || 0;

    const count = exerciseType === "role_play" ? 3 : 5;
    const language = lesson.language || "italian";
    const translationLanguage = lesson.translation_language || "english";
    const generatedExercises: any[] = [];

    for (let q = 0; q < count; q++) {
      const transcriptContext = transcriptText
        ? `\n\nBase the exercise on this video transcript:\n${transcriptText.slice(0, 3000)}`
        : "";

      const systemPrompt = `You are an expert language teacher creating exercises for a 1-on-1 tutoring session.
The exercises MUST be written in ${language}. All sentences, questions, and options should be in ${language}.
CEFR Level: ${lesson.cefr_level}.
Topic: ${lesson.topic || "general conversation"}.
Exercise format: ${exerciseType}.
The "question_translation" and "answer_translation" fields MUST be in ${translationLanguage}.
${q > 0 ? `This is exercise ${q + 1} of ${count}. Make it DIFFERENT from previous exercises — vary the topic, grammar point, or vocabulary tested.` : ""}
${exerciseType === "role_play" ? "Create a role-play scenario directly inspired by the video content themes, vocabulary, and situations." : ""}
Return ONLY valid JSON, no markdown, no explanation.`;

      const userPrompt = `${typePrompt}
Make it appropriate for a ${lesson.cefr_level} level student. Write the exercise in ${language}. Write translations in ${translationLanguage}.${
        lesson.paragraph_content ? `\n\nBase the question on this text:\n${lesson.paragraph_content}` : ""
      }${transcriptContext}`;

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
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) throw new Error("Rate limit exceeded. Please try again later.");
        if (status === 402) throw new Error("AI credits exhausted.");
        console.error(`AI error for ${exerciseType} q${q}:`, status);
        continue;
      }

      const aiData = await response.json();
      const raw = aiData.choices?.[0]?.message?.content || "";
      const cleaned = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();

      let content: any;
      try {
        content = JSON.parse(cleaned);
      } catch {
        console.error(`Failed to parse JSON for ${exerciseType} q${q}:`, cleaned);
        continue;
      }

      generatedExercises.push({
        lesson_id: lessonId,
        exercise_type: exerciseType,
        content,
        order_index: orderIndex++,
      });
    }

    if (generatedExercises.length === 0) {
      throw new Error("No exercises could be generated. Please try again.");
    }

    const { error: insertError } = await supabase
      .from("lesson_exercises")
      .insert(generatedExercises);

    if (insertError) throw new Error(`Failed to save exercises: ${insertError.message}`);

    // Update lesson status to 'ready' if still draft
    if (lesson.status === "draft") {
      await supabase
        .from("teacher_lessons")
        .update({ status: "ready" })
        .eq("id", lessonId);
    }

    return new Response(
      JSON.stringify({ success: true, count: generatedExercises.length, exerciseType }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("generate-lesson-exercises-by-type error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
