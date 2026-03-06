import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { TranscriptViewer } from "@/components/transcript/TranscriptViewer";
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, CheckCircle, Send, User, Radio } from "lucide-react";
import { toast } from "sonner";

interface Lesson {
  id: string;
  title: string;
  student_email: string | null;
  cefr_level: string;
  topic: string | null;
  status: string;
  youtube_url: string | null;
  lesson_type: string;
  paragraph_content: string | null;
  transcript: string | null;
}

function extractYouTubeVideoId(url: string): string | null {
  let match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  match = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  match = url.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  return null;
}

interface Exercise {
  id: string;
  exercise_type: string;
  content: any;
  order_index: number;
}

const EXERCISE_TYPE_LABELS: Record<string, string> = {
  fill_in_blank: "Fill in the Blank",
  multiple_choice: "Quiz",
  role_play: "Role-play",
  spot_the_mistake: "Spot the Mistake",
};

const TYPE_COLORS: Record<string, string> = {
  fill_in_blank: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  multiple_choice: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  role_play: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  spot_the_mistake: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function StudentExerciseView({
  exercise,
  response,
  onResponseChange,
  onSubmit,
  submitted,
}: {
  exercise: Exercise;
  response: string;
  onResponseChange: (v: string) => void;
  onSubmit: () => void;
  submitted: boolean;
}) {
  const c = exercise.content;

  const renderPrompt = () => {
    if (exercise.exercise_type === "fill_in_blank") {
      return (
        <div className="space-y-2">
          <p className="text-xl font-medium text-foreground leading-relaxed">{c.sentence}</p>
          {c.hint && <p className="text-sm text-muted-foreground italic">💡 Hint: {c.hint}</p>}
        </div>
      );
    }

    if (exercise.exercise_type === "multiple_choice") {
      return (
        <div className="space-y-4">
          <p className="text-xl font-medium text-foreground">{c.question}</p>
          <ul className="space-y-2">
            {(c.options || []).map((opt: string, i: number) => {
              const letter = ["A", "B", "C", "D"][i];
              const selected = response === letter;
              return (
                <li key={i}>
                  <button
                    onClick={() => !submitted && onResponseChange(letter)}
                    className={`w-full text-left rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-foreground hover:border-primary/50 hover:bg-muted/60"
                    } ${submitted ? "cursor-default" : "cursor-pointer"}`}
                  >
                    <span className="font-bold mr-2">{letter}.</span>{opt}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      );
    }

    if (exercise.exercise_type === "role_play") {
      return (
        <div className="space-y-4">
          <p className="text-lg font-medium text-foreground">{c.scenario}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Teacher</p>
              <p className="text-sm text-foreground">{c.teacher_role}</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Your Role</p>
              <p className="text-sm text-foreground">{c.student_role}</p>
            </div>
          </div>
          {c.starter && (
            <p className="text-sm italic text-muted-foreground">
              🗣 Starter: <span className="text-foreground">"{c.starter}"</span>
            </p>
          )}
          {c.useful_phrases?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Useful Phrases</p>
              <div className="flex flex-wrap gap-2">
                {c.useful_phrases.map((p: string, i: number) => (
                  <Badge key={i} variant="outline">{p}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (exercise.exercise_type === "spot_the_mistake") {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{c.instruction}</p>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-destructive mb-1">Find the mistake</p>
            <p className="text-xl text-foreground">{c.sentence}</p>
          </div>
        </div>
      );
    }

    return null;
  };

  const needsTextAnswer = ["fill_in_blank", "spot_the_mistake", "role_play"].includes(exercise.exercise_type);

  return (
    <div className="space-y-6">
      {renderPrompt()}

      {needsTextAnswer && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your Answer</p>
          <Textarea
            placeholder="Type your answer here..."
            value={response}
            onChange={(e) => onResponseChange(e.target.value)}
            disabled={submitted}
            className="min-h-[100px] resize-none"
          />
        </div>
      )}

      {submitted ? (
        <div className="flex items-center gap-2 text-sm text-primary font-medium">
          <CheckCircle className="h-4 w-4" />
          Answer submitted
        </div>
      ) : (
        <Button
          size="sm"
          onClick={onSubmit}
          disabled={!response.trim()}
          className="gap-2"
        >
          <Send className="h-3.5 w-3.5" />
          Submit Answer
        </Button>
      )}
    </div>
  );
}

export default function StudentLesson() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [teacherIndex, setTeacherIndex] = useState<number | null>(null);

  // Group exercises by type
  const exerciseGroups = useMemo(() => {
    const typeOrder: string[] = [];
    const grouped: Record<string, Exercise[]> = {};
    for (const ex of exercises) {
      if (!grouped[ex.exercise_type]) {
        grouped[ex.exercise_type] = [];
        typeOrder.push(ex.exercise_type);
      }
      grouped[ex.exercise_type].push(ex);
    }
    return typeOrder.map((type) => ({ type, exercises: grouped[type] }));
  }, [exercises]);

  interface GroupState { currentIndex: number; }
  const [groupStates, setGroupStates] = useState<Record<string, GroupState>>({});

  const updateGroupState = (type: string, update: Partial<GroupState>) => {
    setGroupStates((prev) => ({
      ...prev,
      [type]: { ...prev[type], ...update },
    }));
  };

  useEffect(() => {
    if (!id || !user) return;

    const load = async () => {
      setLoading(true);

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id!);
      
      let lessonQuery = supabase
        .from("teacher_lessons")
        .select("id, title, student_email, cefr_level, topic, status, current_exercise_index, youtube_url, lesson_type, paragraph_content, transcript");
      
      if (isUuid) {
        const { data: byToken } = await lessonQuery.eq("share_token", id).maybeSingle();
        if (byToken) {
          lessonQuery = supabase
            .from("teacher_lessons")
            .select("id, title, student_email, cefr_level, topic, status, current_exercise_index, youtube_url, lesson_type, paragraph_content, transcript")
            .eq("id", byToken.id);
        } else {
          lessonQuery = supabase
            .from("teacher_lessons")
            .select("id, title, student_email, cefr_level, topic, status, current_exercise_index, youtube_url, lesson_type, paragraph_content, transcript")
            .eq("id", id);
        }
      } else {
        lessonQuery = lessonQuery.eq("share_token", id);
      }

      const lessonRes = await lessonQuery.single();
      const lessonId = lessonRes.data?.id;

      const [exercisesRes, responsesRes] = await Promise.all([
        supabase
          .from("lesson_exercises")
          .select("id, exercise_type, content, order_index")
          .eq("lesson_id", lessonId ?? id)
          .order("order_index"),
        supabase
          .from("lesson_responses")
          .select("exercise_id, response")
          .eq("lesson_id", lessonId ?? id)
          .eq("user_id", user.id),
      ]);

      if (lessonRes.data) {
        const data = lessonRes.data as any;
        setLesson(data as Lesson);
        if (typeof data.current_exercise_index === "number") {
          setTeacherIndex(data.current_exercise_index);
        }
      }
      if (exercisesRes.data) {
        setExercises(exercisesRes.data as Exercise[]);
        // Initialize group states
        const groups: Record<string, Exercise[]> = {};
        for (const ex of exercisesRes.data as Exercise[]) {
          if (!groups[ex.exercise_type]) groups[ex.exercise_type] = [];
          groups[ex.exercise_type].push(ex);
        }
        const initStates: Record<string, GroupState> = {};
        Object.keys(groups).forEach((t) => { initStates[t] = { currentIndex: 0 }; });
        setGroupStates(initStates);
      }

      if (responsesRes.data && responsesRes.data.length > 0) {
        const respMap: Record<string, string> = {};
        const subMap: Record<string, boolean> = {};
        for (const r of responsesRes.data) {
          respMap[r.exercise_id] = r.response ?? "";
          subMap[r.exercise_id] = true;
        }
        setResponses(respMap);
        setSubmitted(subMap);
      }

      setLoading(false);
    };

    load();
  }, [id, user]);

  // Real-time sync
  useEffect(() => {
    if (!lesson) return;

    const channel = supabase
      .channel(`lesson-sync-${lesson.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "teacher_lessons",
          filter: `id=eq.${lesson.id}`,
        },
        (payload) => {
          const newIndex = (payload.new as any).current_exercise_index;
          if (typeof newIndex === "number") {
            setTeacherIndex(newIndex);
          }
          const newStatus = (payload.new as any).status;
          if (newStatus === "completed") {
            setDone(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lesson?.id]);

  const handleSubmit = async (exerciseId: string) => {
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (!exercise || !user || !lesson) return;
    const response = responses[exerciseId] ?? "";

    const { error } = await supabase
      .from("lesson_responses")
      .upsert(
        {
          lesson_id: lesson.id,
          exercise_id: exerciseId,
          user_id: user.id,
          response,
        },
        { onConflict: "exercise_id,user_id" }
      );

    if (error) {
      toast.error("Failed to save answer. Try again.");
      return;
    }

    setSubmitted((prev) => ({ ...prev, [exerciseId]: true }));
    toast.success("Answer saved!");
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
          <p className="text-muted-foreground">Lesson not found or not assigned to you.</p>
          <Button variant="outline" onClick={() => navigate("/app")}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const allSubmitted = exercises.length > 0 && exercises.every((e) => submitted[e.id]);

  if (done || (allSubmitted && exercises.length > 0)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">All Done!</h2>
          <p className="text-muted-foreground">You've completed all exercises for <span className="font-semibold text-foreground">{lesson.title}</span>. Great work!</p>
          <Button onClick={() => navigate("/app")}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const youtubeVideoId = lesson.youtube_url ? extractYouTubeVideoId(lesson.youtube_url) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 max-w-2xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/app")}
            className="text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Home
          </Button>
          <div className="flex items-center gap-2">
            {teacherIndex !== null && (
              <span className="flex items-center gap-1 text-xs text-primary font-medium">
                <Radio className="h-3 w-3 animate-pulse" />
                Live
              </span>
            )}
            <Badge variant="outline" className="capitalize">{lesson.cefr_level}</Badge>
          </div>
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
            {lesson.topic && <span>{lesson.topic}</span>}
          </div>
        </div>

        {exercises.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">No exercises available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* YouTube video */}
            {youtubeVideoId && (
              <div className="rounded-xl overflow-hidden border border-border bg-black aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Lesson video"
                />
              </div>
            )}

            {/* Transcript */}
            {lesson.transcript && (
              <TranscriptViewer
                videoId={lesson.id}
                transcript={lesson.transcript}
                videoTitle={lesson.title}
                language="italian"
                isPremium={true}
                onUpgradeClick={() => {}}
              />
            )}

            {/* Paragraph content */}
            {lesson.lesson_type === "paragraph" && lesson.paragraph_content && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-5 pb-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Reading</p>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">{lesson.paragraph_content}</p>
                </CardContent>
              </Card>
            )}

            {/* Exercise sections grouped by type */}
            {exerciseGroups.map((group) => {
              const state = groupStates[group.type] || { currentIndex: 0 };
              const exercise = group.exercises[state.currentIndex];
              if (!exercise) return null;

              const label = EXERCISE_TYPE_LABELS[group.type] || group.type;
              const colorClass = TYPE_COLORS[group.type] || "";
              const isFirst = state.currentIndex === 0;
              const isLast = state.currentIndex === group.exercises.length - 1;

              return (
                <div key={group.type} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${colorClass}`}>
                        {label}
                      </span>
                      <span className="text-sm text-muted-foreground font-normal">
                        {state.currentIndex + 1} / {group.exercises.length}
                      </span>
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {group.exercises.filter((e) => submitted[e.id]).length} answered
                    </span>
                  </div>

                  <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${((state.currentIndex + 1) / group.exercises.length) * 100}%` }}
                    />
                  </div>

                  <Card className="border border-border shadow-sm">
                    <CardContent className="pt-6 pb-6 px-6 space-y-6">
                      <StudentExerciseView
                        exercise={exercise}
                        response={responses[exercise.id] ?? ""}
                        onResponseChange={(v) =>
                          setResponses((prev) => ({ ...prev, [exercise.id]: v }))
                        }
                        onSubmit={() => handleSubmit(exercise.id)}
                        submitted={!!submitted[exercise.id]}
                      />
                    </CardContent>
                  </Card>

                  <div className="flex items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateGroupState(group.type, { currentIndex: state.currentIndex - 1 })}
                      disabled={isFirst}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateGroupState(group.type, { currentIndex: state.currentIndex + 1 })}
                      disabled={isLast}
                      className="ml-auto"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Finish button */}
            <Button
              onClick={() => setDone(true)}
              disabled={!allSubmitted}
              className="w-full"
              size="lg"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Finish Lesson
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
