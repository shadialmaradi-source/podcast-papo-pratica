import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  Loader2,
  Trophy,
  Crown,
  FileText,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { YouTubeExercises } from "@/components/YouTubeExercises";
import { YouTubeSpeaking } from "@/components/YouTubeSpeaking";
import VideoFlashcards from "@/components/VideoFlashcards";
import LessonCompleteScreen from "@/components/lesson/LessonCompleteScreen";
import YouTubeVideoExercises from "@/components/YouTubeVideoExercises";
import { TranscriptViewer } from "@/components/transcript/TranscriptViewer";
import { LockedTranscript } from "@/components/transcript/LockedTranscript";
import {
  completeVideo,
  formatDuration,
  type WeekVideoRow,
  type VideoProgress,
  type LearningWeek,
} from "@/services/learningPathService";

type LessonStep = "video" | "exercises" | "speaking" | "flashcards" | "complete";
type HybridStep = "video" | "generating" | "exercises" | "speaking" | "flashcards" | "complete";

interface WeekVideoData extends WeekVideoRow {
  learning_weeks: LearningWeek;
}

export default function WeekVideo() {
  const { weekVideoId } = useParams<{ weekVideoId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPremium } = useSubscription();

  const [video, setVideo] = useState<WeekVideoData | null>(null);
  const [progress, setProgress] = useState<VideoProgress | null>(null);
  const [totalInWeek, setTotalInWeek] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [lessonStep, setLessonStep] = useState<LessonStep>("video");
  const [hybridStep, setHybridStep] = useState<HybridStep>("video");
  const [generatingExercises, setGeneratingExercises] = useState(false);
  const [linkedVideoIdState, setLinkedVideoIdState] = useState<string | null>(null);

  useEffect(() => {
    if (!weekVideoId) return;
    loadData();
  }, [weekVideoId, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: videoData, error: videoError } = await supabase
        .from("week_videos")
        .select("*, learning_weeks(*)")
        .eq("id", weekVideoId!)
        .single();

      if (videoError || !videoData) throw videoError || new Error("Video not found");

      setVideo(videoData as unknown as WeekVideoData);

      const { count } = await supabase
        .from("week_videos")
        .select("id", { count: "exact", head: true })
        .eq("week_id", videoData.week_id);

      setTotalInWeek(count || 0);

      if (user) {
        const { data: prog } = await supabase
          .from("user_video_progress")
          .select("*")
          .eq("user_id", user.id)
          .eq("week_video_id", weekVideoId!)
          .maybeSingle();

        setProgress(prog as VideoProgress | null);
      }
    } catch (error) {
      console.error("Error loading video:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!user || !weekVideoId || !video) return;

    setCompleting(true);
    try {
      const result = await completeVideo(user.id, weekVideoId);

      setProgress({
        id: "",
        user_id: user.id,
        week_video_id: weekVideoId,
        status: "completed",
        completed_at: new Date().toISOString(),
        xp_earned: result.xpEarned,
      });

      toast({
        title: `+${result.xpEarned} XP earned! 🎉`,
        description: result.weekCompleted
          ? `Week completed! 🔓`
          : `Video marked as complete.`,
      });
    } catch (error) {
      console.error("Error completing video:", error);
      toast({
        title: "Error",
        description: "Failed to mark video as complete. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Video not found.</p>
        <Button variant="outline" onClick={() => navigate("/library")}>
          Back to Library
        </Button>
      </div>
    );
  }

  // Premium gate for non-free videos
  if (video.order_in_week > 4 && !isPremium) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
          <div className="container mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/learn/week/${video.week_id}`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-sm font-semibold text-foreground truncate">{video.title}</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12 max-w-lg">
          <Card className="border-primary/30">
            <CardContent className="p-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent">
                <Crown className="w-7 h-7 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-lg text-foreground">Premium Video</h3>
              <p className="text-sm text-muted-foreground">
                Upgrade to Premium to unlock all videos in the learning path, full transcripts, and unlimited exercises.
              </p>
              <Button variant="learning" onClick={() => navigate("/premium")}>
                Upgrade to Premium
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const week = video.learning_weeks;
  const linkedVideoId = video.linked_video_id;
  const hasLinkedVideo = !!linkedVideoId;
  const hasTranscript = !!video.transcript;
  const isCompleted = progress?.status === "completed";
  const vocabTags = video.vocabulary_tags || [];

  // Step-based lesson flow when linked_video_id is available
  if (hasLinkedVideo) {
    return (
      <div className="min-h-screen bg-background">
        {lessonStep === "video" && (
          <YouTubeVideoExercises
            videoId={linkedVideoId!}
            onBack={() => navigate(`/learn/week/${video.week_id}`)}
            onStartExercises={() => setLessonStep("exercises")}
          />
        )}

        {lessonStep === "exercises" && (
          <YouTubeExercises
            videoId={linkedVideoId!}
            level="beginner"
            intensity="intense"
            onBack={() => setLessonStep("video")}
            onComplete={() => setLessonStep("speaking")}
            onContinueToSpeaking={() => setLessonStep("speaking")}
            onTryNextLevel={() => setLessonStep("speaking")}
            onSkipToFlashcards={() => setLessonStep("flashcards")}
          />
        )}

        {lessonStep === "speaking" && (
          <YouTubeSpeaking
            videoId={linkedVideoId!}
            level="beginner"
            onComplete={() => setLessonStep("flashcards")}
            onBack={() => setLessonStep("exercises")}
          />
        )}

        {lessonStep === "flashcards" && (
          <VideoFlashcards
            videoId={linkedVideoId!}
            level="beginner"
            onComplete={() => {
              handleComplete();
              setLessonStep("complete");
            }}
            onBack={() => setLessonStep("speaking")}
          />
        )}

        {lessonStep === "complete" && (
          <LessonCompleteScreen
            exerciseScore={0}
            totalExercises={10}
            exerciseAccuracy={0}
            flashcardsCount={5}
            onNextVideo={() => navigate(`/learn/week/${video.week_id}`)}
            onViewProgress={() => navigate("/profile")}
            onRetry={() => setLessonStep("video")}
            onBackToLibrary={() => navigate(`/learn/week/${video.week_id}`)}
          />
        )}
      </div>
    );
  }

  // Hybrid mode: transcript exists but no linked_video_id
  // Full lesson flow: video+transcript -> exercises -> speaking -> flashcards -> complete
  if (hasTranscript) {
    const handleStartExercises = async () => {
      if (!user || !video) return;
      setGeneratingExercises(true);

      try {
        const { data, error } = await supabase.functions.invoke('setup-week-video-exercises', {
          body: { weekVideoId: video.id },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to generate exercises');

        setLinkedVideoIdState(data.linkedVideoId);
        setHybridStep("exercises");

        toast({
          title: "Exercises Ready! 🎯",
          description: "AI-generated exercises are ready for you.",
        });
      } catch (error: any) {
        console.error('Error generating exercises:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to generate exercises. Please try again.",
          variant: "destructive",
        });
      } finally {
        setGeneratingExercises(false);
      }
    };

    const effectiveLinkedId = linkedVideoIdState || video.linked_video_id;

    // If exercises have been generated and we have a linked video, show the full lesson flow
    if (effectiveLinkedId && hybridStep !== "video") {
      return (
        <div className="min-h-screen bg-background">
          {hybridStep === "generating" && (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Generating exercises from transcript...</p>
            </div>
          )}

          {hybridStep === "exercises" && (
            <YouTubeExercises
              videoId={effectiveLinkedId}
              level="beginner"
              intensity="intense"
              onBack={() => setHybridStep("video")}
              onComplete={() => setHybridStep("speaking")}
              onContinueToSpeaking={() => setHybridStep("speaking")}
              onTryNextLevel={() => setHybridStep("speaking")}
              onSkipToFlashcards={() => setHybridStep("flashcards")}
            />
          )}

          {hybridStep === "speaking" && (
            <YouTubeSpeaking
              videoId={effectiveLinkedId}
              level="beginner"
              onComplete={() => setHybridStep("flashcards")}
              onBack={() => setHybridStep("exercises")}
            />
          )}

          {hybridStep === "flashcards" && (
            <VideoFlashcards
              videoId={effectiveLinkedId}
              level="beginner"
              onComplete={() => {
                handleComplete();
                setHybridStep("complete");
              }}
              onBack={() => setHybridStep("speaking")}
            />
          )}

          {hybridStep === "complete" && (
            <LessonCompleteScreen
              exerciseScore={0}
              totalExercises={10}
              exerciseAccuracy={0}
              flashcardsCount={5}
              onNextVideo={() => navigate(`/learn/week/${video.week_id}`)}
              onViewProgress={() => navigate("/profile")}
              onRetry={() => setHybridStep("video")}
              onBackToLibrary={() => navigate(`/learn/week/${video.week_id}`)}
            />
          )}
        </div>
      );
    }

    // Default hybrid video step: video + interactive transcript + start exercises button
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
          <div className="container mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/learn/week/${video.week_id}`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-foreground truncate">
                Week {week.week_number}: {week.title}
              </h1>
              <p className="text-xs text-muted-foreground">
                Video {video.order_in_week} of {totalInWeek}
              </p>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6 max-w-2xl">
          {/* Video embed */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative aspect-video rounded-xl overflow-hidden bg-muted border shadow-sm"
          >
            <iframe
              src={`https://www.youtube.com/embed/${video.youtube_id}?rel=0&modestbranding=1`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </motion.div>

          {/* Interactive Transcript */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <TranscriptViewer
              videoId={video.id}
              transcript={video.transcript!}
              videoTitle={video.title}
              language={week.language || "english"}
              isPremium={isPremium}
              onUpgradeClick={() => navigate("/premium")}
            />
          </motion.div>

          {/* Vocabulary tags */}
          {vocabTags.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">📝 Key Vocabulary</h3>
                  <div className="flex flex-wrap gap-2">
                    {vocabTags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs font-normal">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Start Exercises button */}
          {user && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Button
                className="w-full h-14 text-base font-semibold gap-2"
                variant="learning"
                onClick={handleStartExercises}
                disabled={generatingExercises || !user}
              >
                {generatingExercises ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Generating Exercises...</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> Start Exercises</>
                )}
              </Button>
            </motion.div>
          )}

          {/* Complete button */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="pb-8">
            {isCompleted ? (
              <Card className="border-primary/30">
                <CardContent className="p-5 text-center space-y-3">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Already completed</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{progress?.xp_earned || video.xp_reward} XP earned</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/learn/week/${video.week_id}`)}>
                    Back to Week {week.week_number}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Button
                className="w-full h-12 text-sm font-medium gap-2"
                variant="outline"
                onClick={handleComplete}
                disabled={completing || !user}
              >
                {completing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Completing...</>
                ) : (
                  <><Trophy className="w-4 h-4" /> Mark as Complete • {video.xp_reward} XP</>
                )}
              </Button>
            )}
          </motion.div>
        </main>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/learn/week/${video.week_id}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">
              Week {week.week_number}: {week.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              Video {video.order_in_week} of {totalInWeek}
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-xl font-bold text-foreground">{video.title}</h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>{video.source}</span>
            <span>•</span>
            <span>{formatDuration(video.duration_seconds)}</span>
          </div>
          {video.grammar_focus && (
            <Badge variant="secondary" className="mt-2">
              <BookOpen className="w-3 h-3 mr-1" />
              {video.grammar_focus}
            </Badge>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative aspect-video rounded-xl overflow-hidden bg-muted border shadow-sm"
        >
          <iframe
            src={`https://www.youtube.com/embed/${video.youtube_id}?rel=0&modestbranding=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </motion.div>

        {vocabTags.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">📝 Key Vocabulary</h3>
                <div className="flex flex-wrap gap-2">
                  {vocabTags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs font-normal">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="pb-8">
          {isCompleted ? (
            <Card className="border-primary/30">
              <CardContent className="p-5 text-center space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Already completed</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{progress?.xp_earned || video.xp_reward} XP earned</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate(`/learn/week/${video.week_id}`)}>
                  Back to Week {week.week_number}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Button
              className="w-full h-14 text-base font-semibold gap-2"
              variant="learning"
              onClick={handleComplete}
              disabled={completing || !user}
            >
              {completing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Completing...</>
              ) : (
                <><Trophy className="w-5 h-5" /> Mark as Complete • {video.xp_reward} XP</>
              )}
            </Button>
          )}
        </motion.div>
      </main>
    </div>
  );
}
