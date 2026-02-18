import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXERCISE_PROMPTS: Record<string, string> = {
  fill_in_blank: `Generate a fill-in-the-blank exercise. Return JSON: { "instruction": "string", "sentence": "string with ___ for the blank", "answer": "string", "hint": "string (optional grammar note)" }`,
  multiple_choice: `Generate a multiple-choice quiz question. Return JSON: { "question": "string", "options": ["A", "B", "C", "D"], "correct": "A|B|C|D", "explanation": "string" }`,
  image_discussion: `Generate an image discussion prompt for speaking practice. Return JSON: { "prompt": "string (a vivid scene description for the teacher to show)", "discussion_questions": ["q1", "q2", "q3"], "vocabulary": ["word1", "word2", "word3"] }`,
  role_play: `Generate a role-play scenario. Return JSON: { "scenario": "string", "teacher_role": "string", "student_role": "string", "starter": "string (first line the teacher says to kick off the role-play)", "useful_phrases": ["phrase1", "phrase2", "phrase3"] }`,
  spot_the_mistake: `Generate a spot-the-mistake exercise. Return JSON: { "instruction": "Find the mistake in this sentence:", "sentence": "string with ONE grammatical mistake", "corrected": "string (correct version)", "explanation": "string" }`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Unauthorized");

    const { lessonId } = await req.json();
    if (!lessonId) throw new Error("lessonId is required");

    // Fetch lesson — verify teacher owns it
    const { data: lesson, error: lessonError } = await supabase
      .from("teacher_lessons")
      .select("*")
      .eq("id", lessonId)
      .eq("teacher_id", user.id)
      .single();

    if (lessonError || !lesson) throw new Error("Lesson not found or access denied");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI key not configured");

    // Delete existing exercises for this lesson to regenerate cleanly
    await supabase.from("lesson_exercises").delete().eq("lesson_id", lessonId);

    const exerciseTypes: string[] = lesson.exercise_types || [];
    const generatedExercises: any[] = [];

    for (let i = 0; i < exerciseTypes.length; i++) {
      const type = exerciseTypes[i];
      const typePrompt = EXERCISE_PROMPTS[type];
      if (!typePrompt) continue;

      const systemPrompt = `You are an expert language teacher creating exercises for a 1-on-1 tutoring session.
Language: ${lesson.cefr_level} level learner.
Topic: ${lesson.topic || "general conversation"}.
Exercise format: ${type}.
Return ONLY valid JSON, no markdown, no explanation.`;

      const userPrompt = `${typePrompt}
Make it appropriate for a ${lesson.cefr_level} level student studying: ${lesson.topic || "general conversation"}.`;

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
        if (status === 402) throw new Error("AI credits exhausted. Please add funds.");
        console.error(`AI error for type ${type}:`, status);
        continue;
      }

      const aiData = await response.json();
      const raw = aiData.choices?.[0]?.message?.content || "";

      // Strip markdown code fences if present
      const cleaned = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();

      let content: any;
      try {
        content = JSON.parse(cleaned);
      } catch {
        console.error(`Failed to parse JSON for type ${type}:`, cleaned);
        continue;
      }

      generatedExercises.push({
        lesson_id: lessonId,
        exercise_type: type,
        content,
        order_index: i,
      });
    }

    if (generatedExercises.length === 0) {
      throw new Error("No exercises could be generated. Please try again.");
    }

    const { error: insertError } = await supabase
      .from("lesson_exercises")
      .insert(generatedExercises);

    if (insertError) throw new Error(`Failed to save exercises: ${insertError.message}`);

    // Update lesson status to 'ready'
    await supabase
      .from("teacher_lessons")
      .update({ status: "ready" })
      .eq("id", lessonId);

    return new Response(
      JSON.stringify({ success: true, count: generatedExercises.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("generate-lesson-exercises error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
