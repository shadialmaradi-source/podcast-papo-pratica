import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { BookOpen, Users, ArrowLeft, Settings, AlertTriangle, Mail, Clock, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { CreateLessonForm } from "@/components/teacher/CreateLessonForm";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { LessonTypeSelector } from "@/components/teacher/LessonTypeSelector";
import { TeacherNotificationBell } from "@/components/teacher/TeacherNotificationBell";
import { YouTubeSourceSelector } from "@/components/teacher/YouTubeSourceSelector";
import { CommunityVideoBrowser } from "@/components/teacher/CommunityVideoBrowser";
import { SpeakingLessonCreator } from "@/components/teacher/SpeakingLessonCreator";
import { useUserRole } from "@/hooks/useUserRole";
import { useTeacherQuota } from "@/hooks/useTeacherQuota";
import { trackPageLoad, trackPageView } from "@/lib/analytics";


type FlowStep = "home" | "choose_type" | "form" | "youtube_source" | "youtube_browse" | "speaking_form";
type LessonType = "paragraph" | "youtube" | "speaking";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const { quota, loading: quotaLoading, refresh: refreshQuota } = useTeacherQuota();
  const [step, setStep] = useState<FlowStep>("home");
  const [lessonType, setLessonType] = useState<LessonType>("paragraph");
  const [refresh, setRefresh] = useState(0);
  const [prefillYoutubeUrl, setPrefillYoutubeUrl] = useState<string | null>(null);

  // Redirect non-teachers away; redirect teachers who haven't onboarded
  useEffect(() => {
    trackPageView("teacher_dashboard", "teacher");
    trackPageLoad("teacher_dashboard");
    if (roleLoading) return;
    if (role !== "teacher") {
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
  }, [role, roleLoading, navigate, user]);


  const handleCreated = (_lessonId: string) => {
    setRefresh((r) => r + 1);
    refreshQuota();
  };

  const handleSelectType = (type: LessonType) => {
    setLessonType(type);
    if (type === "youtube") {
      setStep("youtube_source");
    } else if (type === "speaking") {
      setStep("speaking_form");
    } else {
      setPrefillYoutubeUrl(null);
      setStep("form");
    }
  };

  const handleYoutubeSource = (source: "scratch" | "community") => {
    if (source === "scratch") {
      setPrefillYoutubeUrl(null);
      setStep("form");
    } else {
      setStep("youtube_browse");
    }
  };

  const handleCommunityVideoSelected = (url: string) => {
    setPrefillYoutubeUrl(url);
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
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Teacher Dashboard</h1>
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
          <h2 className="text-2xl font-bold text-foreground">
            Welcome, {user?.email?.split("@")[0]}!
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage your interactive lessons from here.
          </p>
        </div>

        {step === "home" && (
          <>
            {/* Payment failure banner */}
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
                  <span className="text-xs text-muted-foreground capitalize">{quota.plan} plan</span>
                </div>
                <Progress value={(quota.lessonsUsed / quota.lessonsLimit) * 100} className="h-2" />
                {!quota.canCreateLesson && quota.status !== "past_due" && (
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

            {/* Hero Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <Card
                className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${!quota?.canCreateLesson ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => quota?.canCreateLesson && setStep("choose_type")}
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
                onClick={() => navigate("/teacher/students")}
              >
                <CardContent className="flex flex-col items-center text-center gap-3 p-8">
                  <Users className="h-12 w-12 text-primary" />
                  <div>
                    <p className="text-lg font-semibold text-foreground">My Students</p>
                    <p className="text-sm text-muted-foreground mt-1">Manage your students</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {step === "choose_type" && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <LessonTypeSelector onSelect={handleSelectType} />
          </div>
        )}

        {step === "youtube_source" && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <YouTubeSourceSelector onSelect={handleYoutubeSource} />
          </div>
        )}

        {step === "youtube_browse" && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <CommunityVideoBrowser onSelectVideo={handleCommunityVideoSelected} />
          </div>
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
