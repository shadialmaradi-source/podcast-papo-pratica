import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { BookOpen, LogOut, Users, ArrowLeft } from "lucide-react";
import { CreateLessonForm } from "@/components/teacher/CreateLessonForm";
import { LessonTypeSelector } from "@/components/teacher/LessonTypeSelector";
import { LessonList } from "@/components/teacher/LessonList";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

type FlowStep = "home" | "choose_type" | "form";
type LessonType = "paragraph" | "youtube";

export default function TeacherDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [step, setStep] = useState<FlowStep>("home");
  const [lessonType, setLessonType] = useState<LessonType>("paragraph");
  const [refresh, setRefresh] = useState(0);

  // Auto-correct: if user is on teacher dashboard but has student role
  useEffect(() => {
    if (!roleLoading && role === "student" && user?.id) {
      supabase
        .from("user_roles" as any)
        .upsert({ user_id: user.id, role: "teacher" } as any, { onConflict: "user_id" })
        .then(() => {
          window.location.reload();
        });
    }
  }, [role, roleLoading, user?.id]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleCreated = (lessonId: string) => {
    setStep("home");
    setRefresh((r) => r + 1);
    navigate(`/teacher/lesson/${lessonId}`);
  };

  const handleSelectType = (type: LessonType) => {
    setLessonType(type);
    setStep("form");
  };

  const handleBack = () => {
    if (step === "form") setStep("choose_type");
    else setStep("home");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Teacher Dashboard</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
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

              <Card className="opacity-60">
                <CardContent className="flex flex-col items-center text-center gap-3 p-8">
                  <Users className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-semibold text-foreground">My Students</p>
                    <p className="text-sm text-muted-foreground mt-1">Coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator className="mb-6" />

            {/* Lesson List */}
            <LessonList refresh={refresh} />
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
                />
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
