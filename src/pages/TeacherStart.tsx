import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ArrowLeft, Rocket, CheckCircle, Play, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { trackEvent, trackTeacherFunnelStep } from "@/lib/analytics";
import {
  getPendingTeacherOnboarding,
  setPendingTeacherOnboarding,
  DEMO_TRANSCRIPT,
} from "@/utils/teacherPendingOnboarding";

export default function TeacherStart() {
  const navigate = useNavigate();
  const { user, loading: authLoading, role } = useAuth();
  const [step, setStep] = useState(0);
  const initial = getPendingTeacherOnboarding();
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [studentsCount, setStudentsCount] = useState(initial?.studentsCount ?? "");
  const [languageTaught, setLanguageTaught] = useState(initial?.languageTaught ?? "");
  const [level, setLevel] = useState(initial?.level ?? "");

  // If a logged-in teacher lands here, send them to dashboard.
  useEffect(() => {
    if (authLoading) return;
    if (user && role === "teacher") {
      navigate("/teacher", { replace: true });
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    trackEvent("teacher_preauth_wizard_viewed", { step });
  }, [step]);

  // Persist form fields as the user types
  useEffect(() => {
    setPendingTeacherOnboarding({ fullName, studentsCount, languageTaught, level, demoTried: step >= 1 });
  }, [fullName, studentsCount, languageTaught, level, step]);

  const goToAuth = () => {
    setPendingTeacherOnboarding({ fullName, studentsCount, languageTaught, level, demoTried: true });
    trackTeacherFunnelStep("preauth_form_completed", { source: "teacher_start" });
    navigate(`/auth?role=teacher&mode=signup&from=teacher_start`);
  };

  const canContinueStep1 = fullName.trim() && languageTaught && level;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b border-border/50">
        <button onClick={() => navigate("/teachers")} className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="font-bold text-foreground">ListenFlow</span>
        </button>
        <button
          onClick={() => navigate("/auth?role=teacher")}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Already have an account? Sign in
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Stepper */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[0, 1, 2].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  s === step ? "w-12 bg-primary" : s < step ? "w-12 bg-primary/50" : "w-12 bg-muted"
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="demo" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <Card className="border-0 shadow-2xl bg-background/80 backdrop-blur">
                  <CardContent className="p-6 space-y-5">
                    <div className="text-center space-y-2">
                      <h1 className="text-2xl font-bold text-foreground">Welcome to ListenFlow! 👋</h1>
                      <p className="text-muted-foreground">See how a real lesson looks — no account needed</p>
                    </div>

                    <div className="rounded-xl overflow-hidden border border-border bg-black aspect-video">
                      <iframe
                        className="w-full h-full"
                        src="https://www.youtube.com/embed/ileoFbDsd8M"
                        title="Demo lesson video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>

                    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 max-h-48 overflow-y-auto">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Auto-generated transcript
                      </p>
                      <p className="text-sm text-foreground leading-relaxed">{DEMO_TRANSCRIPT}</p>
                    </div>

                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        Sample exercise
                      </p>
                      <p className="text-sm text-foreground mt-2">
                        <span className="font-medium">Why does the woman talk to the officer?</span>
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <li>A. She lost her ID ✓</li>
                        <li>B. She needs directions</li>
                        <li>C. She found a wallet</li>
                        <li>D. She wants a job</li>
                      </ul>
                    </div>

                    <Button onClick={() => setStep(1)} className="w-full" size="lg">
                      Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <Card className="border-0 shadow-2xl bg-background/80 backdrop-blur">
                  <CardContent className="p-6 space-y-5">
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-bold text-foreground">Tell us about you</h2>
                      <p className="text-muted-foreground text-sm">We'll use this to set up your dashboard</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Your name</Label>
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Maria Rossi"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="languageTaught">Language you teach</Label>
                        <Select value={languageTaught} onValueChange={setLanguageTaught}>
                          <SelectTrigger id="languageTaught"><SelectValue placeholder="Select a language" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="Italian">Italian</SelectItem>
                            <SelectItem value="Spanish">Spanish</SelectItem>
                            <SelectItem value="French">French</SelectItem>
                            <SelectItem value="German">German</SelectItem>
                            <SelectItem value="Portuguese">Portuguese</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="level">Level you mostly teach</Label>
                        <Select value={level} onValueChange={setLevel}>
                          <SelectTrigger id="level"><SelectValue placeholder="Select a level" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner (A1–A2)</SelectItem>
                            <SelectItem value="intermediate">Intermediate (B1–B2)</SelectItem>
                            <SelectItem value="advanced">Advanced (C1–C2)</SelectItem>
                            <SelectItem value="mixed">Mixed levels</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="studentsCount">How many students do you teach?</Label>
                        <Select value={studentsCount} onValueChange={setStudentsCount}>
                          <SelectTrigger id="studentsCount"><SelectValue placeholder="Select a range" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-5">1–5</SelectItem>
                            <SelectItem value="6-15">6–15</SelectItem>
                            <SelectItem value="16-30">16–30</SelectItem>
                            <SelectItem value="30+">30+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setStep(0)} size="lg">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <Button onClick={() => setStep(2)} disabled={!canContinueStep1} className="flex-1" size="lg">
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="signup" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <Card className="border-0 shadow-2xl bg-background/80 backdrop-blur">
                  <CardContent className="p-6 space-y-5 text-center">
                    <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Rocket className="h-7 w-7 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">Last step: create your account</h2>
                    <p className="text-muted-foreground text-sm">
                      We'll save your setup and your demo lesson will be waiting in your dashboard.
                    </p>

                    <div className="rounded-xl border border-border bg-muted/30 p-4 text-left space-y-2">
                      <p className="text-sm font-medium text-foreground">Your setup so far:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Name: <span className="text-foreground">{fullName}</span></li>
                        <li>• Language: <span className="text-foreground">{languageTaught}</span></li>
                        <li>• Level: <span className="text-foreground">{level}</span></li>
                        {studentsCount && <li>• Students: <span className="text-foreground">{studentsCount}</span></li>}
                      </ul>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setStep(1)} size="lg">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <Button onClick={goToAuth} className="flex-1" size="lg">
                        Create account <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      14 days free · No credit card required
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
