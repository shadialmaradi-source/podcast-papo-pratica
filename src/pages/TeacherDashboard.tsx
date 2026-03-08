import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { BookOpen, Users, ArrowLeft, Settings } from "lucide-react";
import { CreateLessonForm } from "@/components/teacher/CreateLessonForm";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { LessonTypeSelector } from "@/components/teacher/LessonTypeSelector";
import { YouTubeSourceSelector } from "@/components/teacher/YouTubeSourceSelector";
import { CommunityVideoBrowser } from "@/components/teacher/CommunityVideoBrowser";
import { useUserRole } from "@/hooks/useUserRole";
import { trackPageLoad, trackPageView } from "@/lib/analytics";


type FlowStep = "home" | "choose_type" | "form" | "youtube_source" | "youtube_browse";
type LessonType = "paragraph" | "youtube";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
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
    // Stay on the form page — the inline result is shown in CreateLessonForm
    setRefresh((r) => r + 1);
  };

  const handleSelectType = (type: LessonType) => {
    setLessonType(type);
    if (type === "youtube") {
      setStep("youtube_source");
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
          <Button variant="ghost" size="icon" onClick={() => navigate("/teacher/settings")}>
            <Settings className="h-5 w-5" />
          </Button>
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
            {/* Hero Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <Card
                className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                onClick={() => setStep("choose_type")}
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
                  lessonType={lessonType}
                  onCreated={handleCreated}
                  onCancel={handleBack}
                  prefillYoutubeUrl={prefillYoutubeUrl ?? undefined}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <TeacherNav />
    </div>
  );
}
