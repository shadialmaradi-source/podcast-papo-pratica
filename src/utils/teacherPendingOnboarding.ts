import { supabase } from "@/integrations/supabase/client";
import { ensureTeacherTrialSubscription } from "@/services/teacherSubscriptionService";
import { trackEvent, trackFunnelStep, trackTeacherFunnelStep } from "@/lib/analytics";

const STORAGE_KEY = "teacher_pending_onboarding";

export interface TeacherPendingOnboarding {
  fullName: string;
  studentsCount: string;
  languageTaught: string;
  level: string;
  demoTried: boolean;
}

export const DEMO_YOUTUBE_URL = "https://www.youtube.com/shorts/ileoFbDsd8M";
export const DEMO_TRANSCRIPT =
  "Hi officer. How can I help you? I want to tell you something. You want to tell me something? Yes. To the police? Oh, you want to do a report? Yeah, I want to report something. What is it about? My document is lost. What document? Where my face? Your ID? Yeah, I lost my ID. Do you have your passport? I also lost my passport. Do you have a copy of your passport or ID? No. Do you have a photo? No, I don't have that full name. Katalina Golans and your ID number. Yeah, it's 67 >> 67 >> 67 67. >> Kids, I never understand them. 67 3394. Did you find me? Yeah, but doesn't look like you at all. Not again. No. Oh, perfect. That would be 250 cash only.";

export function getPendingTeacherOnboarding(): TeacherPendingOnboarding | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TeacherPendingOnboarding) : null;
  } catch {
    return null;
  }
}

export function setPendingTeacherOnboarding(data: Partial<TeacherPendingOnboarding>) {
  if (typeof window === "undefined") return;
  const current = getPendingTeacherOnboarding() ?? {
    fullName: "",
    studentsCount: "",
    languageTaught: "",
    level: "",
    demoTried: false,
  };
  const merged = { ...current, ...data };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

export function clearPendingTeacherOnboarding() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function hasPendingTeacherOnboarding(): boolean {
  return getPendingTeacherOnboarding() !== null;
}

/**
 * Promote the user to teacher, persist onboarding form data, and seed the demo lesson.
 * Safe to call multiple times — uses upsert / dedupes the demo lesson by title.
 */
export async function finalizeTeacherOnboarding(userId: string): Promise<{ lessonId?: string }> {
  const pending = getPendingTeacherOnboarding();
  if (!pending) return {};

  // Ensure DB role is teacher (in case signup race left it as student)
  await supabase
    .from("user_roles" as any)
    .update({ role: "teacher" } as any)
    .eq("user_id", userId);

  await ensureTeacherTrialSubscription(userId);

  // Persist profile data + mark onboarding complete
  const bioParts: string[] = [];
  if (pending.studentsCount) bioParts.push(`Teaches ~${pending.studentsCount} students`);
  if (pending.level) bioParts.push(`Levels: ${pending.level}`);

  await supabase.from("teacher_profiles" as any).upsert(
    {
      teacher_id: userId,
      onboarding_completed: true,
      full_name: pending.fullName || null,
      languages_taught: pending.languageTaught ? [pending.languageTaught] : null,
      bio: bioParts.length ? bioParts.join(" · ") : null,
    } as any,
    { onConflict: "teacher_id" }
  );

  // Seed the demo lesson + exercises (only if user doesn't already have one)
  const { data: existing } = await supabase
    .from("teacher_lessons")
    .select("id")
    .eq("teacher_id", userId)
    .eq("title", "Demo: Reporting a Lost ID at the Police Station")
    .maybeSingle();

  let lessonId: string | undefined = (existing as any)?.id;

  if (!lessonId) {
    const { data: lesson, error: lessonError } = await supabase
      .from("teacher_lessons")
      .insert({
        teacher_id: userId,
        title: "Demo: Reporting a Lost ID at the Police Station",
        lesson_type: "youtube",
        youtube_url: DEMO_YOUTUBE_URL,
        transcript: DEMO_TRANSCRIPT,
        cefr_level: "A2",
        language: "English",
        translation_language: "English",
        exercise_types: ["multiple_choice", "fill_in_blank", "role_play", "spot_the_mistake"],
        status: "draft",
      } as any)
      .select()
      .single();

    if (!lessonError && lesson) {
      lessonId = (lesson as any).id;
      await supabase.from("lesson_exercises").insert([
        {
          lesson_id: lessonId,
          exercise_type: "multiple_choice",
          order_index: 0,
          content: {
            question: "Why does the woman talk to the officer?",
            options: ["She lost her ID", "She needs directions", "She found a wallet", "She wants a job"],
            correct: "A",
            explanation: "She says she wants to report that her document/ID is lost.",
          },
        },
        {
          lesson_id: lessonId,
          exercise_type: "fill_in_blank",
          order_index: 1,
          content: {
            sentence: "Yeah, I lost my ____.",
            hint: "It is the identity document discussed in the clip.",
            answer: "ID",
          },
        },
        {
          lesson_id: lessonId,
          exercise_type: "role_play",
          order_index: 2,
          content: {
            scenario: "Role-play at a police station where a traveler reports a lost document.",
            teacher_role: "Police officer",
            student_role: "Traveler reporting a lost ID and passport",
            starter: "Hi officer, I want to report something.",
            useful_phrases: [
              "I want to report something.",
              "My ID is lost.",
              "Do you have a copy?",
              "That would be 250 cash only.",
            ],
          },
        },
        {
          lesson_id: lessonId,
          exercise_type: "spot_the_mistake",
          order_index: 3,
          content: {
            instruction: "Find and fix the incorrect statement based on the video transcript.",
            sentence: "I found my passport and ID.",
            corrected: "I also lost my passport, and I lost my ID.",
            explanation: "In the video, she reports both documents are lost, not found.",
          },
        },
      ] as any);
    }
  }

  trackEvent("teacher_quickstart_demo_created");
  trackFunnelStep("teacher_onboarding", "completed", 1);
  trackTeacherFunnelStep("onboarding_completed", { source: "preauth_wizard" });

  clearPendingTeacherOnboarding();
  return { lessonId };
}
