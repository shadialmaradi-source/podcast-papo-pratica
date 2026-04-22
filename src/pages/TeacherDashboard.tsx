import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Users, ArrowLeft, Settings, AlertTriangle, Mail, Clock, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { trackEvent, trackTeacherFunnelStep, trackPageLoad, trackPageView } from "@/lib/analytics";
import { canAccessSection } from "@/lib/accessControl";

import { CreateLessonForm } from "@/components/teacher/CreateLessonForm";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { LessonTypeSelector } from "@/components/teacher/LessonTypeSelector";
import { TeacherNotificationBell } from "@/components/teacher/TeacherNotificationBell";
import { YouTubeSourceSelector } from "@/components/teacher/YouTubeSourceSelector";
import { CommunityVideoBrowser } from "@/components/teacher/CommunityVideoBrowser";
import { SpeakingLessonCreator } from "@/components/teacher/SpeakingLessonCreator";
import { useUserRole } from "@/hooks/useUserRole";
import { useTeacherQuota } from "@/hooks/useTeacherQuota";
import { NextBestAction } from "@/components/teacher/NextBestAction";



type FlowStep = "home" | "choose_type" | "form" | "youtube_source" | "youtube_browse" | "speaking_form";
type LessonType = "paragraph" | "youtube" | "speaking";
interface CommunityVideoPrefill {
  title: string;
  language: string;
  difficultyLevel: string;
  category: string | null;
  duration: number | null;
  isShort: boolean;
}



export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { role, loading: roleLoading } = useUserRole();
const { quota, refresh: refreshQuota } = useTeacherQuota();
  const STORAGE_KEY = "teacher_dashboard_flow";

  const [step, setStep] = useState<FlowStep>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved).step ?? "home" : "home";
    } catch { return "home"; }
  });
  const [lessonType, setLessonType] = useState<LessonType>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved).lessonType ?? "paragraph" : "paragraph";
    } catch { return "paragraph"; }
  });
  const [teacherDisplayName, setTeacherDisplayName] = useState<string | null>(null);
  const [prefillYoutubeUrl, setPrefillYoutubeUrl] = useState<string | null>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved).prefillYoutubeUrl ?? null : null;
    } catch { return null; }
  });
  const [prefillVideoMeta, setPrefillVideoMeta] = useState<CommunityVideoPrefill | null>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved).prefillVideoMeta ?? null : null;
    } catch { return null; }
  });
  const [lessonListRefresh, setLessonListRefresh] = useState(0);

  // Sync flow state to sessionStorage
  useEffect(() => {
    if (step === "home") {
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, lessonType, prefillYoutubeUrl, prefillVideoMeta }));
    }
  }, [step, lessonType, prefillYoutubeUrl, prefillVideoMeta]);

  // Redirect non-teachers away; redirect teachers who haven't onboarded
  useEffect(() => {
    trackPageView("teacher_dashboard", "teacher");
    trackPageLoad("teacher_dashboard");
    // Track trial banner view
    if (quota?.isTrialing && !quota.trialExpired) {
      trackEvent("trial_banner_viewed", { days_remaining: quota.trialDaysRemaining });
    }
    if (roleLoading) return;
    if (!canAccessSection("teacher", role, user?.email)) {
      navigate("/app");
      return;
    }
    // Check onboarding status
    if (user) {
      supabase
        .from("teacher_profiles" as any)
        .select("onboarding_completed")
        .eq("teacher_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!data || !(data as any).onboarding_completed) {
            navigate("/teacher/onboarding", { replace: true });
          }
        });
    }
  }, [role, roleLoading, navigate, user, quota]);

  useEffect(() => {
    if (step !== "home" || location.hash !== "#teacher-lessons-section") return;
    const timeout = window.setTimeout(() => {
      document.getElementById("teacher-lessons-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => window.clearTimeout(timeout);
  }, [location.hash, step]);

  useEffect(() => {
    const loadTeacherName = async () => {
      if (!user) return;

      const [teacherProfileRes, profileRes] = await Promise.all([
        supabase
          .from("teacher_profiles" as any)
          .select("full_name")
          .eq("teacher_id", user.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("display_name, full_name, username")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      const teacherFullName = (teacherProfileRes.data as any)?.full_name?.trim();
      const profileDisplayName = (profileRes.data as any)?.display_name?.trim();
      const profileFullName = (profileRes.data as any)?.full_name?.trim();
      const profileUsername = (profileRes.data as any)?.username?.trim();

      const fallback = user.email?.split("@")[0] || "Teacher";
      setTeacherDisplayName(teacherFullName || profileDisplayName || profileFullName || profileUsername || fallback);
    };

    loadTeacherName();
  }, [user]);

  const getHeaderCopy = () => {
    switch (step) {
      case "home":
        return {
          title: `Welcome back, ${teacherDisplayName || user?.email?.split("@")[0] || "Teacher"}!`,
          subtitle: "Choose your next action to create lessons or manage students.",
        };
      case "choose_type":
        return {
          title: "What would you like to create?",
          subtitle: "Pick the fastest path to your next student-ready lesson.",
        };
      case "youtube_source":
        return {
          title: "Start your video lesson",
          subtitle: "Choose whether to use a new link or reuse a community video.",
        };
      case "youtube_browse":
        return {
          title: "Reuse a community video",
          subtitle: "Select a ready video and continue creating in one click.",
        };
      case "speaking_form":
        return {
          title: "Create speaking practice",
          subtitle: "Configure topic, level, and prompts for a conversation-focused lesson.",
        };
      case "form":
        return lessonType === "paragraph"
          ? {
              title: "Create a custom paragraph lesson",
              subtitle: "Generate a paragraph, choose exercises, and assign it to a student.",
            }
          : {
              title: "Create a YouTube lesson",
              subtitle: "Finalize lesson settings and assign this video to your student.",
            };
      default:
        return {
          title: "Teacher Dashboard",
          subtitle: "Manage your interactive lessons from here.",
        };
    }
  };

  const { title: headerTitle, subtitle: headerSubtitle } = getHeaderCopy();

  const handleCreated = (lessonId: string) => {
    refreshQuota();
    sessionStorage.removeItem(STORAGE_KEY);
    navigate(`/teacher/lesson/${lessonId}`);
  };

  const handleSelectType = (type: LessonType) => {
    setLessonType(type);
    if (type === "youtube") {
      setStep("youtube_source");
    } else if (type === "speaking") {
      setStep("speaking_form");
    } else {
      setPrefillYoutubeUrl(null);
      setPrefillVideoMeta(null);
      setStep("form");
    }
  };

  const handleYoutubeSource = (source: "scratch" | "community") => {
    if (source === "scratch") {
      setPrefillYoutubeUrl(null);
      setPrefillVideoMeta(null);
      setStep("form");
    } else {
      setStep("youtube_browse");
    }
  };

  const handleCommunityVideoSelected = (selection: {
    youtubeUrl: string;
    title: string;
    language: string;
    difficultyLevel: string;
    category: string | null;
    duration: number | null;
    isShort: boolean;
  }) => {
    setPrefillYoutubeUrl(selection.youtubeUrl);
    setPrefillVideoMeta({
      title: selection.title,
      language: selection.language,
      difficultyLevel: selection.difficultyLevel,
      category: selection.category,
      duration: selection.duration,
      isShort: selection.isShort,
    });
    setStep("form");
  };

  const handleBack = () => {
    if (step === "form" && lessonType === "youtube") setStep("youtube_source");
    else if (step === "form") setStep("choose_type");
    else if (step === "youtube_browse") setStep("youtube_source");
    else if (step === "youtube_source") setStep("choose_type");
    else if (step === "speaking_form") setStep("choose_type");
    else setStep("home");
  };

  const resendVerificationEmail = async () => {
    const { error } = await supabase.auth.resend({ type: 'signup', email: user?.email || '' });
    if (!error) {
      trackEvent("verification_email_resent", { source: "dashboard" });
      toast({ title: "Verification email sent!", description: "Check your inbox." });
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

const getNextBestAction = (): {
  title: string;
  description: string;
  ctaLabel: string;
  action: "verify_email" | "fix_payment" | "upgrade_plan" | "create_lesson";
  onClick: () => void | Promise<void>;
  variant?: "default" | "outline" | "destructive";
} | null => {
  if (!quota) return null;

  if (!quota.emailVerified) {
    return {
      title: "Verify your email",
      description: "Email verification is required before creating lessons.",
      ctaLabel: "Resend Email",
      action: "verify_email",
      onClick: resendVerificationEmail,
      variant: "outline",
    };
  }

  if (quota.status === "past_due") {
    return {
      title: "Fix your subscription payment",
      description: "Lesson creation is paused until payment is updated.",
      ctaLabel: "Update Payment",
      action: "fix_payment",
      onClick: () => navigate("/teacher/pricing"),
      variant: "destructive",
    };
  }

  if (quota.trialExpired || !quota.canCreateLesson) {
    return {
      title: "Upgrade to keep creating lessons",
      description: "You’ve hit a plan/trial limit. Upgrade to continue.",
      ctaLabel: "View Plans",
      action: "upgrade_plan",
      onClick: () => navigate("/teacher/pricing"),
      variant: "outline",
    };
  }

  return {
    title: "Create your next lesson",
    description: "Start a new lesson from paragraph, YouTube, or speaking.",
    ctaLabel: "Create Lesson",
    action: "create_lesson",
    onClick: () => setStep("choose_type"),
    variant: "default",
  };
};

const nextBestAction = getNextBestAction();

if (roleLoading) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-5 w-80 mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-px w-full mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </main>
    </div>
  );
}

return (
  <div className="min-h-screen bg-background">
    <header className="border-b border-border bg-card">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          {step !== "home" && (
            <Button variant="ghost" size="icon" onClick={handleBack} className="mr-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">{headerTitle}</h1>
        </div>

        <div className="flex items-center gap-1">
          <TeacherNotificationBell />
          <Button variant="ghost" size="icon" onClick={() => navigate("/teacher/settings")}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>

    <main className="container mx-auto px-4 py-8 max-w-2xl">


        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">{headerTitle}</h2>
          <p className="text-muted-foreground mt-1">{headerSubtitle}</p>
        </div>

        {step === "home" && (
          <>
            {nextBestAction && (
              <Card className="mb-6 border-border/60">
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{nextBestAction.title}</p>
                    <p className="text-sm text-muted-foreground">{nextBestAction.description}</p>
                  </div>
                  <Button
                    variant={nextBestAction.variant || "default"}
                    size="sm"
                    onClick={async () => {
                      trackTeacherFunnelStep("dashboard_next_action_clicked", {
                        action: nextBestAction.action,
                        source: "teacher_dashboard_next_best_action",
                        surface: "next_best_action_card",
                        cta_label: nextBestAction.ctaLabel,
                      });
                      await nextBestAction.onClick();
                    }}
                  >
                    {nextBestAction.ctaLabel}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* 1. Email verification warning — most critical */}
            {quota && !quota.emailVerified && (
              <Card className="mb-6 border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="flex items-center gap-3 py-4">
                  <Mail className="h-5 w-5 text-yellow-600 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-700 dark:text-yellow-400">📧 Verify your email to start creating lessons</p>
                    <p className="text-sm text-muted-foreground">
                      Check your inbox for a verification link from ListenFlow.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={resendVerificationEmail}>
                    Resend Email
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* 2. Trial active banner */}
            {quota?.isTrialing && !quota.trialExpired && (
              <Card className="mb-6 border-primary/30 bg-primary/5">
                <CardContent className="flex items-center gap-3 py-4">
                  <Sparkles className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">🎉 Free Trial Active</p>
                    <p className="text-sm text-muted-foreground">
                      {quota.trialDaysRemaining} day{quota.trialDaysRemaining !== 1 ? 's' : ''} remaining • Create up to 30 lessons during your trial
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You've created {quota.lessonsUsed} {quota.lessonsUsed === 1 ? 'lesson' : 'lessons'} so far
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    trackEvent("trial_upgrade_clicked", { source: "dashboard_banner", days_remaining: quota.trialDaysRemaining });
                    navigate("/teacher/pricing");
                  }}>
                    View Plans
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* 3. Trial urgency — last 3 days */}
            {quota?.isTrialing && !quota.trialExpired && quota.trialDaysRemaining <= 3 && quota.trialDaysRemaining > 0 && (
              <Card className="mb-6 border-amber-500/40 bg-amber-500/5">
                <CardContent className="flex items-center gap-3 py-4">
                  <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-700 dark:text-amber-400">
                      ⏰ Trial ending in {quota.trialDaysRemaining} {quota.trialDaysRemaining === 1 ? 'day' : 'days'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Upgrade now to keep creating lessons. Your {quota.lessonsUsed} existing lessons will stay active.
                    </p>
                  </div>
                  <Button variant="default" size="sm" onClick={() => {
                    trackEvent("trial_upgrade_clicked", { source: "urgency_banner", days_remaining: quota.trialDaysRemaining });
                    navigate("/teacher/pricing");
                  }}>
                    Upgrade Now
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* 4. Trial expired banner */}
            {quota?.trialExpired && (
              <Card className="mb-6 border-destructive bg-destructive/5">
                <CardContent className="flex items-center gap-3 py-4">
                  <Clock className="h-5 w-5 text-destructive shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-destructive">⏰ Trial Expired</p>
                    <p className="text-sm text-muted-foreground">
                      Your 14-day free trial has ended. Upgrade to continue creating lessons.
                    </p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => {
                    trackEvent("trial_upgrade_clicked", { source: "expired_banner", days_remaining: 0 });
                    navigate("/teacher/pricing");
                  }}>
                    Upgrade Now
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* 5. Payment failure banner */}
            {quota?.status === "past_due" && (
              <Card className="mb-6 border-destructive bg-destructive/5">
                <CardContent className="flex items-center gap-3 py-4">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-destructive">Payment failed</p>
                    <p className="text-sm text-muted-foreground">
                      Your last payment didn't go through. Lesson creation is paused until this is resolved.
                    </p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => navigate("/teacher/pricing")}>
                    Update Payment
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quota Indicator */}
            {quota && (
              <div className="mb-6 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Lessons this month: <span className="font-semibold text-foreground">{quota.lessonsUsed}/{quota.lessonsLimit}</span>
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {quota.isTrialing ? "Trial (Pro limits)" : `${quota.plan} plan`}
                  </span>
                </div>
                <Progress value={(quota.lessonsUsed / quota.lessonsLimit) * 100} className="h-2" />
                {!quota.canCreateLesson && quota.status !== "past_due" && !quota.trialExpired && quota.emailVerified && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>You've reached your monthly lesson limit.</span>
                    <Button variant="link" size="sm" className="p-0 h-auto text-destructive underline" onClick={() => navigate("/teacher/pricing")}>
                      Upgrade
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Next Best Action */}
            <NextBestAction
              teacherId={user?.id || ""}
              quota={quota}
              onNavigate={navigate}
              onCreateLesson={() => quota?.canCreateLesson && setStep("choose_type")}
            />

            {/* Hero Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <Card
                className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${!quota?.canCreateLesson ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => {
                  if (!quota?.canCreateLesson) return;
                  trackTeacherFunnelStep("dashboard_next_action_clicked", {
                    action: "create_lesson",
                    source: "teacher_dashboard_home",
                    surface: "hero_card",
                    cta_label: "Create a Lesson",
                  });
                  setStep("choose_type");
                }}
              >
                <CardContent className="flex flex-col items-center text-center gap-3 p-8">
                  <BookOpen className="h-12 w-12 text-primary" />
                  <div>
                    <p className="text-lg font-semibold text-foreground">Create a Lesson</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Build exercises from paragraphs or videos
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                onClick={() => {
                  trackTeacherFunnelStep("dashboard_next_action_clicked", {
                    action: "open_students",
                    source: "teacher_dashboard_home",
                    surface: "hero_card",
                    cta_label: "My Students",
                  });
                  navigate("/teacher/students");
                }}
              >
                <CardContent className="flex flex-col items-center text-center gap-3 p-8">
                  <Users className="h-12 w-12 text-primary" />
                  <div>
                    <p className="text-lg font-semibold text-foreground">My Students</p>
                    <p className="text-sm text-muted-foreground mt-1">Manage your students</p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer transition-all hover:border-primary hover:shadow-md sm:col-span-2"
                onClick={() => {
                  trackTeacherFunnelStep("dashboard_next_action_clicked", {
                    action: "open_lessons",
                    source: "teacher_dashboard_home",
                    surface: "hero_card",
                    cta_label: "Your Lessons",
                  });
                  navigate("/teacher/lessons");
                }}
              >
                <CardContent className="flex flex-col items-center text-center gap-3 p-8">
                  <BookOpen className="h-12 w-12 text-primary" />
                  <div>
                    <p className="text-lg font-semibold text-foreground">Your Lessons</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      View, resume, and manage every lesson you've created
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {step === "choose_type" && (
          <LessonTypeSelector onSelect={handleSelectType} />
        )}

        {step === "youtube_source" && (
          <YouTubeSourceSelector onSelect={handleYoutubeSource} />
        )}

        {step === "youtube_browse" && (
          <CommunityVideoBrowser onSelectVideo={handleCommunityVideoSelected} />
        )}

        {step === "form" && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Card>
              <CardContent className="pt-6">
                <CreateLessonForm
                  lessonType={lessonType as "paragraph" | "youtube"}
                  onCreated={handleCreated}
                  onCancel={handleBack}
                  prefillYoutubeUrl={prefillYoutubeUrl ?? undefined}
                  prefillYoutubeTitle={prefillVideoMeta?.title}
                  prefillYoutubeLanguage={prefillVideoMeta?.language}
                  prefillYoutubeDifficulty={prefillVideoMeta?.difficultyLevel}
                  prefillYoutubeCategory={prefillVideoMeta?.category}
                  maxVideoMinutes={quota?.maxVideoMinutes}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {step === "speaking_form" && (
          <Card>
            <CardContent className="pt-6">
              <SpeakingLessonCreator
                onCancel={handleBack}
                onCreated={handleCreated}
              />
            </CardContent>
          </Card>
        )}
      </main>
      <TeacherNav />
    </div>
  );
}
