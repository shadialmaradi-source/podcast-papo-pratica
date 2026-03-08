import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { trackPageView } from "@/lib/analytics";

interface AssignedLesson {
  id: string;
  title: string;
  cefr_level: string;
  topic: string | null;
  status: string;
  youtube_url: string | null;
  lesson_type: string;
  created_at: string;
}

export default function MyLessons() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lessons, setLessons] = useState<AssignedLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackPageView("my_lessons", "student");
    if (!user?.email) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("teacher_lessons")
        .select("id, title, cefr_level, topic, status, youtube_url, lesson_type, created_at")
        .eq("student_email", user.email)
        .in("status", ["ready", "active", "completed", "draft"])
        .order("created_at", { ascending: false });
      if (data) setLessons(data as AssignedLesson[]);
      setLoading(false);
    };
    fetch();
  }, [user]);

  function extractYouTubeVideoId(url: string): string | null {
    let match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="My Lessons" />
      <main className="container mx-auto px-4 py-8 max-w-lg">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/app")}
          className="mb-6 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Home
        </Button>

        <div className="flex items-center gap-2 mb-6">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">My Lessons</h1>
          <Badge variant="secondary" className="ml-auto">{lessons.length}</Badge>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : lessons.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No lessons assigned yet.</p>
            <p className="text-sm text-muted-foreground">Ask your teacher to share a lesson with you.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson) => {
              const ytId = lesson.youtube_url ? extractYouTubeVideoId(lesson.youtube_url) : null;
              return (
                <Card
                  key={lesson.id}
                  className="cursor-pointer border border-border hover:border-primary/50 transition-colors overflow-hidden"
                  onClick={() => navigate(`/lesson/student/${lesson.id}`)}
                >
                  <div className="flex">
                    {ytId && (
                      <div className="w-28 h-20 shrink-0 bg-muted">
                        <img
                          src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="flex-1 px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{lesson.title}</p>
                        {lesson.topic && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{lesson.topic}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {lesson.lesson_type === "youtube" ? "📹 Video" : "📝 Reading"} · {lesson.cefr_level}
                        </p>
                      </div>
                      <Badge
                        variant={lesson.status === "completed" ? "outline" : "default"}
                        className="text-xs capitalize shrink-0"
                      >
                        {lesson.status === "completed" ? "Done" : "Open"}
                      </Badge>
                    </CardContent>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
