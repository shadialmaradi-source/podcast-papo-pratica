import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Settings } from "lucide-react";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { TeacherNotificationBell } from "@/components/teacher/TeacherNotificationBell";
import { LessonList } from "@/components/teacher/LessonList";
import { trackPageView, trackPageLoad } from "@/lib/analytics";

export default function TeacherLessons() {
  const navigate = useNavigate();
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    trackPageView("teacher_lessons", "teacher");
    trackPageLoad("teacher_lessons");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/teacher")} className="mr-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Your lessons</h1>
          </div>

          <div className="flex items-center gap-1">
            <TeacherNotificationBell />
            <Button variant="ghost" size="icon" onClick={() => navigate("/teacher/settings")}>
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl pb-24">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Your lessons</h2>
            <p className="text-muted-foreground mt-1">
              Manage, resume, and review every lesson you've created.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setRefresh((p) => p + 1)}>
            Refresh
          </Button>
        </div>

        <LessonList refresh={refresh} />
      </main>
      <TeacherNav />
    </div>
  );
}
