import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { YouTubeExercises } from "@/components/YouTubeExercises";
import { YouTubeSpeaking } from "@/components/YouTubeSpeaking";
import VideoFlashcards from "@/components/VideoFlashcards";
import LessonCompleteScreen from "@/components/lesson/LessonCompleteScreen";
import LessonVideoPlayer from "@/components/lesson/LessonVideoPlayer";
import SceneNavigator, { type VideoScene } from "@/components/lesson/SceneNavigator";
import { TranscriptViewer } from "@/components/transcript/TranscriptViewer";
import { trackEvent, trackPageView, trackFunnelStep } from "@/lib/analytics";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type LessonState = "loading" | "scene-video" | "exercises" | "speaking" | "flashcards" | "complete";

interface LessonStats {
  exerciseScore: number;
  totalExercises: number;
  exerciseAccuracy: number;
  flashcardsCount: number;
}

// Map onboarding levels to exercise difficulty labels
function mapLevel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower === "absolute_beginner" || lower === "beginner") return "beginner";
  if (lower === "intermediate") return "intermediate";
  if (lower === "advanced") return "advanced";
  return null;
}

export default function Lesson() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isAssignment = searchParams.get("assignment") === "true";

  const [lessonState, setLessonState] = useState<LessonState>("loading");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [nextVideoLoading, setNextVideoLoading] = useState(false);
  const [showLevelPopup, setShowLevelPopup] = useState(false);
  const [lessonStats, setLessonStats] = useState<LessonStats>({
    exerciseScore: 0,
    totalExercises: 10,
    exerciseAccuracy: 0,
    flashcardsCount: 5,
  });

  // Scene segmentation state
  const [scenes, setScenes] = useState<VideoScene[]>([]);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [completedScenes, setCompletedScenes] = useState<number[]>([]);
  const [isSegmented, setIsSegmented] = useState(false);
  const [dbVideoId, setDbVideoId] = useState<string | null>(null);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);

  // Video metadata for transcript
  const [videoTitle, setVideoTitle] = useState("");
  const [videoLanguage, setVideoLanguage] = useState("italian");

  useEffect(() => {
    trackPageView("lesson", "student");
    trackFunnelStep("lesson", "preparing", 0, { video_id: videoId });
    if (isAssignment && videoId) {
      markAssignmentInProgress(videoId);
    }
  }, [videoId, isAssignment]);

  // --- Auto-start flow on mount ---
  useEffect(() => {
    if (!videoId) return;
    initLesson();
  }, [videoId]);

  const initLesson = async () => {
    setLessonState("loading");

    // 1. Resolve video data
    let videoData = await resolveVideoData();
    if (!videoData) {
      navigate("/library");
      return;
    }

    setDbVideoId(videoData.id);
    setYoutubeVideoId(videoData.video_id);
    setVideoTitle(videoData.title || "");
    setVideoLanguage(videoData.language || "italian");

    // 2. Load scene progress
    await loadSceneProgress(videoData.id);

    // 3. Resolve level
    const level = await resolveLevel();
    if (!level) {
      setShowLevelPopup(true);
      return;
    }

    setSelectedLevel(level);
    await startLesson(videoData.id, level);
  };

  const resolveVideoData = async () => {
    let { data: videoData } = await supabase
      .from("youtube_videos")
      .select("id, video_id, title, language, duration")
      .eq("video_id", videoId!)
      .single();

    if (!videoData) {
      const { data: byId } = await supabase
        .from("youtube_videos")
        .select("id, video_id, title, language, duration")
        .eq("id", videoId!)
        .single();
      videoData = byId;
    }
    return videoData;
  };

  const resolveLevel = async (): Promise<string | null> => {
    // Check localStorage first
    const localLevel = mapLevel(localStorage.getItem("onboarding_level"));
    if (localLevel) return localLevel;

    // Check profile
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_level")
        .eq("user_id", user.id)
        .single();
      const profileLevel = mapLevel(profile?.current_level);
      if (profileLevel) return profileLevel;
    }

    return null;
  };

  const handleLevelSelect = async (level: string) => {
    setShowLevelPopup(false);
    setSelectedLevel(level);

    // Save globally
    localStorage.setItem("onboarding_level", level);
    if (user) {
      await supabase
        .from("profiles")
        .update({ current_level: level })
        .eq("user_id", user.id);
    }

    if (dbVideoId) {
      await startLesson(dbVideoId, level);
    }
  };

  const startLesson = async (videoDbId: string, level: string) => {
    trackEvent("video_started", { video_id: videoId, difficulty_level: level });
    await trySegmentVideo(videoDbId, level);
  };

  // --- Assignment helpers ---
  const markAssignmentInProgress = async (vid: string) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser?.email) return;
      const { data: videoData } = await supabase.from("youtube_videos").select("video_id").eq("id", vid).single();
      const ytId = videoData?.video_id || vid;
      await supabase
        .from("video_assignments" as any)
        .update({ status: "in_progress" } as any)
        .eq("student_email", authUser.email)
        .eq("video_id", ytId)
        .eq("status", "assigned");
    } catch (err) {
      console.error("Error updating assignment status:", err);
    }
  };

  const markAssignmentCompleted = async (vid: string) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser?.email) return;
      const { data: videoData } = await supabase.from("youtube_videos").select("video_id").eq("id", vid).single();
      const ytId = videoData?.video_id || vid;
      await supabase
        .from("video_assignments" as any)
        .update({ status: "completed", completed_at: new Date().toISOString() } as any)
        .eq("student_email", authUser.email)
        .eq("video_id", ytId)
        .neq("status", "completed");
      trackEvent("assignment_completed", { video_id: vid });
    } catch (err) {
      console.error("Error completing assignment:", err);
    }
  };

  // --- Scene progress ---
  const loadSceneProgress = async (videoDbId: string) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: progress } = await supabase
        .from("user_scene_progress")
        .select("*")
        .eq("user_id", authUser.id)
        .eq("video_id", videoDbId)
        .single();

      if (progress) {
        setCurrentSceneIndex(progress.current_scene);
        setCompletedScenes(progress.completed_scenes || []);
      }
    } catch (err) {
      console.error("Error loading scene progress:", err);
    }
  };

  const saveSceneProgress = useCallback(async (sceneIdx: number, completed: number[]) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || !dbVideoId) return;

      await supabase
        .from("user_scene_progress")
        .upsert({
          user_id: authUser.id,
          video_id: dbVideoId,
          current_scene: sceneIdx,
          completed_scenes: completed,
          last_timestamp: scenes[sceneIdx]?.start_time || 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,video_id" });
    } catch (err) {
      console.error("Error saving scene progress:", err);
    }
  }, [dbVideoId, scenes]);

  // Video duration for non-segmented player
  const [videoDuration, setVideoDuration] = useState<number>(120);

  // --- Segmentation ---
  const trySegmentVideo = async (videoDbId: string, level: string) => {
    setLessonState("loading");
    try {
      const { data: videoData } = await supabase
        .from("youtube_videos")
        .select("duration")
        .eq("id", videoDbId)
        .single();

      if (!videoData) {
        setIsSegmented(false);
        setLessonState("scene-video");
        return;
      }

      const duration = videoData.duration || 120;
      setVideoDuration(duration);

      if (videoData.duration !== null && videoData.duration <= 120) {
        setIsSegmented(false);
        setLessonState("scene-video");
        return;
      }

      const { data, error } = await supabase.functions.invoke("segment-video-scenes", {
        body: { videoId: videoDbId },
      });

      if (error || !data?.scenes || data.scenes.length === 0) {
        setIsSegmented(false);
        setLessonState("scene-video");
        return;
      }

      setScenes(data.scenes);
      setIsSegmented(true);

      const firstIncomplete = data.scenes.findIndex(
        (s: VideoScene) => !completedScenes.includes(s.scene_index)
      );
      setCurrentSceneIndex(firstIncomplete >= 0 ? firstIncomplete : 0);

      toast({
        title: `${data.scenes.length} scenes detected 🎬`,
        description: "This video has been split into micro-lessons",
      });

      setLessonState("scene-video");
    } catch (err) {
      console.error("Segmentation error:", err);
      setIsSegmented(false);
      setLessonState("scene-video");
    }
  };

  // --- Step handlers ---
  const handleSceneVideoComplete = () => {
    trackEvent("scene_video_watched", {
      video_id: videoId,
      scene_index: currentSceneIndex,
      total_scenes: scenes.length,
    });
    setLessonState("exercises");
  };

  const handleExercisesComplete = () => {
    setLessonState("speaking");
  };

  const handleContinueToSpeaking = (vid: string, level: string) => {
    setSelectedLevel(level);
    handleExercisesComplete();
  };

  const handleSpeakingComplete = () => {
    setLessonState("flashcards");
  };

  const handleTryNextLevel = (nextLevel: string) => {
    setSelectedLevel(nextLevel);
    setLessonState("exercises");
  };

  const handleSkipToFlashcards = () => {
    setLessonState("flashcards");
  };

  const handleFlashcardsComplete = (count?: number) => {
    setLessonStats((prev) => ({ ...prev, flashcardsCount: count || 5 }));

    if (isSegmented && scenes.length > 0) {
      const newCompleted = [...completedScenes];
      if (!newCompleted.includes(currentSceneIndex)) {
        newCompleted.push(currentSceneIndex);
      }
      setCompletedScenes(newCompleted);

      const nextIncomplete = scenes.findIndex(
        (s) => !newCompleted.includes(s.scene_index) && s.scene_index > currentSceneIndex
      );

      if (nextIncomplete >= 0) {
        setCurrentSceneIndex(nextIncomplete);
        saveSceneProgress(nextIncomplete, newCompleted);
        trackEvent("scene_completed", {
          video_id: videoId,
          scene_index: currentSceneIndex,
          total_scenes: scenes.length,
        });
        setLessonState("scene-video");
        return;
      }

      saveSceneProgress(currentSceneIndex, newCompleted);
      trackEvent("all_scenes_completed", { video_id: videoId, total_scenes: scenes.length });
    }

    if (isAssignment && videoId) {
      markAssignmentCompleted(videoId);
    }
    setLessonState("complete");
  };

  const handleSceneSelect = (sceneIndex: number) => {
    setCurrentSceneIndex(sceneIndex);
    setLessonState("scene-video");
  };

  const handleNextVideo = async () => {
    if (!videoId) { navigate("/library"); return; }
    setNextVideoLoading(true);
    try {
      const { data: currentVideo } = await supabase
        .from("youtube_videos")
        .select("id, category, is_short, difficulty_level")
        .eq("video_id", videoId)
        .single();

      if (!currentVideo) { navigate("/library"); return; }

      const { data: weekVideoLinks } = await supabase
        .from("week_videos")
        .select("linked_video_id")
        .not("linked_video_id", "is", null);

      const excludeIds = new Set<string>(
        (weekVideoLinks || []).map((wv) => wv.linked_video_id).filter(Boolean) as string[]
      );
      excludeIds.add(currentVideo.id);

      const { data: candidates } = await supabase
        .from("youtube_videos")
        .select("id, video_id, category, is_short, difficulty_level")
        .eq("status", "ready")
        .neq("video_id", videoId)
        .limit(100);

      if (!candidates || candidates.length === 0) { navigate("/library"); return; }

      const communityVideos = candidates.filter((v) => !excludeIds.has(v.id));
      if (communityVideos.length === 0) { navigate("/library"); return; }

      const scored = communityVideos.map((v) => {
        let score = 0;
        if (v.category && v.category === currentVideo.category) score += 3;
        if (v.is_short === currentVideo.is_short) score += 2;
        if (v.difficulty_level === currentVideo.difficulty_level) score += 1;
        score += Math.random() * 0.5;
        return { ...v, score };
      });
      scored.sort((a, b) => b.score - a.score);

      trackEvent("next_video_recommended", {
        from_video: videoId,
        to_video: scored[0].video_id,
        score: scored[0].score,
      });

      navigate(`/lesson/${scored[0].video_id}`);
    } catch (error) {
      console.error("Error finding next video:", error);
      navigate("/library");
    } finally {
      setNextVideoLoading(false);
    }
  };

  const handleBackToLibrary = () => navigate("/library");
  const handleViewProgress = () => navigate("/profile");
  const handleRetry = () => {
    setLessonState("loading");
    initLesson();
  };

  if (!videoId) {
    navigate("/library");
    return null;
  }

  const currentScene = isSegmented && scenes.length > 0 ? scenes[currentSceneIndex] : null;

  // Wrap per-scene content with SceneNavigator sidebar
  const renderWithSceneNav = (content: React.ReactNode) => {
    if (!isSegmented || scenes.length === 0) return content;
    return (
      <div className="flex flex-col lg:flex-row gap-4 p-4">
        <div className="lg:w-64 flex-shrink-0 order-2 lg:order-1">
          <div className="lg:sticky lg:top-4">
            <SceneNavigator
              scenes={scenes}
              currentSceneIndex={currentSceneIndex}
              completedScenes={completedScenes}
              onSceneSelect={handleSceneSelect}
            />
          </div>
        </div>
        <div className="flex-1 order-1 lg:order-2">
          {currentScene && (
            <div className="mb-4 px-2">
              <p className="text-sm text-muted-foreground">
                Scene {currentSceneIndex + 1} of {scenes.length}:{" "}
                <span className="font-medium text-foreground">{currentScene.scene_title}</span>
              </p>
            </div>
          )}
          {content}
        </div>
      </div>
    );
  };

  // Back to library button
  const BackButton = () => (
    <div className="absolute top-4 left-4 z-10">
      <Button variant="ghost" size="sm" onClick={handleBackToLibrary} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Library
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background relative">
      {/* Back button visible during all lesson states except complete */}
      {lessonState !== "complete" && lessonState !== "loading" && <BackButton />}

      {/* Level selection popup */}
      <Dialog open={showLevelPopup} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>What's your level?</DialogTitle>
            <DialogDescription>
              Choose your proficiency level. This will be used for all exercises on the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 pt-2">
            {[
              { value: "beginner", label: "🌱 Beginner", desc: "I'm just starting out" },
              { value: "intermediate", label: "📚 Intermediate", desc: "I can have basic conversations" },
              { value: "advanced", label: "🎯 Advanced", desc: "I want to refine my skills" },
            ].map((opt) => (
              <Button
                key={opt.value}
                variant="outline"
                className="h-auto py-4 flex flex-col items-start text-left"
                onClick={() => handleLevelSelect(opt.value)}
              >
                <span className="font-medium text-base">{opt.label}</span>
                <span className="text-sm text-muted-foreground">{opt.desc}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Loading / Preparing screen */}
      {lessonState === "loading" && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-lg font-medium text-foreground">Preparing your lesson...</p>
            <p className="text-sm text-muted-foreground">Analyzing video scenes</p>
          </div>
        </div>
      )}

      {/* Scene video + transcript */}
      {lessonState === "scene-video" && currentScene && youtubeVideoId && (
        renderWithSceneNav(
          <div>
            <LessonVideoPlayer
              key={`scene-video-${currentSceneIndex}`}
              video={{
                youtubeId: youtubeVideoId,
                startTime: Math.floor(currentScene.start_time),
                duration: Math.floor(currentScene.end_time - currentScene.start_time),
                suggestedSpeed: 1,
              }}
              onComplete={handleSceneVideoComplete}
            />
            {/* Scene-specific transcript */}
            {currentScene.scene_transcript && dbVideoId && (
              <div className="max-w-3xl mx-auto px-3 md:px-8 pb-6">
                <TranscriptViewer
                  videoId={dbVideoId}
                  transcript={currentScene.scene_transcript}
                  videoTitle={videoTitle}
                  language={videoLanguage}
                  isPremium={true}
                  onUpgradeClick={() => navigate("/premium")}
                />
              </div>
            )}
          </div>
        )
      )}

      {/* Non-segmented scene-video fallback (short videos skip to exercises) */}
      {lessonState === "scene-video" && !currentScene && youtubeVideoId && (
        <div>
          <LessonVideoPlayer
            video={{
              youtubeId: youtubeVideoId,
              startTime: 0,
              duration: 120,
              suggestedSpeed: 1,
            }}
            onComplete={handleSceneVideoComplete}
          />
        </div>
      )}

      {/* Exercises */}
      {lessonState === "exercises" && (
        isSegmented ? renderWithSceneNav(
          <YouTubeExercises
            key={`${videoId}-${selectedLevel}-${currentSceneIndex}`}
            videoId={videoId}
            level={selectedLevel}
            intensity="intense"
            onBack={handleBackToLibrary}
            onComplete={handleExercisesComplete}
            onContinueToSpeaking={handleContinueToSpeaking}
            onTryNextLevel={handleTryNextLevel}
            onSkipToFlashcards={handleSkipToFlashcards}
            sceneId={currentScene?.id}
            sceneTranscript={currentScene?.scene_transcript}
          />
        ) : (
          <YouTubeExercises
            key={`${videoId}-${selectedLevel}`}
            videoId={videoId}
            level={selectedLevel}
            intensity="intense"
            onBack={handleBackToLibrary}
            onComplete={handleExercisesComplete}
            onContinueToSpeaking={handleContinueToSpeaking}
            onTryNextLevel={handleTryNextLevel}
            onSkipToFlashcards={handleSkipToFlashcards}
          />
        )
      )}

      {/* Speaking */}
      {lessonState === "speaking" && (
        isSegmented ? renderWithSceneNav(
          <YouTubeSpeaking
            videoId={videoId}
            level={selectedLevel}
            onComplete={handleSpeakingComplete}
            onBack={handleBackToLibrary}
          />
        ) : (
          <YouTubeSpeaking
            videoId={videoId}
            level={selectedLevel}
            onComplete={handleSpeakingComplete}
            onBack={handleBackToLibrary}
          />
        )
      )}

      {/* Flashcards */}
      {lessonState === "flashcards" && (
        isSegmented ? renderWithSceneNav(
          <VideoFlashcards
            videoId={videoId}
            level={selectedLevel}
            onComplete={() => handleFlashcardsComplete()}
            onBack={handleBackToLibrary}
          />
        ) : (
          <VideoFlashcards
            videoId={videoId}
            level={selectedLevel}
            onComplete={() => handleFlashcardsComplete()}
            onBack={handleBackToLibrary}
          />
        )
      )}

      {/* Complete */}
      {lessonState === "complete" && (
        <LessonCompleteScreen
          exerciseScore={lessonStats.exerciseScore}
          totalExercises={lessonStats.totalExercises}
          exerciseAccuracy={lessonStats.exerciseAccuracy}
          flashcardsCount={lessonStats.flashcardsCount}
          onNextVideo={handleNextVideo}
          onViewProgress={handleViewProgress}
          onRetry={handleRetry}
          onBackToLibrary={handleBackToLibrary}
          nextVideoLoading={nextVideoLoading}
        />
      )}
    </div>
  );
}
