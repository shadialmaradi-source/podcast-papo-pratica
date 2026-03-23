import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { seedVideoIdCache } from "@/utils/videoResolver";
import { useAuth } from "@/hooks/useAuth";
import { trackEvent, trackPageView, trackFunnelStep } from "@/lib/analytics";
import { toast } from "@/hooks/use-toast";
import type { VideoScene } from "@/components/lesson/SceneNavigator";

export type LessonState = "loading" | "scene-video" | "exercises" | "speaking" | "flashcards" | "complete";

export interface LessonStats {
  exerciseScore: number;
  totalExercises: number;
  exerciseAccuracy: number;
  flashcardsCount: number;
}

function mapLevel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower === "absolute_beginner" || lower === "beginner") return "beginner";
  if (lower === "intermediate") return "intermediate";
  if (lower === "advanced") return "advanced";
  return null;
}

interface ResolvedVideo {
  id: string;
  video_id: string;
  title: string | null;
  language: string | null;
  duration: number | null;
}

export function useLessonFlow(videoId: string | undefined) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isAssignment = searchParams.get("assignment") === "true";

  // Cache resolved video data to avoid redundant DB reads
  const resolvedVideoRef = useRef<ResolvedVideo | null>(null);

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

  const [scenes, setScenes] = useState<VideoScene[]>([]);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [completedScenes, setCompletedScenes] = useState<number[]>([]);
  const [isSegmented, setIsSegmented] = useState(false);
  const [dbVideoId, setDbVideoId] = useState<string | null>(null);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoLanguage, setVideoLanguage] = useState("italian");
  const [videoDuration, setVideoDuration] = useState<number>(120);

  useEffect(() => {
    trackPageView("lesson", "student");
    trackFunnelStep("lesson", "preparing", 0, { video_id: videoId });
    if (isAssignment && videoId) markAssignmentInProgress(videoId);
  }, [videoId, isAssignment]);

  useEffect(() => {
    if (!videoId) return;
    initLesson();
  }, [videoId]);

  // Scroll to top on scene-video entry
  useEffect(() => {
    if (lessonState === "scene-video") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [lessonState, currentSceneIndex]);

  const resolveVideoData = async (): Promise<ResolvedVideo | null> => {
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
    // Cache for reuse
    resolvedVideoRef.current = videoData as ResolvedVideo | null;
    // Seed the shared videoResolver cache so exercises/speaking/flashcards get cache hits
    if (videoData) {
      seedVideoIdCache(videoData.video_id, videoData.id);
    }
    return videoData as ResolvedVideo | null;
  };

  const [nativeLanguage, setNativeLanguage] = useState<string>("");

  const resolveLevel = async (): Promise<string | null> => {
    const localLevel = mapLevel(localStorage.getItem("onboarding_level"));
    if (localLevel) return localLevel;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_level, native_language")
        .eq("user_id", user.id)
        .single();
      // Capture native_language while we're here to share with children
      if (profile?.native_language) setNativeLanguage(profile.native_language);
      const profileLevel = mapLevel(profile?.current_level);
      if (profileLevel) return profileLevel;
    }
    return null;
  };

  const loadSceneProgress = async (videoDbId: string): Promise<{ currentScene: number; completed: number[] }> => {
    try {
      if (!user) return { currentScene: 0, completed: [] };
      const { data: progress } = await supabase
        .from("user_scene_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("video_id", videoDbId)
        .single();
      if (progress) {
        setCurrentSceneIndex(progress.current_scene);
        setCompletedScenes(progress.completed_scenes || []);
        return { currentScene: progress.current_scene, completed: progress.completed_scenes || [] };
      }
    } catch (err) {
      console.error("Error loading scene progress:", err);
    }
    return { currentScene: 0, completed: [] };
  };

  const saveSceneProgress = useCallback(async (sceneIdx: number, completed: number[]) => {
    try {
      if (!user || !dbVideoId) return;
      await supabase
        .from("user_scene_progress")
        .upsert({
          user_id: user.id,
          video_id: dbVideoId,
          current_scene: sceneIdx,
          completed_scenes: completed,
          last_timestamp: scenes[sceneIdx]?.start_time || 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,video_id" });
    } catch (err) {
      console.error("Error saving scene progress:", err);
    }
  }, [dbVideoId, scenes, user]);

  const trySegmentVideo = async (videoDbId: string, _level: string, persistedCompleted?: number[]) => {
    setLessonState("loading");
    const completedToUse = persistedCompleted || completedScenes;
    try {
      // Use cached duration from resolvedVideoRef instead of re-fetching
      const cached = resolvedVideoRef.current;
      const duration = (cached && cached.id === videoDbId ? cached.duration : null) || 120;
      setVideoDuration(duration);
      if (duration <= 120) {
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
        (s: VideoScene) => !completedToUse.includes(s.scene_index)
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

  const initLesson = async () => {
    setLessonState("loading");
    const videoData = await resolveVideoData();
    if (!videoData) { navigate("/library"); return; }
    setDbVideoId(videoData.id);
    setYoutubeVideoId(videoData.video_id);
    setVideoTitle(videoData.title || "");
    setVideoLanguage(videoData.language || "italian");
    const sceneProgress = await loadSceneProgress(videoData.id);
    const level = await resolveLevel();
    if (!level) { setShowLevelPopup(true); return; }
    setSelectedLevel(level);
    trackEvent("video_started", { video_id: videoId, difficulty_level: level });
    await trySegmentVideo(videoData.id, level, sceneProgress.completed);
  };

  const handleLevelSelect = async (level: string) => {
    setShowLevelPopup(false);
    setSelectedLevel(level);
    localStorage.setItem("onboarding_level", level);
    if (user) {
      await supabase.from("profiles").update({ current_level: level }).eq("user_id", user.id);
    }
    if (dbVideoId) {
      trackEvent("video_started", { video_id: videoId, difficulty_level: level });
      await trySegmentVideo(dbVideoId, level, []);
    }
  };

  // Assignment helpers — use cached video_id and user from context
  const markAssignmentInProgress = async (vid: string) => {
    try {
      if (!user?.email) return;
      // Use cached video_id if available, otherwise use the input
      const cached = resolvedVideoRef.current;
      const ytId = (cached && cached.id === vid) ? cached.video_id : vid;
      await supabase
        .from("video_assignments" as any)
        .update({ status: "in_progress" } as any)
        .eq("student_email", user.email)
        .eq("video_id", ytId)
        .eq("status", "assigned");
    } catch (err) {
      console.error("Error updating assignment status:", err);
    }
  };

  const markAssignmentCompleted = async (vid: string) => {
    try {
      if (!user?.email) return;
      const cached = resolvedVideoRef.current;
      const ytId = (cached && cached.id === vid) ? cached.video_id : vid;
      await supabase
        .from("video_assignments" as any)
        .update({ status: "completed", completed_at: new Date().toISOString() } as any)
        .eq("student_email", user.email)
        .eq("video_id", ytId)
        .neq("status", "completed");
      trackEvent("assignment_completed", { video_id: vid });
    } catch (err) {
      console.error("Error completing assignment:", err);
    }
  };

  // Step handlers
  const handleSceneVideoComplete = () => {
    trackEvent("scene_video_watched", {
      video_id: videoId,
      scene_index: currentSceneIndex,
      total_scenes: scenes.length,
    });
    setLessonState("exercises");
  };

  const handleExercisesComplete = () => setLessonState("speaking");

  const handleContinueToSpeaking = (_vid: string, level: string) => {
    setSelectedLevel(level);
    handleExercisesComplete();
  };

  const handleSpeakingComplete = () => setLessonState("flashcards");
  const handleTryNextLevel = (nextLevel: string) => {
    setSelectedLevel(nextLevel);
    setLessonState("exercises");
  };
  const handleSkipToFlashcards = () => setLessonState("flashcards");

  const handleFlashcardsComplete = (count?: number) => {
    setLessonStats((prev) => ({ ...prev, flashcardsCount: count || 5 }));
    if (isSegmented && scenes.length > 0) {
      const newCompleted = [...completedScenes];
      if (!newCompleted.includes(currentSceneIndex)) newCompleted.push(currentSceneIndex);
      setCompletedScenes(newCompleted);
      const nextIncomplete = scenes.findIndex(
        (s) => !newCompleted.includes(s.scene_index) && s.scene_index > currentSceneIndex
      );
      if (nextIncomplete >= 0) {
        setCurrentSceneIndex(nextIncomplete);
        saveSceneProgress(nextIncomplete, newCompleted);
        trackEvent("scene_completed", { video_id: videoId, scene_index: currentSceneIndex, total_scenes: scenes.length });
        setLessonState("scene-video");
        return;
      }
      saveSceneProgress(currentSceneIndex, newCompleted);
      trackEvent("all_scenes_completed", { video_id: videoId, total_scenes: scenes.length });
    }
    if (isAssignment && videoId) markAssignmentCompleted(videoId);
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

      trackEvent("next_video_recommended", { from_video: videoId, to_video: scored[0].video_id, score: scored[0].score });
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

  const currentScene = isSegmented && scenes.length > 0 ? scenes[currentSceneIndex] : null;

  return {
    lessonState,
    selectedLevel,
    nextVideoLoading,
    showLevelPopup,
    lessonStats,
    scenes,
    currentSceneIndex,
    completedScenes,
    isSegmented,
    dbVideoId,
    youtubeVideoId,
    videoTitle,
    videoLanguage,
    videoDuration,
    currentScene,
    isAssignment,
    // Handlers
    handleLevelSelect,
    handleSceneVideoComplete,
    handleExercisesComplete,
    handleContinueToSpeaking,
    handleSpeakingComplete,
    handleTryNextLevel,
    handleSkipToFlashcards,
    handleFlashcardsComplete,
    handleSceneSelect,
    handleNextVideo,
    handleBackToLibrary,
    handleViewProgress,
    handleRetry,
  };
}
