import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_VIDEO_LIMITS: Record<string, number> = {
  free: 5,
  trial: 10,
  pro: 10,
  premium: 15,
};

const EXERCISE_PROMPTS: Record<string, string> = {
  fill_in_blank: `Generate a fill-in-the-blank exercise. Return JSON: { "sentence": "string with ___ for the blank", "answer": "string", "hint": "string (optional grammar note)", "question_translation": "string", "answer_translation": "string" }`,
  multiple_choice: `Generate a multiple-choice quiz question. Return JSON: { "question": "string", "options": ["A", "B", "C", "D"], "correct": "A|B|C|D", "explanation": "string", "question_translation": "string", "answer_translation": "string (translation of the correct option)" }`,
  role_play: `Generate a role-play scenario inspired by the video content. Return JSON: { "scenario": "string (2-3 sentences)", "teacher_role": "string", "student_role": "string", "starter": "string (first line)", "useful_phrases": ["phrase1", "phrase2", "phrase3"], "question_translation": "string (translation of scenario)", "answer_translation": "string (translation of starter)" }`,
  spot_the_mistake: `Generate a spot-the-mistake exercise. Return JSON: { "instruction": "Find the mistake in this sentence:", "sentence": "string with ONE grammatical mistake", "corrected": "string (correct version)", "explanation": "string", "question_translation": "string (translation of the sentence with mistake)", "answer_translation": "string (translation of the corrected sentence)" }`,
};

interface VideoSceneRow {
  id: string;
  scene_index: number;
  start_time: number;
  end_time: number;
  scene_title: string;
  scene_transcript: string;
}

interface LessonExerciseRow {
  id: string;
  lesson_id: string;
  exercise_type: string;
  content: any;
  order_index: number;
  created_at: string;
}

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

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 60 + minutes + seconds / 60;
}

async function checkVideoDurationLimit(videoId: string, teacherId: string): Promise<string | null> {
  const apiKey = Deno.env.get('YOUTUBE_DATA_API_KEY');
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${apiKey}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const iso = data.items?.[0]?.contentDetails?.duration;
    if (!iso) return null;

    const durationMinutes = parseISO8601Duration(iso);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { data: sub } = await supabaseAdmin
      .from('teacher_subscriptions')
      .select('plan')
      .eq('teacher_id', teacherId)
      .maybeSingle();
    const plan = (sub as any)?.plan || 'free';
    const maxMinutes = PLAN_VIDEO_LIMITS[plan] || PLAN_VIDEO_LIMITS.free;

    console.log(`[duration] Video: ${durationMinutes.toFixed(1)}min, plan: ${plan}, limit: ${maxMinutes}min`);

    if (durationMinutes > maxMinutes) {
      return `VIDEO_TOO_LONG:This video is ${Math.ceil(durationMinutes)} minutes long. Your ${plan} plan allows videos up to ${maxMinutes} minutes. Upgrade your plan for longer videos.`;
    }
    return null;
  } catch (e) {
    console.error('[duration] check failed:', e);
    return null;
  }
}


function normalizeForComparison(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function multipleChoiceFingerprint(content: any): string {
  const question = normalizeForComparison(content?.question || "");
  const options = Array.isArray(content?.options)
    ? content.options.map((opt: string) => normalizeForComparison(opt)).sort()
    : [];
  return `${question}||${options.join("|")}`;
}

function hasValidExerciseContent(exerciseType: string, content: any): boolean {
  if (!content || typeof content !== "object") return false;

  if (exerciseType === "fill_in_blank") {
    return !!(content.sentence && content.answer);
  }
  if (exerciseType === "multiple_choice") {
    return !!(
      content.question &&
      Array.isArray(content.options) &&
      content.options.length === 4 &&
      ["A", "B", "C", "D"].includes(content.correct)
    );
  }
  if (exerciseType === "role_play") {
    return !!(content.scenario && content.teacher_role && content.student_role);
  }
  if (exerciseType === "spot_the_mistake") {
    return !!(content.sentence && content.corrected);
  }
  return false;
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

    const { lessonId, exerciseType, forceRegenerate = false } = await req.json();
    if (!lessonId) throw new Error("lessonId is required");
    if (!exerciseType) throw new Error("exerciseType is required");

    const typePrompt = EXERCISE_PROMPTS[exerciseType];
    if (!typePrompt) throw new Error(`Unknown exercise type: ${exerciseType}`);
    const expectedCount = exerciseType === "role_play" ? 3 : 5;

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

    // Video duration check for teacher's YouTube lessons
    if (isTeacher && lesson.youtube_url) {
      const ytId = extractVideoId(lesson.youtube_url);
      if (ytId) {
        const durationError = await checkVideoDurationLimit(ytId, user.id);
        if (durationError) {
          return new Response(
            JSON.stringify({ error: durationError }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI key not configured");

    // Fetch transcript if not already stored
    let transcriptText = lesson.transcript;
    let sharedVideoId: string | null = null;
    let sceneContexts: VideoSceneRow[] = [];
    if (!transcriptText && lesson.youtube_url) {
      const ytId = extractVideoId(lesson.youtube_url);
      if (ytId) {
        const { data: sharedVideo } = await supabase
          .from("youtube_videos")
          .select("id")
          .eq("video_id", ytId)
          .maybeSingle();

        sharedVideoId = sharedVideo?.id || null;
        if (sharedVideo?.id) {
          const { data: sharedTranscript } = await supabase
            .from("youtube_transcripts")
            .select("transcript")
            .eq("video_id", sharedVideo.id)
            .maybeSingle();
          transcriptText = sharedTranscript?.transcript || transcriptText;
        }
      }
    }

    if (lesson.youtube_url && !sharedVideoId) {
      const ytId = extractVideoId(lesson.youtube_url);
      if (ytId) {
        const { data: sharedVideo } = await supabase
          .from("youtube_videos")
          .select("id")
          .eq("video_id", ytId)
          .maybeSingle();
        sharedVideoId = sharedVideo?.id || null;
      }
    }

    if (!transcriptText && lesson.youtube_url) {
      transcriptText = await fetchTranscript(lesson.youtube_url);
      if (transcriptText) {
        await supabase
          .from("teacher_lessons")
          .update({ transcript: transcriptText })
          .eq("id", lessonId);
      }
    }

    if (sharedVideoId) {
      const { data: storedScenes } = await supabase
        .from("video_scenes")
        .select("id, scene_index, start_time, end_time, scene_title, scene_transcript")
        .eq("video_id", sharedVideoId)
        .order("scene_index", { ascending: true });

      sceneContexts = (storedScenes || []).filter(
        (scene: any) => scene.end_time > scene.start_time && (scene.scene_transcript || "").trim().length > 0
      ) as VideoSceneRow[];

      if (sceneContexts.length === 0) {
        try {
          await supabase.functions.invoke("segment-video-scenes", {
            body: { videoId: sharedVideoId },
          });
        } catch (segmentError) {
          console.warn("[generate-lesson-exercises-by-type] Segment trigger failed:", segmentError);
        }

        const { data: refreshedScenes } = await supabase
          .from("video_scenes")
          .select("id, scene_index, start_time, end_time, scene_title, scene_transcript")
          .eq("video_id", sharedVideoId)
          .order("scene_index", { ascending: true });

        sceneContexts = (refreshedScenes || []).filter(
          (scene: any) => scene.end_time > scene.start_time && (scene.scene_transcript || "").trim().length > 0
        ) as VideoSceneRow[];

        if (sceneContexts.length === 0) {
          console.warn(`[generate-lesson-exercises-by-type] No scene rows available for video ${sharedVideoId}; using full transcript context`);
        }
      }
    }

    // Reuse existing exercises for the same lesson/type/context instead of regenerating.
    // Context is anchored by lesson_id (video/paragraph source on the lesson itself).
    const { data: existingExercises, error: existingExercisesError } = await supabase
      .from("lesson_exercises")
      .select("id, exercise_type, content, order_index, created_at")
      .eq("lesson_id", lessonId)
      .eq("exercise_type", exerciseType)
      .order("order_index", { ascending: true });

    if (existingExercisesError) {
      throw new Error(`Failed to check existing exercises: ${existingExercisesError.message}`);
    }

    const validExistingExercises = (existingExercises || []).filter((exercise: any) =>
      hasValidExerciseContent(exerciseType, exercise.content)
    );

    if (!forceRegenerate && validExistingExercises.length >= expectedCount) {
      console.log(`[generate-lesson-exercises-by-type] Reusing ${validExistingExercises.length} existing exercises in same lesson`, {
        lessonId,
        exerciseType,
      });
      return new Response(
        JSON.stringify({
          success: true,
          count: validExistingExercises.length,
          exerciseType,
          cached: true,
          source: "lesson_cache",
          exercises: validExistingExercises,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reuse from other lessons that share the exact same canonical input key.
    // Reuse key: canonical youtube_video_id + exercise_type + cefr_level + language + translation_language.
    if (!forceRegenerate && sharedVideoId) {
      const { data: reusableLessons } = await supabase
        .from("teacher_lessons")
        .select("id")
        .eq("teacher_id", lesson.teacher_id)
        .eq("lesson_type", "youtube")
        .neq("id", lessonId)
        .eq("cefr_level", lesson.cefr_level || "A1")
        .eq("language", lesson.language || "italian")
        .eq("translation_language", lesson.translation_language || "english")
        .ilike("youtube_url", `%${extractVideoId(lesson.youtube_url || "")}%`)
        .order("created_at", { ascending: false })
        .limit(20);

      const reusableLessonIds = (reusableLessons || []).map((row: any) => row.id);
      if (reusableLessonIds.length > 0) {
        const { data: reusableExercises, error: reusableExercisesError } = await supabase
          .from("lesson_exercises")
          .select("id, lesson_id, exercise_type, content, order_index, created_at")
          .in("lesson_id", reusableLessonIds)
          .eq("exercise_type", exerciseType)
          .order("created_at", { ascending: false })
          .order("order_index", { ascending: true });

        if (reusableExercisesError) {
          throw new Error(`Failed to check reusable exercises: ${reusableExercisesError.message}`);
        }

        const groupedByLesson = new Map<string, LessonExerciseRow[]>();
        for (const row of (reusableExercises || []) as LessonExerciseRow[]) {
          const bucket = groupedByLesson.get(row.lesson_id) || [];
          bucket.push(row);
          groupedByLesson.set(row.lesson_id, bucket);
        }

        for (const reusableLessonId of reusableLessonIds) {
          const candidate = (groupedByLesson.get(reusableLessonId) || [])
            .filter((exercise) => hasValidExerciseContent(exerciseType, exercise.content))
            .sort((a, b) => a.order_index - b.order_index);

          if (candidate.length >= expectedCount) {
            const { count: existingCount } = await supabase
              .from("lesson_exercises")
              .select("id", { count: "exact", head: true })
              .eq("lesson_id", lessonId);

            let nextOrder = existingCount || 0;
            const rowsToInsert = candidate.slice(0, expectedCount).map((exercise) => ({
              lesson_id: lessonId,
              exercise_type: exerciseType,
              content: exercise.content,
              order_index: nextOrder++,
            }));

            const { error: copyError } = await supabase
              .from("lesson_exercises")
              .insert(rowsToInsert);

            if (copyError) {
              throw new Error(`Failed to copy reusable exercises: ${copyError.message}`);
            }

            console.log(`[generate-lesson-exercises-by-type] Reused exercises from prior lesson`, {
              lessonId,
              sourceLessonId: reusableLessonId,
              sharedVideoId,
              exerciseType,
              cefr: lesson.cefr_level || "A1",
              language: lesson.language || "italian",
              translationLanguage: lesson.translation_language || "english",
            });

            return new Response(
              JSON.stringify({
                success: true,
                count: rowsToInsert.length,
                exerciseType,
                cached: true,
                source: "cross_lesson_cache",
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }
    }

    // Check existing exercises count for order_index offset
    const { count: existingCount } = await supabase
      .from("lesson_exercises")
      .select("id", { count: "exact", head: true })
      .eq("lesson_id", lessonId);

    let orderIndex = existingCount || 0;

    const count = expectedCount;
    const language = lesson.language || "italian";
    const translationLanguage = lesson.translation_language || "english";
    const generatedExercises: any[] = [];
    const seenMultipleChoiceFingerprints = new Set<string>();

    for (let q = 0; q < count; q++) {
      const selectedScene = sceneContexts.length > 0 ? sceneContexts[q % sceneContexts.length] : null;
      const transcriptContext = selectedScene
        ? `

Base the exercise on THIS video scene:
Scene ${selectedScene.scene_index + 1}: ${selectedScene.scene_title}
Time range: ${Math.round(selectedScene.start_time)}s-${Math.round(selectedScene.end_time)}s
${selectedScene.scene_transcript.slice(0, 2200)}`
        : transcriptText
          ? `

Base the exercise on this video transcript:
${transcriptText.slice(0, 3000)}`
          : "";

      const previousQuestionContext = exerciseType === "multiple_choice" && generatedExercises.length > 0
        ? `

Previously accepted multiple-choice questions (DO NOT repeat or lightly reword these):
${generatedExercises
            .map((e, idx) => `${idx + 1}. Q: ${e.content?.question || ""} | Options: ${(e.content?.options || []).join(" | ")}`)
            .join("\n")}`
        : "";

      let accepted = false;

      for (let attempt = 0; attempt < 3 && !accepted; attempt++) {
        const systemPrompt = `You are an expert language teacher creating exercises for a 1-on-1 tutoring session.
The exercises MUST be written in ${language}. All sentences, questions, and options should be in ${language}.
CEFR Level: ${lesson.cefr_level}.
Topic: ${lesson.topic || "general conversation"}.
Exercise format: ${exerciseType}.
The "question_translation" and "answer_translation" fields MUST be in ${translationLanguage}.
${q > 0 ? `This is exercise ${q + 1} of ${count}. Make it DIFFERENT from previous exercises — vary the topic, grammar point, or vocabulary tested.` : ""}
${exerciseType === "multiple_choice" ? "For multiple-choice, each new question must test a different target than prior ones (different intent, vocabulary focus, and distractors)." : ""}
${exerciseType === "role_play" ? "Create a role-play scenario directly inspired by the video content themes, vocabulary, and situations." : ""}
Return ONLY valid JSON, no markdown, no explanation.`;

        const userPrompt = `${typePrompt}
Make it appropriate for a ${lesson.cefr_level} level student. Write the exercise in ${language}. Write translations in ${translationLanguage}.${
          lesson.paragraph_content ? `

Base the question on this text:
${lesson.paragraph_content}` : ""
        }${transcriptContext}${previousQuestionContext}${attempt > 0 ? `

Attempt ${attempt + 1}/3: previous candidate was too similar. Produce a clearly different question and options.` : ""}`;

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
          console.error(`AI error for ${exerciseType} q${q} attempt ${attempt + 1}:`, status);
          continue;
        }

        const aiData = await response.json();
        const raw = aiData.choices?.[0]?.message?.content || "";
        const cleaned = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();

        let content: any;
        try {
          content = JSON.parse(cleaned);
        } catch {
          console.error(`Failed to parse JSON for ${exerciseType} q${q} attempt ${attempt + 1}:`, cleaned);
          continue;
        }

        if (exerciseType === "multiple_choice") {
          const fingerprint = multipleChoiceFingerprint(content);
          if (!fingerprint || seenMultipleChoiceFingerprints.has(fingerprint)) {
            console.warn(`Duplicate/near-duplicate multiple_choice detected for q${q} attempt ${attempt + 1}, retrying...`);
            continue;
          }
          seenMultipleChoiceFingerprints.add(fingerprint);
        }

        generatedExercises.push({
          lesson_id: lessonId,
          exercise_type: exerciseType,
          content,
          order_index: orderIndex++,
        });
        accepted = true;
      }
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
