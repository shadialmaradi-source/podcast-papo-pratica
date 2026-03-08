import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { trackEvent, trackPageView, trackFunnelStep } from "@/lib/analytics";
import {
  Users, ArrowRight, ArrowLeft, Check, ChevronRight
} from "lucide-react";
import { TeacherDemoWalkthrough } from "@/components/teacher/TeacherDemoWalkthrough";

const LANGUAGES = [
  "English", "Spanish", "French", "Italian", "Portuguese",
  "German", "Japanese", "Korean", "Chinese", "Arabic", "Russian", "Dutch"
];

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const NATIVE_LANGUAGES = [
  "English", "Spanish", "Portuguese", "French", "Italian",
  "German", "Japanese", "Korean", "Chinese", "Arabic", "Russian"
];


export default function TeacherOnboarding() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [tourSlide, setTourSlide] = useState(0);

  // Step 1 state
  const [fullName, setFullName] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  // Step 2 state
  const [studentEmail, setStudentEmail] = useState("");
  const [studentLevel, setStudentLevel] = useState("A1");
  const [studentNativeLanguage, setStudentNativeLanguage] = useState("English");

  const [saving, setSaving] = useState(false);

  // Check if already completed onboarding
  useEffect(() => {
    if (authLoading || !user) return;
    supabase
      .from("teacher_profiles" as any)
      .select("onboarding_completed")
      .eq("teacher_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && (data as any).onboarding_completed) {
          navigate("/teacher", { replace: true });
        }
      });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    trackPageView("teacher_onboarding", "teacher");
    trackEvent("teacher_onboarding_started");
    trackFunnelStep("teacher_onboarding", "profile", 0);
  }, []);

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const handleStep1Next = async () => {
    if (!fullName.trim()) {
      toast({ title: "Please enter your name", variant: "destructive" });
      return;
    }
    if (selectedLanguages.length === 0) {
      toast({ title: "Select at least one language", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Update profiles.full_name
      await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("user_id", user!.id);

      // Upsert teacher_profiles
      await supabase.from("teacher_profiles" as any).upsert(
        {
          teacher_id: user!.id,
          full_name: fullName.trim(),
          languages_taught: selectedLanguages,
          onboarding_completed: false,
        } as any,
        { onConflict: "teacher_id" }
      );

      trackEvent("teacher_onboarding_step_1", { languages: selectedLanguages });
      trackFunnelStep("teacher_onboarding", "add_student", 1);
      setStep(1);
    } catch {
      toast({ title: "Error saving profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleStep2Next = async () => {
    if (studentEmail.trim()) {
      setSaving(true);
      try {
        await supabase.from("teacher_students" as any).insert({
          teacher_id: user!.id,
          student_email: studentEmail.trim().toLowerCase(),
          level: studentLevel,
          native_language: studentNativeLanguage,
          status: "invited",
        } as any);
        trackEvent("teacher_onboarding_step_2", { added_student: true });
      } catch {
        toast({ title: "Error adding student", variant: "destructive" });
      } finally {
        setSaving(false);
      }
    } else {
      trackEvent("teacher_onboarding_step_2", { added_student: false });
    }
    trackFunnelStep("teacher_onboarding", "tour", 2);
    setStep(2);
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await supabase
        .from("teacher_profiles" as any)
        .update({ onboarding_completed: true } as any)
        .eq("teacher_id", user!.id);

      trackEvent("teacher_onboarding_completed");
      trackFunnelStep("teacher_onboarding", "completed", 3);
      navigate("/teacher", { replace: true });
    } catch {
      toast({ title: "Error completing onboarding", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[0, 1, 2].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step ? "w-8 bg-primary" : s < step ? "w-8 bg-primary/50" : "w-8 bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Welcome & Profile */}
          {step === 0 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <Card className="border-0 shadow-2xl bg-background/80 backdrop-blur">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Welcome to ListenFlow for Teachers! 👋</CardTitle>
                  <CardDescription>Let's get you set up in 2 minutes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Your name</Label>
                    <Input
                      id="fullName"
                      placeholder="e.g. Maria Rossi"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>What language(s) do you teach?</Label>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES.map((lang) => (
                        <Badge
                          key={lang}
                          variant={selectedLanguages.includes(lang) ? "default" : "outline"}
                          className="cursor-pointer select-none transition-colors"
                          onClick={() => toggleLanguage(lang)}
                        >
                          {selectedLanguages.includes(lang) && <Check className="h-3 w-3 mr-1" />}
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleStep1Next}
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? "Saving..." : "Continue"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 2: First Student */}
          {step === 1 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <Card className="border-0 shadow-2xl bg-background/80 backdrop-blur">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Add your first student</CardTitle>
                  <CardDescription>Optional — you can always add students later.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentEmail">Student email</Label>
                    <Input
                      id="studentEmail"
                      type="email"
                      placeholder="student@email.com"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="studentLevel">Level</Label>
                      <select
                        id="studentLevel"
                        value={studentLevel}
                        onChange={(e) => setStudentLevel(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {CEFR_LEVELS.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nativeLang">Native language</Label>
                      <select
                        id="nativeLang"
                        value={studentNativeLanguage}
                        onChange={(e) => setStudentNativeLanguage(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {NATIVE_LANGUAGES.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button onClick={handleStep2Next} disabled={saving} className="flex-1">
                      {saving ? "Saving..." : studentEmail.trim() ? "Add & Continue" : "Skip for now"}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* STEP 3: Quick Tour */}
          {step === 2 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <Card className="border-0 shadow-2xl bg-background/80 backdrop-blur">
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">Here's how it works</CardTitle>
                  <CardDescription>3 simple steps to teach smarter</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Tour slide */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={tourSlide}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-center space-y-3 min-h-[140px] flex flex-col items-center justify-center"
                    >
                      <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                        {(() => {
                          const Icon = TOUR_SLIDES[tourSlide].icon;
                          return <Icon className="h-7 w-7 text-primary" />;
                        })()}
                      </div>
                      <h3 className="font-semibold text-lg text-foreground">
                        {TOUR_SLIDES[tourSlide].title}
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        {TOUR_SLIDES[tourSlide].description}
                      </p>
                    </motion.div>
                  </AnimatePresence>

                  {/* Slide dots */}
                  <div className="flex justify-center gap-2">
                    {TOUR_SLIDES.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setTourSlide(i)}
                        className={`h-2 w-2 rounded-full transition-all ${
                          i === tourSlide ? "bg-primary w-4" : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2">
                    {tourSlide < TOUR_SLIDES.length - 1 ? (
                      <>
                        <Button
                          variant="ghost"
                          onClick={handleComplete}
                          disabled={saving}
                          className="flex-1"
                        >
                          <SkipForward className="mr-2 h-4 w-4" />
                          Skip
                        </Button>
                        <Button
                          onClick={() => {
                            trackEvent(`teacher_onboarding_step_3`);
                            setTourSlide(tourSlide + 1);
                          }}
                          className="flex-1"
                        >
                          Next
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={handleComplete}
                        disabled={saving}
                        className="w-full"
                      >
                        {saving ? "Finishing..." : "Got it, take me to dashboard"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
