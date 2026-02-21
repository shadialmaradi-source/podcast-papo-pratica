import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExercisePresenter } from "@/components/teacher/ExercisePresenter";
import { ArrowLeft, User, BookOpen, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Lesson {
  id: string;
  title: string;
  student_email: string | null;
  cefr_level: string;
  topic: string | null;
  status: string;
}

interface Exercise {
  id: string;
  exercise_type: string;
  content: any;
  order_index: number;
}

export default function TeacherLesson() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!id || !user) return;

    const fetchData = async () => {
      setLoading(true);

      const [lessonRes, exercisesRes] = await Promise.all([
        supabase
          .from("teacher_lessons")
          .select("id, title, student_email, cefr_level, topic, status")
          .eq("id", id)
          .eq("teacher_id", user.id)
          .single(),
        supabase
          .from("lesson_exercises")
          .select("id, exercise_type, content, order_index")
          .eq("lesson_id", id)
          .order("order_index"),
      ]);

      if (lessonRes.data) setLesson(lessonRes.data as Lesson);
      if (exercisesRes.data) setExercises(exercisesRes.data as Exercise[]);
      setLoading(false);

      // Transition to active if still ready
      if (lessonRes.data?.status === "ready") {
        await supabase
          .from("teacher_lessons")
          .update({ status: "active" })
          .eq("id", id);
      }
    };

    fetchData();
  }, [id, user]);

  const handleComplete = async () => {
    if (!id) return;
    setCompleting(true);
    await supabase
      .from("teacher_lessons")
      .update({ status: "completed" })
      .eq("id", id);
    setCompleting(false);
    setDone(true);
    toast({ title: "Lesson completed!", description: "Great session. The lesson has been marked as complete." });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card px-4 py-4">
          <Skeleton className="h-6 w-48" />
        </header>
        <main className="container mx-auto max-w-2xl px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </main>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Lesson not found.</p>
          <Button variant="outline" onClick={() => navigate("/teacher")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 max-w-2xl">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/teacher")}
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Dashboard
            </Button>
          </div>
          <Badge variant="outline" className="capitalize">{lesson.status}</Badge>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        {/* Lesson meta */}
        <div>
          <div className="flex items-start gap-2 mb-2">
            <BookOpen className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <h1 className="text-2xl font-bold text-foreground">{lesson.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground ml-7">
            <Badge variant="outline" className="text-xs">{lesson.cefr_level}</Badge>
            {lesson.topic && <span>· {lesson.topic}</span>}
            {lesson.student_email && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {lesson.student_email}
              </span>
            )}
          </div>
        </div>

        {/* Completed state */}
        {done || lesson.status === "completed" ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4">
            <CheckCircle className="mx-auto h-12 w-12 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Lesson Complete!</h2>
            <p className="text-muted-foreground">This lesson has been marked as completed.</p>
            <Button onClick={() => navigate("/teacher")}>Back to Dashboard</Button>
          </div>
        ) : exercises.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">No exercises found. Generate exercises first.</p>
            <Button className="mt-4" variant="outline" onClick={() => navigate("/teacher")}>
              Back to Dashboard
            </Button>
          </div>
        ) : (
          <ExercisePresenter
            exercises={exercises}
            lessonTitle={lesson.title}
            lessonId={lesson.id}
            onComplete={handleComplete}
          />
        )}
      </main>
    </div>
  );
}
