import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/sonner";
import { trackEvent, trackFunnelStep } from "@/lib/analytics";
import { Play, Rocket, Loader2, CheckCircle, ArrowRight } from "lucide-react";

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
          title: "Demo: Morning Routine in Spanish",
          lesson_type: "youtube",
          youtube_url: "https://www.youtube.com/watch?v=S9bCLPwzSC0",
          cefr_level: "A2",
          language: "Spanish",
          translation_language: "English",
          exercise_types: ["multiple_choice", "fill_in_blank"],
          status: "draft",
        } as any)
        .select()
        .single();

      if (lessonError) throw lessonError;

      // 2. Generate exercises via edge function
      const { error: genError } = await supabase.functions.invoke(
        "generate-lesson-exercises-by-type",
        { body: { lessonId: lesson.id, exerciseType: "multiple_choice" } }
      );

      if (genError) {
        console.warn("Exercise generation failed, continuing:", genError);
      }

      // 3. Mark onboarding completed
      await supabase.from("teacher_profiles" as any).upsert(
        {
          teacher_id: user.id,
          onboarding_completed: true,
        } as any,
        { onConflict: "teacher_id" }
      );

      trackEvent("teacher_quickstart_demo_created");
      trackFunnelStep("teacher_onboarding", "completed", 1);

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
                      One click — we'll use a pre-selected Spanish video
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
                        "A real Spanish A2 lesson is created",
                        "AI generates exercises from the video",
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
                      Generating exercises from video... ~30 seconds
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
