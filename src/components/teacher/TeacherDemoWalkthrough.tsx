import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DemoTooltip } from "./DemoTooltip";
import {
  Plus, FileText, Youtube, Link, Globe, Sparkles, Copy, Check,
  ArrowRight, BookOpen, Users, Loader2, PartyPopper
} from "lucide-react";

interface TeacherDemoWalkthroughProps {
  onComplete: () => void;
  onSkip: () => void;
}

const TOTAL_STEPS = 7;

export function TeacherDemoWalkthrough({ onComplete, onSkip }: TeacherDemoWalkthroughProps) {
  const [step, setStep] = useState(0);
  const [fakeLoading, setFakeLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));

  // Step 4: fake loading effect
  useEffect(() => {
    if (step === 4) {
      setFakeLoading(true);
      const timer = setTimeout(() => {
        setFakeLoading(false);
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleSkip = () => {
    localStorage.setItem("teacher_demo_completed", "true");
    onSkip();
  };

  const handleComplete = () => {
    localStorage.setItem("teacher_demo_completed", "true");
    onComplete();
  };

  return (
    <div className="w-full max-w-2xl mx-auto relative min-h-[420px]">
      <AnimatePresence mode="wait">
        {/* STEP 0: Fake Dashboard */}
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">Your Dashboard</h2>
                <Badge variant="outline" className="text-xs">DEMO</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Card className="opacity-50 pointer-events-none">
                  <CardContent className="flex flex-col items-center gap-2 p-5">
                    <Users className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">My Students</span>
                    <span className="text-2xl font-bold text-foreground">1</span>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer border-primary border-2 shadow-lg hover:shadow-xl transition-shadow relative"
                  onClick={next}
                >
                  <CardContent className="flex flex-col items-center gap-2 p-5">
                    <Plus className="h-8 w-8 text-primary" />
                    <span className="text-sm font-semibold text-primary">Create a Lesson</span>
                  </CardContent>
                </Card>
              </div>

              <Card className="opacity-50 pointer-events-none">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Recent Lessons</p>
                      <p className="text-xs text-muted-foreground">No lessons yet</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DemoTooltip
              step={0}
              totalSteps={TOTAL_STEPS}
              title="Welcome to your dashboard! 🎉"
              description="This is where you manage everything. Tap 'Create a Lesson' to start!"
              position="top"
              onSkip={handleSkip}
            />
          </motion.div>
        )}

        {/* STEP 1: Lesson Type */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Choose Lesson Type</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="opacity-50 pointer-events-none">
                  <CardContent className="flex flex-col items-center text-center gap-3 p-6">
                    <FileText className="h-10 w-10 text-muted-foreground" />
                    <div>
                      <p className="font-semibold text-foreground">Custom Paragraph</p>
                      <p className="text-sm text-muted-foreground mt-1">Generate a paragraph with AI</p>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer border-primary border-2 shadow-lg hover:shadow-xl transition-shadow"
                  onClick={next}
                >
                  <CardContent className="flex flex-col items-center text-center gap-3 p-6">
                    <Youtube className="h-10 w-10 text-primary" />
                    <div>
                      <p className="font-semibold text-primary">YouTube / Video Link</p>
                      <p className="text-sm text-muted-foreground mt-1">Build exercises from a video</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <DemoTooltip
              step={1}
              totalSteps={TOTAL_STEPS}
              title="Choose lesson type"
              description="You can create lessons from AI paragraphs or YouTube videos. Let's try YouTube!"
              position="top"
              onSkip={handleSkip}
            />
          </motion.div>
        )}

        {/* STEP 2: YouTube Source */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Choose Video Source</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="opacity-50 pointer-events-none">
                  <CardContent className="flex flex-col items-center text-center gap-3 p-6">
                    <Link className="h-10 w-10 text-muted-foreground" />
                    <div>
                      <p className="font-semibold text-foreground">From Scratch</p>
                      <p className="text-sm text-muted-foreground mt-1">Paste a YouTube URL</p>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer border-primary border-2 shadow-lg hover:shadow-xl transition-shadow"
                  onClick={next}
                >
                  <CardContent className="flex flex-col items-center text-center gap-3 p-6">
                    <Globe className="h-10 w-10 text-primary" />
                    <div>
                      <p className="font-semibold text-primary">From Community</p>
                      <p className="text-sm text-muted-foreground mt-1">Browse our video library</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <DemoTooltip
              step={2}
              totalSteps={TOTAL_STEPS}
              title="Pick a video source"
              description="You can paste any YouTube URL or pick from our curated library. Let's browse the community!"
              position="top"
              onSkip={handleSkip}
            />
          </motion.div>
        )}

        {/* STEP 3: Pre-filled form */}
        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Configure your lesson</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">YouTube URL</Label>
                  <Input value="https://youtube.com/watch?v=demo123" readOnly className="bg-muted" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Level</Label>
                    <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm items-center">
                      B1
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Language</Label>
                    <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm items-center">
                      Italian
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Exercise types</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Multiple Choice", "Fill in the Blank", "True/False"].map((t) => (
                      <Badge key={t} variant="default" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                </div>
                <Button className="w-full" onClick={next}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create Lesson
                </Button>
              </CardContent>
            </Card>

            <DemoTooltip
              step={3}
              totalSteps={TOTAL_STEPS}
              title="Configure & create ✨"
              description="Set the level, language, and exercise types. We've pre-filled this for you. Hit 'Create Lesson'!"
              position="top"
              onSkip={handleSkip}
            />
          </motion.div>
        )}

        {/* STEP 4: Fake generation */}
        {step === 4 && (
          <motion.div key="s4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
                {fakeLoading ? (
                  <>
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">AI is generating exercises...</p>
                  </>
                ) : (
                  <>
                    <div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center">
                      <Check className="h-7 w-7 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-foreground">Lesson ready! 🎉</p>
                      <p className="text-sm text-muted-foreground mt-1">3 exercises generated automatically</p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {["Multiple Choice", "Fill in the Blank", "True/False"].map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                    <Button onClick={next} className="mt-2">
                      See share link
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {!fakeLoading && (
              <DemoTooltip
                step={4}
                totalSteps={TOTAL_STEPS}
                title="Exercises generated! 🤖"
                description="AI created exercises from the video transcript. Now let's share it with your student."
                position="top"
                onSkip={handleSkip}
              />
            )}
          </motion.div>
        )}

        {/* STEP 5: Share link */}
        {step === 5 && (
          <motion.div key="s5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  Share with your student
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value="https://listenflow.lovable.app/lesson/demo-abc123"
                    readOnly
                    className="bg-muted text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setCopied(true);
                      setTimeout(() => {
                        setCopied(false);
                        next();
                      }, 1200);
                    }}
                  >
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Send this link to your student. They open it, watch the video, and complete the exercises — no account needed.
                </p>
              </CardContent>
            </Card>

            <DemoTooltip
              step={5}
              totalSteps={TOTAL_STEPS}
              title="Share the link! 🔗"
              description="Copy this link and send it to your student via email or WhatsApp. That's it!"
              actionLabel="Copy link"
              onAction={() => {
                setCopied(true);
                setTimeout(() => {
                  setCopied(false);
                  next();
                }, 1200);
              }}
              position="top"
              onSkip={handleSkip}
            />
          </motion.div>
        )}

        {/* STEP 6: Celebration */}
        {step === 6 && (
          <motion.div key="s6" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <Card className="border-primary/30 shadow-2xl">
              <CardContent className="flex flex-col items-center text-center gap-5 py-12 px-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <PartyPopper className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">You're all set! 🎉</h3>
                  <p className="text-muted-foreground mt-2 max-w-sm">
                    You just saw how easy it is to create and share a lesson. Now let's do it for real!
                  </p>
                </div>

                <div className="flex flex-col gap-2 w-full max-w-xs">
                  <Button onClick={handleComplete} size="lg" className="w-full">
                    Go to my dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
