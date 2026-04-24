import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BookOpen, User, Sparkles, Loader2, ChevronDown, ChevronUp, Play, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ReuseLessonModal, type ReuseSourceLesson } from "@/components/teacher/ReuseLessonModal";

interface Exercise {
  id: string;
  exercise_type: string;
  content: any;
  order_index: number;
}

interface Lesson {
  id: string;
  title: string;
  student_email: string | null;
  cefr_level: string;
  topic: string | null;
  status: string;
  exercise_types: string[];
  created_at: string;
  language: string | null;
  translation_language: string | null;
  lesson_type: string | null;
  youtube_url: string | null;
  paragraph_prompt: string | null;
  paragraph_content: string | null;
  transcript: string | null;
}

interface LessonListProps {
  refresh: number;
}

const PAGE_SIZE = 20;

const STATUS_VARIANT: Record<string, "secondary" | "default" | "outline" | "destructive"> = {
  draft: "secondary",
  ready: "default",
  active: "default",
  completed: "outline",
};

const EXERCISE_TYPE_LABELS: Record<string, string> = {
  fill_in_blank: "Fill in the Blank",
  multiple_choice: "Quiz",
  image_discussion: "Image Discussion",
  role_play: "Role-play",
  spot_the_mistake: "Spot the Mistake",
};

function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const c = exercise.content;
  const label = EXERCISE_TYPE_LABELS[exercise.exercise_type] || exercise.exercise_type;

  return (
    <div className="rounded-md border border-border bg-muted/40 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs capitalize">{label}</Badge>
      </div>

      {exercise.exercise_type === "fill_in_blank" && (
        <>
          <p className="text-sm font-medium">{c.sentence}</p>
          <p className="text-xs text-muted-foreground">Answer: <span className="text-foreground font-semibold">{c.answer}</span></p>
          {c.hint && <p className="text-xs text-muted-foreground">Hint: {c.hint}</p>}
        </>
      )}

      {exercise.exercise_type === "multiple_choice" && (
        <>
          <p className="text-sm font-medium">{c.question}</p>
          <ul className="text-xs space-y-1">
            {(c.options || []).map((opt: string, i: number) => {
              const letter = ["A", "B", "C", "D"][i];
              return (
                <li key={i} className={letter === c.correct ? "text-primary font-semibold" : "text-muted-foreground"}>
                  {letter}. {opt} {letter === c.correct && "✓"}
                </li>
              );
            })}
          </ul>
          {c.explanation && <p className="text-xs text-muted-foreground">{c.explanation}</p>}
        </>
      )}

      {exercise.exercise_type === "image_discussion" && (
        <>
          <p className="text-sm font-medium text-muted-foreground italic">{c.prompt}</p>
          <ul className="text-xs space-y-1">
            {(c.discussion_questions || []).map((q: string, i: number) => (
              <li key={i} className="text-foreground">• {q}</li>
            ))}
          </ul>
          {c.vocabulary?.length > 0 && (
            <p className="text-xs text-muted-foreground">Vocab: {c.vocabulary.join(", ")}</p>
          )}
        </>
      )}

      {exercise.exercise_type === "role_play" && (
        <>
          <p className="text-sm font-medium">{c.scenario}</p>
          <p className="text-xs text-muted-foreground">Teacher: <span className="text-foreground">{c.teacher_role}</span></p>
          <p className="text-xs text-muted-foreground">Student: <span className="text-foreground">{c.student_role}</span></p>
          {c.starter && <p className="text-xs italic text-muted-foreground">Starter: "{c.starter}"</p>}
          {c.useful_phrases?.length > 0 && (
            <p className="text-xs text-muted-foreground">Phrases: {c.useful_phrases.join(" · ")}</p>
          )}
        </>
      )}

      {exercise.exercise_type === "spot_the_mistake" && (
        <>
          <p className="text-sm font-medium">{c.instruction}</p>
          <p className="text-sm line-through text-destructive/70">{c.sentence}</p>
          <p className="text-sm text-primary font-semibold">{c.corrected}</p>
          {c.explanation && <p className="text-xs text-muted-foreground">{c.explanation}</p>}
        </>
      )}
    </div>
  );
}

export function LessonList({ refresh }: LessonListProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [exercises, setExercises] = useState<Record<string, Exercise[]>>({});
  const [reuseSource, setReuseSource] = useState<ReuseSourceLesson | null>(null);

  const fetchLessons = async () => {
    if (!user) return;
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await supabase
      .from("teacher_lessons")
      .select("id, title, student_email, cefr_level, topic, status, exercise_types, created_at, language, translation_language, lesson_type, youtube_url, paragraph_prompt, paragraph_content, transcript", { count: "exact" })
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!error && data) setLessons(data as Lesson[]);
    setTotalCount(count || 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchLessons();
  }, [user, refresh, page]);

  const handleGenerate = async (lessonId: string) => {
    setGenerating(lessonId);
    try {
      // Find the lesson to get its exercise types
      const lesson = lessons.find(l => l.id === lessonId);
      const exerciseTypes: string[] = (lesson?.exercise_types || []).filter(
        (t: string) => t !== "image_discussion"
      );

      // Use the modern by-type function for each exercise type
      let totalCount = 0;
      for (const exerciseType of exerciseTypes) {
        const { data, error } = await supabase.functions.invoke(
          "generate-lesson-exercises-by-type",
          { body: { lessonId, exerciseType } }
        );
        if (error) throw new Error(error.message || "Generation failed");
        if (data?.error) throw new Error(data.error);
        totalCount += data?.count || 0;
      }

      // If no specific types, invoke once with no type to trigger default behavior
      if (exerciseTypes.length === 0) {
        const { data, error } = await supabase.functions.invoke(
          "generate-lesson-exercises-by-type",
          { body: { lessonId, exerciseType: "multiple_choice" } }
        );
        if (error) throw new Error(error.message || "Generation failed");
        if (data?.error) throw new Error(data.error);
        totalCount += data?.count || 0;
      }

      toast({
        title: "Exercises generated!",
        description: `${totalCount} exercise(s) ready for your lesson.`,
      });

      await fetchLessons();
      setExpanded(lessonId);
      await fetchExercises(lessonId);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const fetchExercises = async (lessonId: string) => {
    const { data, error } = await supabase
      .from("lesson_exercises")
      .select("id, exercise_type, content, order_index")
      .eq("lesson_id", lessonId)
      .order("order_index");

    if (!error && data) {
      setExercises((prev) => ({ ...prev, [lessonId]: data as Exercise[] }));
    }
  };

  const toggleExpand = async (lessonId: string) => {
    if (expanded === lessonId) {
      setExpanded(null);
      return;
    }
    setExpanded(lessonId);
    if (!exercises[lessonId]) {
      await fetchExercises(lessonId);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (lessons.length === 0 && page === 1) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BookOpen className="mx-auto h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">No lessons yet. Create your first one above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {lessons.map((lesson) => (
        <Card key={lesson.id} className="border border-border">
          <CardContent className="py-4 px-5 space-y-3">
            {/* Header row */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-foreground truncate">{lesson.title}</span>
                  <Badge variant={STATUS_VARIANT[lesson.status] ?? "secondary"} className="shrink-0 capitalize">
                    {lesson.status}
                  </Badge>
                </div>
                {lesson.student_email && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <User className="h-3 w-3" />
                    <span>{lesson.student_email}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="outline" className="text-xs">{lesson.cefr_level}</Badge>
                  {lesson.exercise_types.slice(0, 3).map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">
                      {EXERCISE_TYPE_LABELS[t] || t.replace(/_/g, " ")}
                    </Badge>
                  ))}
                  {lesson.exercise_types.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{lesson.exercise_types.length - 3}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 shrink-0">
                <Button
                  size="sm"
                  variant={lesson.status === "ready" ? "outline" : "default"}
                  disabled={generating === lesson.id}
                  onClick={() => handleGenerate(lesson.id)}
                  className="text-xs"
                >
                  {generating === lesson.id ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-1" />
                  )}
                  {lesson.status === "ready" ? "Regenerate" : "Generate"}
                </Button>

                {(lesson.status === "ready" || lesson.status === "active") && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => navigate(`/teacher/lesson/${lesson.id}`)}
                    className="text-xs"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    {lesson.status === "active" ? "Resume" : "Start"}
                  </Button>
                )}

                {lesson.status === "ready" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleExpand(lesson.id)}
                    className="text-xs"
                  >
                    {expanded === lesson.id ? (
                      <><ChevronUp className="h-3 w-3 mr-1" />Hide</>
                    ) : (
                      <><ChevronDown className="h-3 w-3 mr-1" />Preview</>
                    )}
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setReuseSource({
                    id: lesson.id,
                    title: lesson.title,
                    cefr_level: lesson.cefr_level,
                    translation_language: lesson.translation_language,
                    language: lesson.language,
                    lesson_type: lesson.lesson_type,
                    exercise_types: lesson.exercise_types,
                    youtube_url: lesson.youtube_url,
                    paragraph_prompt: lesson.paragraph_prompt,
                    paragraph_content: lesson.paragraph_content,
                    transcript: lesson.transcript,
                    topic: lesson.topic,
                    student_email: lesson.student_email,
                  })}
                  className="text-xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Reuse
                </Button>
              </div>
            </div>

            {/* Exercises preview */}
            {expanded === lesson.id && exercises[lesson.id] && (
              <div className="space-y-3 pt-2 border-t border-border">
                {exercises[lesson.id].length === 0 ? (
                  <p className="text-xs text-muted-foreground">No exercises found.</p>
                ) : (
                  exercises[lesson.id].map((ex) => (
                    <ExerciseCard key={ex.id} exercise={ex} />
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
