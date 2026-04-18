import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { trackPageView } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TranscriptViewer } from "@/components/transcript/TranscriptViewer";
import { EXERCISE_TYPE_LABELS, TYPE_COLORS } from "@/components/teacher/ExercisePresenter";
import type { Exercise } from "@/components/teacher/ExercisePresenter";
import { buildStudentLessonShareLink } from "@/utils/lessonShare";
import { TeacherSpeakingView } from "@/components/lesson/TeacherSpeakingView";
import SceneNavigator, { type VideoScene } from "@/components/lesson/SceneNavigator";
import LessonVideoPlayer from "@/components/lesson/LessonVideoPlayer";
import { ArrowLeft, User, BookOpen, CheckCircle, Loader2, Sparkles, Eye, EyeOff, ChevronLeft, ChevronRight, X, Keyboard, PartyPopper, Users, Share2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

interface Lesson {
  id: string;
  title: string;
  student_email: string | null;
  cefr_level: string;
  topic: string | null;
  status: string;
  youtube_url: string | null;
  transcript: string | null;
  paragraph_content: string | null;
  paragraph_prompt: string | null;
  exercise_types: string[];
  language: string;
  lesson_type: string;
  share_token: string | null;
}

export default function TeacherLesson() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const { user } = useAuth();
  const { toast } = useToast();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  // Scene segmentation state
  const [scenes, setScenes] = useState<VideoScene[]>([]);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [completedScenes, setCompletedScenes] = useState<number[]>([]);
  const [dbVideoId, setDbVideoId] = useState<string | null>(null);
  const [scenesLoading, setScenesLoading] = useState(false);

  useEffect(() => { trackPageView("teacher_lesson", "teacher"); }, [id]);

  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(false);
  const [generatingType, setGeneratingType] = useState<string | null>(null);

  interface GroupState { currentIndex: number; revealed: boolean; }
  const [groupStates, setGroupStates] = useState<Record<string, GroupState>>({});
  const [activeGroupType, setActiveGroupType] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(true);
  const [copied, setCopied] = useState(false);

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

  const updateGroupState = (type: string, update: Partial<GroupState>) => {
    setActiveGroupType(type);
    setGroupStates((prev) => ({
      ...prev,
      [type]: { ...prev[type], ...update },
    }));
  };

  // Set default active group when exercise groups change
  useEffect(() => {
    if (exerciseGroups.length > 0 && !activeGroupType) {
      setActiveGroupType(exerciseGroups[0].type);
    }
  }, [exerciseGroups, activeGroupType]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!activeGroupType) return;

      const group = exerciseGroups.find((g) => g.type === activeGroupType);
      if (!group) return;
      const state = groupStates[activeGroupType] || { currentIndex: 0, revealed: false };

      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (state.currentIndex < group.exercises.length - 1) {
          updateGroupState(activeGroupType, { currentIndex: state.currentIndex + 1, revealed: false });
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (state.currentIndex > 0) {
          updateGroupState(activeGroupType, { currentIndex: state.currentIndex - 1, revealed: false });
        }
      } else if (e.key === " ") {
        e.preventDefault();
        updateGroupState(activeGroupType, { revealed: !state.revealed });
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        updateGroupState(activeGroupType, { revealed: true });
      } else if (e.key === "Escape") {
        e.preventDefault();
        (document.activeElement as HTMLElement)?.blur();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [activeGroupType, exerciseGroups, groupStates]);

  useEffect(() => {
    if (!id || !user) return;

    const fetchData = async () => {
      setLoading(true);

      const [lessonRes, exercisesRes] = await Promise.all([
        supabase
          .from("teacher_lessons")
          .select("id, title, student_email, cefr_level, topic, status, youtube_url, transcript, paragraph_content, paragraph_prompt, exercise_types, language, lesson_type, share_token")
          .eq("id", id)
          .eq("teacher_id", user.id)
          .single(),
        supabase
          .from("lesson_exercises")
          .select("id, exercise_type, content, order_index")
          .eq("lesson_id", id)
          .order("order_index"),
      ]);

      if (lessonRes.data) setLesson(lessonRes.data as any as Lesson);
      if (exercisesRes.data) {
        setExercises(exercisesRes.data as Exercise[]);
        const groups: Record<string, Exercise[]> = {};
        for (const ex of exercisesRes.data as Exercise[]) {
          if (!groups[ex.exercise_type]) groups[ex.exercise_type] = [];
          groups[ex.exercise_type].push(ex);
        }
        const initStates: Record<string, GroupState> = {};
        Object.keys(groups).forEach((t) => { initStates[t] = { currentIndex: 0, revealed: false }; });
        setGroupStates(initStates);
      }
      setLoading(false);

      if (lessonRes.data?.status === "ready") {
        await supabase
          .from("teacher_lessons")
          .update({ status: "active" })
          .eq("id", id);
      }
    };

    fetchData();
  }, [id, user]);

  // Fetch scenes for YouTube lessons
  useEffect(() => {
    if (!lesson?.youtube_url) return;
    const ytId = extractYouTubeVideoId(lesson.youtube_url);
    if (!ytId) return;

    const fetchScenes = async () => {
      setScenesLoading(true);
      try {
        // Find the youtube_videos DB record by video_id
        const { data: videoRecord } = await supabase
          .from("youtube_videos")
          .select("id")
          .eq("video_id", ytId)
          .maybeSingle();

        if (!videoRecord) {
          console.log("[TeacherLesson] No youtube_videos record for", ytId);
          setScenesLoading(false);
          return;
        }

        setDbVideoId(videoRecord.id);

        // Call segment-video-scenes
        const { data: sceneData, error: sceneError } = await supabase.functions.invoke(
          "segment-video-scenes",
          { body: { videoId: videoRecord.id } }
        );

        if (sceneError) {
          console.error("[TeacherLesson] Scene segmentation error:", sceneError);
        } else if (sceneData?.scenes?.length > 0) {
          setScenes(sceneData.scenes);
          setCompletedScenes([]);
          setCurrentSceneIndex(0);
        }
      } catch (err) {
        console.error("[TeacherLesson] Failed to fetch scenes:", err);
      } finally {
        setScenesLoading(false);
      }
    };

    fetchScenes();
  }, [lesson?.youtube_url]);

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

  const handleGenerateByType = async (exerciseType: string) => {
    if (!id || generatingType) return;
    setGeneratingType(exerciseType);
    try {
      const { error } = await supabase.functions.invoke("generate-lesson-exercises-by-type", {
        body: { lessonId: id, exerciseType }
      });
      if (error) throw error;

      const { data: fetchedExercises } = await supabase
        .from("lesson_exercises")
        .select("id, exercise_type, content, order_index")
        .eq("lesson_id", id)
        .order("order_index");

      if (fetchedExercises) {
        setExercises(fetchedExercises as Exercise[]);
        const groups: Record<string, Exercise[]> = {};
        for (const ex of fetchedExercises as Exercise[]) {
          if (!groups[ex.exercise_type]) groups[ex.exercise_type] = [];
          groups[ex.exercise_type].push(ex);
        }
        const newStates = { ...groupStates };
        Object.keys(groups).forEach((t) => {
          if (!newStates[t]) newStates[t] = { currentIndex: 0, revealed: false };
        });
        setGroupStates(newStates);
      }

      // Fetch transcript if updated
      if (!lesson?.transcript) {
        const { data: lessonData } = await supabase
          .from("teacher_lessons")
          .select("transcript")
          .eq("id", id)
          .single();
        if (lessonData?.transcript) {
          setLesson(prev => prev ? { ...prev, transcript: lessonData.transcript } : prev);
        }
      }

      toast({ title: `${EXERCISE_TYPE_LABELS[exerciseType] || exerciseType} exercises generated!` });
    } catch (err: any) {
      const msg = err?.message || JSON.stringify(err) || "";
      if (msg.includes("VIDEO_TOO_LONG")) {
        const cleanMsg = msg.split("VIDEO_TOO_LONG:")[1] || "This video exceeds your plan's duration limit.";
        toast({ title: "Video Too Long", description: cleanMsg, variant: "destructive" });
      } else {
        toast({ title: "Generation failed", description: msg, variant: "destructive" });
      }
    } finally {
      setGeneratingType(null);
    }
  };

  const renderExerciseContent = (exercise: Exercise, revealed: boolean) => {
    const c = exercise.content;
    if (exercise.exercise_type === "fill_in_blank") {
      return (
        <div className="space-y-4">
          <p className="text-xl font-medium text-foreground leading-relaxed">{c.sentence}</p>
          {c.hint && <p className="text-sm text-muted-foreground italic">💡 Hint: {c.hint}</p>}
          {revealed && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Answer</p>
              <p className="text-lg font-bold text-primary">{c.answer}</p>
            </div>
          )}
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
              const isCorrect = revealed && letter === c.correct;
              return (
                <li key={i} className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${isCorrect ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 text-foreground"}`}>
                  <span className="font-bold mr-2">{letter}.</span>{opt}
                  {isCorrect && <span className="ml-2 text-primary">✓</span>}
                </li>
              );
            })}
          </ul>
          {revealed && c.explanation && <p className="text-sm text-muted-foreground italic">{c.explanation}</p>}
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
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Student</p>
              <p className="text-sm text-foreground">{c.student_role}</p>
            </div>
          </div>
          {c.starter && <p className="text-sm italic text-muted-foreground">🗣 Starter: <span className="text-foreground">"{c.starter}"</span></p>}
          {c.useful_phrases?.length > 0 && revealed && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Useful Phrases</p>
              <div className="flex flex-wrap gap-2">
                {c.useful_phrases.map((p: string, i: number) => (
                  <span key={i} className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs">{p}</span>
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
          {revealed && (
            <>
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Correction</p>
                <p className="text-xl font-bold text-primary">{c.corrected}</p>
              </div>
              {c.explanation && <p className="text-sm text-muted-foreground italic">{c.explanation}</p>}
            </>
          )}
        </div>
      );
    }
    return <p className="text-muted-foreground">Unknown exercise type</p>;
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

  const youtubeVideoId = lesson.youtube_url ? extractYouTubeVideoId(lesson.youtube_url) : null;
  const generatedTypes = new Set(exercises.map(e => e.exercise_type));
  const availableTypes = (lesson.exercise_types || []).filter((t: string) => t !== "flashcards" && t !== "image_discussion");
  const shareLink = lesson.share_token ? buildStudentLessonShareLink(lesson.share_token) : "";
  const activeGroup = activeGroupType
    ? exerciseGroups.find((group) => group.type === activeGroupType) ?? null
    : null;

  const handleCopyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      toast({ title: "Link copied!" });
    } catch {
      toast({ title: "Could not copy link", variant: "destructive" });
    }
  };

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
        {shareLink && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Share2 className="h-4 w-4 text-primary" />
                Share this lesson with your student
              </div>
              <div className="flex items-center gap-2">
                <Input value={shareLink} readOnly className="flex-1 text-sm" />
                <Button type="button" size="sm" variant="outline" onClick={handleCopyLink}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Demo success banner */}
        {isDemo && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">
                Demo Lesson Created Successfully!
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              This is what your students will see when you assign them a lesson.
              Generate exercises below, then share the link.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => navigate("/teacher")}>
                Go to Dashboard
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/teacher/students")}>
                <Users className="h-4 w-4 mr-1" />
                Add Your First Student
              </Button>
            </div>
          </div>
        )}
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
        ) : (
          <div className="space-y-6">
            {/* Speaking lesson view */}
            {lesson.lesson_type === "speaking" ? (
              <TeacherSpeakingView lessonId={lesson.id} />
            ) : (
            <>
            {/* YouTube video with scene segmentation */}
            {youtubeVideoId && (
              <div className="space-y-4">
                {scenes.length > 0 ? (
                  <>
                    {(() => {
                      const currentScene = scenes.find(s => s.scene_index === currentSceneIndex);
                      if (!currentScene) return null;
                      const sceneDuration = currentScene.end_time - currentScene.start_time;
                      return (
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-foreground">
                            Scene {currentScene.scene_index + 1} of {scenes.length}: {currentScene.scene_title}
                          </h3>
                          <LessonVideoPlayer
                            key={`scene-${currentScene.scene_index}`}
                            video={{
                              youtubeId: youtubeVideoId,
                              startTime: Math.floor(currentScene.start_time),
                              duration: Math.ceil(sceneDuration),
                              suggestedSpeed: 1,
                            }}
                            onComplete={() => {
                              if (!completedScenes.includes(currentSceneIndex)) {
                                setCompletedScenes(prev => [...prev, currentSceneIndex]);
                              }
                              // Auto-advance to next scene
                              const nextIndex = currentSceneIndex + 1;
                              if (nextIndex < scenes.length) {
                                setCurrentSceneIndex(nextIndex);
                              }
                            }}
                          />
                          {currentScene.scene_transcript && (
                            <TranscriptViewer
                              transcript={currentScene.scene_transcript}
                              videoId={lesson.id}
                              videoTitle={`${lesson.title} – Scene ${currentScene.scene_index + 1}`}
                              language={lesson.language || "italian"}
                              isPremium={true}
                              onUpgradeClick={() => navigate("/teacher/pricing")}
                            />
                          )}
                        </div>
                      );
                    })()}
                    <details className="rounded-lg border border-border bg-card p-4">
                      <summary className="cursor-pointer text-sm font-semibold text-foreground">
                        Jump to scene ({scenes.length} scenes)
                      </summary>
                      <div className="mt-3">
                        <SceneNavigator
                          scenes={scenes}
                          currentSceneIndex={currentSceneIndex}
                          completedScenes={completedScenes}
                          onSceneSelect={(idx) => setCurrentSceneIndex(idx)}
                        />
                      </div>
                    </details>
                  </>
                ) : (
                  <div className="rounded-xl overflow-hidden border border-border bg-black aspect-video">
                    {scenesLoading ? (
                      <div className="w-full h-full flex items-center justify-center bg-black/80">
                        <div className="text-center space-y-2">
                          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                          <p className="text-sm text-muted-foreground">Segmenting video into scenes...</p>
                        </div>
                      </div>
                    ) : (
                      <iframe
                        src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Lesson video"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Transcript */}
            {lesson.transcript && (
              <TranscriptViewer
                videoId={lesson.id}
                transcript={lesson.transcript}
                videoTitle={lesson.title}
                language={lesson.language || "italian"}
                isPremium={true}
                onUpgradeClick={() => navigate("/teacher/pricing")}
              />
            )}

            {lesson.lesson_type === "paragraph" && lesson.paragraph_content && (
              <div className="space-y-3">
                {lesson.paragraph_prompt && (
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Prompt</p>
                      <p className="text-sm text-muted-foreground italic">{lesson.paragraph_prompt}</p>
                    </CardContent>
                  </Card>
                )}
                <TranscriptViewer
                  videoId={lesson.id}
                  transcript={lesson.paragraph_content}
                  videoTitle={lesson.title}
                  language={lesson.language || "italian"}
                  difficulty={lesson.cefr_level}
                  isPremium={true}
                  onUpgradeClick={() => navigate("/teacher/pricing")}
                />
              </div>
            )}

            {/* Per-type generation buttons */}
            {availableTypes.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Generate Exercises</h3>
                <div className="grid grid-cols-2 gap-3">
                  {availableTypes.map((type: string) => {
                    const label = EXERCISE_TYPE_LABELS[type] || type;
                    const isGenerated = generatedTypes.has(type);
                    const isGenerating = generatingType === type;

                    return (
                      <Button
                        key={type}
                        variant={isGenerated ? "outline" : "default"}
                        size="sm"
                        onClick={() => handleGenerateByType(type)}
                        disabled={isGenerating || !!generatingType}
                        className="gap-2"
                      >
                        {isGenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isGenerated ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Exercise groups */}
            {exerciseGroups.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {exerciseGroups.map((group) => {
                    const label = EXERCISE_TYPE_LABELS[group.type] || group.type;
                    const isActive = activeGroupType === group.type;
                    const colorClass = TYPE_COLORS[group.type] || "";

                    return (
                      <button
                        key={group.type}
                        type="button"
                        onClick={() => setActiveGroupType(group.type)}
                        className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          isActive
                            ? `${colorClass} border-transparent`
                            : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {activeGroup && (() => {
                  const state = groupStates[activeGroup.type] || { currentIndex: 0, revealed: false };
                  const exercise = activeGroup.exercises[state.currentIndex];
                  if (!exercise) return null;

                  const label = EXERCISE_TYPE_LABELS[activeGroup.type] || activeGroup.type;
                  const colorClass = TYPE_COLORS[activeGroup.type] || "";
                  const isFirst = state.currentIndex === 0;
                  const isLast = state.currentIndex === activeGroup.exercises.length - 1;

                  return (
                    <div className="space-y-3 rounded-lg border-l-4 border-primary pl-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${colorClass}`}>
                            {label}
                          </span>
                          <span className="text-sm text-muted-foreground font-normal">
                            {state.currentIndex + 1} / {activeGroup.exercises.length}
                          </span>
                        </h3>
                      </div>

                      <Card className="border border-border shadow-sm">
                        <CardContent className="pt-6 pb-6 px-6 space-y-6">
                          {renderExerciseContent(exercise, state.revealed)}
                        </CardContent>
                      </Card>

                      <div className="flex items-center justify-between gap-3">
                        <Button variant="outline" size="sm" onClick={() => updateGroupState(activeGroup.type, { currentIndex: state.currentIndex - 1, revealed: false })} disabled={isFirst}>
                          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => updateGroupState(activeGroup.type, { revealed: !state.revealed })} className="flex-1">
                          {state.revealed ? <><EyeOff className="h-4 w-4 mr-2" />Hide Answer</> : <><Eye className="h-4 w-4 mr-2" />Reveal Answer</>}
                        </Button>
                        <Button size="sm" onClick={() => updateGroupState(activeGroup.type, { currentIndex: state.currentIndex + 1, revealed: false })} disabled={isLast}>
                          Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Complete button */}
            <Button
              onClick={handleComplete}
              disabled={completing}
              className="w-full"
              size="lg"
            >
              {completing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Complete Lesson
            </Button>
          </>
            )}
          </div>
        )}
      </main>

      {/* Keyboard shortcuts hint */}
      {showShortcuts && exerciseGroups.length > 0 && !done && lesson?.status !== "completed" && (
        <div className="fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur border-t border-border px-4 py-2 z-50">
          <div className="container mx-auto max-w-2xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Keyboard className="h-3.5 w-3.5" />
              <span className="flex items-center gap-3 flex-wrap">
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">←</kbd> Previous
                <span className="text-border">·</span>
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">→</kbd> Next
                <span className="text-border">·</span>
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Space</kbd> Toggle
                <span className="text-border">·</span>
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">R</kbd> Reveal
                <span className="text-border">·</span>
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd> Unfocus
              </span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => setShowShortcuts(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
