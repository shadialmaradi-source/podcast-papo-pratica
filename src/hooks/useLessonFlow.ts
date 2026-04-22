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

function normalizeScenes(rawScenes: VideoScene[]): VideoScene[] {
  return [...rawScenes]
    .sort((a, b) => (a.start_time - b.start_time) || (a.scene_index - b.scene_index))
    .map((scene, index) => ({
      ...scene,
      scene_index: index,
      scene_transcript: scene.scene_transcript || "",
    }));
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
  const [videoLanguage, setVideoLanguage] = useState("english");
  const [videoDuration, setVideoDuration] = useState<number>(120);
  const [segmentationStatus, setSegmentationStatus] = useState<{
    state: "idle" | "pending" | "failed";
    message: string | null;
  }>({ state: "idle", message: null });
  const MAX_SEGMENT_RETRIES = 8;

  const getCurrentUser = useCallback(async () => {
    if (user) return user;
    const { data: { user: authUser } } = await supabase.auth.getUser();
    return authUser;
  }, [user]);

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

  const authUser = await getCurrentUser();
  if (!authUser) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_level, native_language")
    .eq("user_id", authUser.id)
    .single();

  if (profile?.native_language) setNativeLanguage(profile.native_language);

  const profileLevel = mapLevel(profile?.current_level);
  if (profileLevel) return profileLevel;

  return null;
};

  const loadSceneProgress = async (videoDbId: string): Promise<{ currentScene: number; completed: number[] }> => {
    try {
      const authUser = await getCurrentUser();
      if (!authUser) return { currentScene: 0, completed: [] as number[] };
      const { data: progress } = await supabase
        .from("user_scene_progress")
        .select("*")
        .eq("user_id", authUser.id)
        .eq("video_id", videoDbId)
        .single();
      if (progress) {
        const completed = progress.completed_scenes || [];
        setCurrentSceneIndex(progress.current_scene);
        setCompletedScenes(completed);
        return { currentScene: progress.current_scene, completed };
      }
    } catch (err) {
      console.error("Error loading scene progress:", err);
    }

    return { currentScene: 0, completed: [] as number[] };
  };

  const saveSceneProgress = useCallback(async (sceneIdx: number, completed: number[]) => {
    try {
      const authUser = await getCurrentUser();
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
  }, [dbVideoId, scenes, getCurrentUser]);

  const trySegmentVideo = async (
    videoDbId: string,
    _level: string,
    persistedCompleted: number[] = [],
    knownDuration?: number | null,
    attempt: number = 0
  ) => {
    setLessonState("loading");
    try {
      const { data: storedScenes } = await supabase
        .from("video_scenes")
        .select("id, video_id, scene_index, start_time, end_time, scene_title, scene_transcript")
        .eq("video_id", videoDbId)
        .order("scene_index", { ascending: true });

      if (storedScenes && storedScenes.length > 0) {
        const normalizedScenes = normalizeScenes(storedScenes as VideoScene[]);
        const normalizedCompleted = normalizedScenes
          .filter((scene, index) => persistedCompleted.includes(scene.scene_index) || persistedCompleted.includes(index))
          .map((scene) => scene.scene_index);

        setScenes(normalizedScenes);
        setCompletedScenes(normalizedCompleted);
        setIsSegmented(true);
        setSegmentationStatus({ state: "idle", message: null });

        const firstIncomplete = normalizedScenes.findIndex(
          (s: VideoScene) => !normalizedCompleted.includes(s.scene_index)
        );
        setCurrentSceneIndex(firstIncomplete >= 0 ? firstIncomplete : 0);

        const derivedDuration = normalizedScenes[normalizedScenes.length - 1]?.end_time || knownDuration || 120;
        setVideoDuration(Math.max(derivedDuration, knownDuration || 120));
        setLessonState("scene-video");
        return;
      }

      let duration = knownDuration ?? null;

      // Fallback lookup when duration is not already available in state/caller.
      if (duration === null || duration === undefined) {
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
        duration = videoData.duration;
      }

      const resolvedDuration = duration || 120;
      setVideoDuration(resolvedDuration);
      const { data, error } = await supabase.functions.invoke("segment-video-scenes", {
        body: { videoId: videoDbId },
      });
      const reason = (data as { reason?: string; retryable?: boolean } | null)?.reason;
      const retryable = (data as { reason?: string; retryable?: boolean } | null)?.retryable ?? false;

      if (reason === "transcript_not_ready" && retryable) {
        console.info(`[useLessonFlow] Segmentation deferred (transcript_not_ready), attempt=${attempt + 1}`);
        setSegmentationStatus({
          state: "pending",
          message: "Transcript is still finalizing. Scene splits will appear automatically once ready.",
        });
        if (attempt < MAX_SEGMENT_RETRIES) {
          toast({
            title: "Segmenting video…",
            description: "Transcript is still finalizing. We'll retry scene generation in a few seconds.",
          });
          setTimeout(() => {
            void trySegmentVideo(videoDbId, _level, persistedCompleted, knownDuration, attempt + 1);
          }, 5000);
        } else {
          toast({
            title: "Scene segmentation not ready",
            description: "Transcript is still unavailable. You can continue now and try again later.",
            variant: "default",
          });
          setSegmentationStatus({
            state: "failed",
            message: "Scene generation timed out waiting for transcript.",
          });
        }
        setIsSegmented(false);
        setLessonState("scene-video");
        return;
      }

      if (reason === "transcript_failed" || reason === "transcript_stalled" || reason === "transcript_missing") {
        const statusMessage =
          reason === "transcript_missing"
            ? "We couldn't prepare scene splits for this lesson because the transcript is unavailable."
            : "We couldn't prepare scene splits for this lesson yet because transcript processing did not complete.";

        setSegmentationStatus({
          state: "failed",
          message: statusMessage,
        });
        toast({
          title: "Scenes unavailable",
          description: "You can continue with the full video now. We'll show scene splits after transcript processing is fixed.",
        });
        setIsSegmented(false);
        setLessonState("scene-video");
        return;
      }

      if (error || !data?.scenes || data.scenes.length === 0) {
        console.warn("[useLessonFlow] Scene segmentation unavailable", {
          videoDbId,
          reason,
          invokeError: error?.message || null,
          sceneCount: data?.scenes?.length || 0,
        });

        // Short videos are expected to remain in single-video mode.
        // Do not surface technical warnings to students for this valid case.
        if (reason === "video_too_short") {
          setSegmentationStatus({ state: "idle", message: null });
          setIsSegmented(false);
          setLessonState("scene-video");
          return;
        }

        setSegmentationStatus({
          state: "failed",
          message: reason ? `Scene generation unavailable (${reason}).` : "Scene generation unavailable.",
        });
        if (resolvedDuration > 120) {
          const errMessage = error?.message ? ` (${error.message})` : "";
          console.warn(`[useLessonFlow] Segmentation unavailable for ${videoDbId}${errMessage}`);
          toast({
            title: "Scenes unavailable",
            description: "Couldn't generate scene splits for this video right now.",
          });
        }
        setIsSegmented(false);
        setLessonState("scene-video");
        return;
      }
      const normalizedScenes = normalizeScenes(data.scenes as VideoScene[]);
      const normalizedCompleted = normalizedScenes
        .filter((scene, index) => persistedCompleted.includes(scene.scene_index) || persistedCompleted.includes(index))
        .map((scene) => scene.scene_index);

      setScenes(normalizedScenes);
      setCompletedScenes(normalizedCompleted);
      setIsSegmented(true);
      setSegmentationStatus({ state: "idle", message: null });
      const firstIncomplete = normalizedScenes.findIndex(
        (s: VideoScene) => !normalizedCompleted.includes(s.scene_index)
      );
      setCurrentSceneIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
      const derivedDuration = normalizedScenes[normalizedScenes.length - 1]?.end_time || resolvedDuration;
      setVideoDuration(Math.max(derivedDuration, resolvedDuration));
      toast({
        title: `${normalizedScenes.length} scenes detected 🎬`,
        description: "This video has been split into micro-lessons",
      });
      setLessonState("scene-video");
    } catch (err) {
      console.error("Segmentation error:", err);
      setSegmentationStatus({
        state: "failed",
        message: "Scene generation failed unexpectedly. Check function logs.",
      });
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
    setVideoLanguage(videoData.language || "english");
    setVideoDuration(videoData.duration || 120);
    const sceneProgress = await loadSceneProgress(videoData.id);
    const level = await resolveLevel();
    if (!level) { setShowLevelPopup(true); return; }
    setSelectedLevel(level);
    trackEvent("video_started", { video_id: videoId, difficulty_level: level });
    await trySegmentVideo(videoData.id, level, sceneProgress.completed, videoData.duration);
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
      await trySegmentVideo(dbVideoId, level, completedScenes, videoDuration);
    }
  };

  // Assignment helpers — use cached video_id and user from context
  const markAssignmentInProgress = async (vid: string) => {
  try {
    const authUser = await getCurrentUser();
    if (!authUser?.email) return;

    const cached = resolvedVideoRef.current;
    const ytId =
      cached?.id === vid || cached?.video_id === vid
        ? cached.video_id
        : vid;

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
    const authUser = await getCurrentUser();
    if (!authUser?.email) return;

    const cached = resolvedVideoRef.current;
    const ytId =
      cached?.id === vid || cached?.video_id === vid
        ? cached.video_id
        : vid;

    await supabase
      .from("video_assignments" as any)
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      } as any)
      .eq("student_email", authUser.email)
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

  const hasSceneData = isSegmented && scenes.length > 0;
  const currentScene = hasSceneData ? scenes[currentSceneIndex] : null;

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
    segmentationStatus,
    currentScene,
    isAssignment,
    nativeLanguage,
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
