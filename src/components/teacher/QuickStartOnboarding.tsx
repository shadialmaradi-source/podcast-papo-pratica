import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/sonner";
import { trackEvent, trackFunnelStep, trackTeacherFunnelStep } from "@/lib/analytics";
import { Play, Rocket, Loader2, CheckCircle, ArrowRight } from "lucide-react";

const DEMO_YOUTUBE_URL = "https://www.youtube.com/shorts/ileoFbDsd8M";
const DEMO_TRANSCRIPT = "Hi officer. How can I help you? I want to tell you something. You want to tell me something? Yes. To the police? Oh, you want to do a report? Yeah, I want to report something. What is it about? My document is lost. What document? Where my face? Your ID? Yeah, I lost my ID. Do you have your passport? I also lost my passport. Do you have a copy of your passport or ID? No. Do you have a photo? No, I don't have that full name. Katalina Golans and your ID number. Yeah, it's 67 >> 67 >> 67 67. >> Kids, I never understand them. 67 3394. Did you find me? Yeah, but doesn't look like you at all. Not again. No. Oh, perfect. That would be 250 cash only.";

export function QuickStartOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [videoWatched, setVideoWatched] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleWatchComplete = () => {
    setVideoWatched(true);
    trackEvent("teacher_quickstart_video_watched");
    trackFunnelStep("teacher_onboarding", "video_watched", 0);
    setStep(1);
  };

  const handleCreateDemo = async () => {
    if (!user) return;
    setIsCreating(true);
    trackEvent("teacher_quickstart_demo_started");

    try {
      // 1. Insert pre-filled demo lesson
      const { data: lesson, error: lessonError } = await supabase
        .from("teacher_lessons")
        .insert({
          teacher_id: user.id,
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

      if (lessonError) throw lessonError;

      // 2. Seed a lightweight 1-question-per-type demo set
      const { error: exerciseError } = await supabase
        .from("lesson_exercises")
        .insert([
          {
            lesson_id: lesson.id,
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
            lesson_id: lesson.id,
            exercise_type: "fill_in_blank",
            order_index: 1,
            content: {
              sentence: "Yeah, I lost my ____.",
              hint: "It is the identity document discussed in the clip.",
              answer: "ID",
            },
          },
          {
            lesson_id: lesson.id,
            exercise_type: "role_play",
            order_index: 2,
            content: {
              scenario: "Role-play at a police station where a traveler reports a lost document.",
              teacher_role: "Police officer",
              student_role: "Traveler reporting a lost ID and passport",
              starter: "Hi officer, I want to report something.",
              useful_phrases: ["I want to report something.", "My ID is lost.", "Do you have a copy?", "That would be 250 cash only."],
            },
          },
          {
            lesson_id: lesson.id,
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

      if (exerciseError) throw exerciseError;

      // 3. Mark onboarding completed, seed full_name from profiles if available
      let seedName: string | undefined;
      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      seedName = profileData?.display_name || profileData?.full_name || undefined;

      await supabase.from("teacher_profiles" as any).upsert(
        {
          teacher_id: user.id,
          onboarding_completed: true,
          ...(seedName ? { full_name: seedName } : {}),
        } as any,
        { onConflict: "teacher_id" }
      );

      trackEvent("teacher_quickstart_demo_created");
      trackFunnelStep("teacher_onboarding", "completed", 1);
      trackTeacherFunnelStep("onboarding_completed", {
        source: "quickstart_demo",
      });

      toast.success("🎉 Demo lesson created!");
      navigate(`/teacher/lesson/${lesson.id}?demo=true`);
    } catch (error: any) {
      console.error("Error creating demo lesson:", error);
      toast.error("Failed to create demo lesson. Please try again.");
      setIsCreating(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;
    try {
      await supabase.from("teacher_profiles" as any).upsert(
        { teacher_id: user.id, onboarding_completed: true } as any,
        { onConflict: "teacher_id" }
      );
    } catch {
      // continue
    }
    trackEvent("teacher_quickstart_skipped");
    trackTeacherFunnelStep("onboarding_completed", {
      source: "quickstart_skip",
    });
    navigate("/teacher");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[0, 1].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step ? "w-10 bg-primary" : s < step ? "w-10 bg-primary/50" : "w-10 bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Watch Demo */}
          {step === 0 && (
            <motion.div
              key="step-video"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="border-0 shadow-2xl bg-background/80 backdrop-blur">
                <CardContent className="p-6 space-y-5">
                  <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">
                      Welcome to ListenFlow! 👋
                    </h1>
                    <p className="text-muted-foreground">
                      See how to create a lesson in under 2 minutes
                    </p>
                  </div>

                  {/* Step badge */}
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      1
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      Watch Quick Demo
                    </span>
                  </div>

                  {/* Video placeholder */}
                  <div className="relative rounded-xl overflow-hidden border border-border bg-muted aspect-video">
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Play className="h-8 w-8 text-primary ml-1" />
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        30-Second Demo
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Paste URL → AI generates → Share with student
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleWatchComplete}
                    className="w-full"
                    size="lg"
                  >
                    {videoWatched ? "Continue" : "I've Watched It — Next"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    This 30-second video shows how ListenFlow works
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 2: Create Demo Lesson */}
          {step === 1 && (
            <motion.div
              key="step-create"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="border-0 shadow-2xl bg-background/80 backdrop-blur">
                <CardContent className="p-6 space-y-5">
                  <div className="text-center space-y-2">
                    <div className="mx-auto mb-2 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Rocket className="h-7 w-7 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">
                      Create Your First Lesson
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      One click — we'll use a pre-selected English YouTube Short
                    </p>
                  </div>

                  {/* Step badge */}
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      2
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      Create Demo Lesson
                    </span>
                  </div>

                  {/* What will happen */}
                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                    <p className="text-sm font-medium text-foreground">
                      What happens when you click:
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {[
                        "A real English A2 demo lesson is created",
                        "The transcript appears under the video",
                        "You get 4 demo exercise types (1 question each)",
                        "You'll see exactly what students see",
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    onClick={handleCreateDemo}
                    disabled={isCreating}
                    className="w-full"
                    size="lg"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating Demo Lesson...
                      </>
                    ) : (
                      <>
                        <Rocket className="h-4 w-4" />
                        Create Demo Lesson
                      </>
                    )}
                  </Button>

                  {isCreating && (
                    <p className="text-xs text-center text-muted-foreground animate-pulse">
                      Preparing demo lesson... ~10 seconds
                    </p>
                  )}

                  <p className="text-xs text-center text-muted-foreground">
                    This creates a real lesson you can share with students
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skip link */}
        <div className="mt-4 text-center">
          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Skip for now, I'll explore on my own
          </button>
        </div>
      </div>
    </div>
  );
}
