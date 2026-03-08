import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import YouTubeVideoExercises from "@/components/YouTubeVideoExercises";
import { YouTubeExercises } from "@/components/YouTubeExercises";
import { YouTubeSpeaking } from "@/components/YouTubeSpeaking";
import VideoFlashcards from "@/components/VideoFlashcards";
import LessonCompleteScreen from "@/components/lesson/LessonCompleteScreen";
import SceneNavigator, { type VideoScene } from "@/components/lesson/SceneNavigator";
import { trackEvent, trackPageView, trackFunnelStep } from "@/lib/analytics";
import { toast } from "@/hooks/use-toast";

type LessonState = "select-level" | "loading-scenes" | "exercises" | "speaking" | "flashcards" | "complete";

interface LessonStats {
  exerciseScore: number;
  totalExercises: number;
  exerciseAccuracy: number;
  flashcardsCount: number;
}

export default function Lesson() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAssignment = searchParams.get("assignment") === "true";
  const [lessonState, setLessonState] = useState<LessonState>("select-level");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [nextVideoLoading, setNextVideoLoading] = useState(false);
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

  useEffect(() => {
    trackPageView("lesson", "student");
    trackFunnelStep("lesson", "select_level", 0, { video_id: videoId });
    if (isAssignment && videoId) {
      markAssignmentInProgress(videoId);
    }
  }, [videoId, isAssignment]);

  const markAssignmentInProgress = async (vid: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      // Look up the youtube video_id string from the UUID
      const { data: videoData } = await supabase.from("youtube_videos").select("video_id").eq("id", vid).single();
      const ytId = videoData?.video_id || vid;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;
      const { data: videoData } = await supabase.from("youtube_videos").select("video_id").eq("id", vid).single();
      const ytId = videoData?.video_id || vid;
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

  // Load scene progress on mount
  useEffect(() => {
    if (!videoId) return;
    loadSceneProgress();
  }, [videoId]);

  const loadSceneProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Resolve DB video id
      let { data: videoData } = await supabase
        .from('youtube_videos')
        .select('id')
        .eq('video_id', videoId!)
        .single();

      if (!videoData) {
        const { data: byId } = await supabase
          .from('youtube_videos')
          .select('id')
          .eq('id', videoId!)
          .single();
        videoData = byId;
      }

      if (!videoData) return;
      setDbVideoId(videoData.id);

      // Load existing progress
      const { data: progress } = await supabase
        .from('user_scene_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('video_id', videoData.id)
        .single();

      if (progress) {
        setCurrentSceneIndex(progress.current_scene);
        setCompletedScenes(progress.completed_scenes || []);
      }
    } catch (err) {
      console.error('Error loading scene progress:', err);
    }
  };

  const saveSceneProgress = useCallback(async (sceneIdx: number, completed: number[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !dbVideoId) return;

      await supabase
        .from('user_scene_progress')
        .upsert({
          user_id: user.id,
          video_id: dbVideoId,
          current_scene: sceneIdx,
          completed_scenes: completed,
          last_timestamp: scenes[sceneIdx]?.start_time || 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,video_id' });
    } catch (err) {
      console.error('Error saving scene progress:', err);
    }
  }, [dbVideoId, scenes]);

  const handleBack = () => {
    if (lessonState === "select-level") {
      navigate("/library");
    } else if (lessonState === "exercises") {
      if (isSegmented && currentSceneIndex > 0) {
        // Go back to previous scene
        setCurrentSceneIndex(prev => prev - 1);
      } else {
        setLessonState("select-level");
        setSelectedLevel("");
      }
    } else if (lessonState === "speaking") {
      setLessonState("exercises");
    } else if (lessonState === "flashcards") {
      setLessonState("speaking");
    }
  };

  const handleStartExercises = async (level: string) => {
    trackEvent('video_started', {
      video_id: videoId,
      difficulty_level: level,
      timestamp: new Date().toISOString()
    });
    trackEvent('level_selected', { video_id: videoId, level });
    setSelectedLevel(level);

    // Check if segmentation is needed
    if (dbVideoId) {
      await trySegmentVideo(dbVideoId, level);
    } else {
      setLessonState("exercises");
    }
  };

  const trySegmentVideo = async (videoDbId: string, level: string) => {
    setLessonState("loading-scenes");
    try {
      // Check video duration first
      const { data: videoData } = await supabase
        .from('youtube_videos')
        .select('duration')
        .eq('id', videoDbId)
        .single();

      if (!videoData) {
        setIsSegmented(false);
        setLessonState("exercises");
        return;
      }

      // If duration is known and short, skip segmentation
      if (videoData.duration !== null && videoData.duration <= 120) {
        setIsSegmented(false);
        setLessonState("exercises");
        return;
      }

      // Call segmentation
      const { data, error } = await supabase.functions.invoke('segment-video-scenes', {
        body: { videoId: videoDbId }
      });

      if (error || !data?.scenes || data.scenes.length === 0) {
        console.log('No scenes generated, using single lesson flow');
        setIsSegmented(false);
        setLessonState("exercises");
        return;
      }

      setScenes(data.scenes);
      setIsSegmented(true);
      
      // Resume from saved progress
      const firstIncomplete = data.scenes.findIndex(
        (s: VideoScene) => !completedScenes.includes(s.scene_index)
      );
      setCurrentSceneIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
      
      toast({
        title: `${data.scenes.length} scenes detected 🎬`,
        description: "This video has been split into micro-lessons",
      });

      setLessonState("exercises");
    } catch (err) {
      console.error('Segmentation error:', err);
      setIsSegmented(false);
      setLessonState("exercises");
    }
  };

  const handleExercisesComplete = () => {
    if (isSegmented && scenes.length > 0) {
      // Mark current scene as completed
      const newCompleted = [...completedScenes];
      if (!newCompleted.includes(currentSceneIndex)) {
        newCompleted.push(currentSceneIndex);
      }
      setCompletedScenes(newCompleted);

      // Check if there are more scenes
      const nextIncomplete = scenes.findIndex(
        (s) => !newCompleted.includes(s.scene_index) && s.scene_index > currentSceneIndex
      );

      if (nextIncomplete >= 0) {
        // Move to next scene
        setCurrentSceneIndex(nextIncomplete);
        saveSceneProgress(nextIncomplete, newCompleted);
        trackEvent('scene_completed', {
          video_id: videoId,
          scene_index: currentSceneIndex,
          total_scenes: scenes.length,
        });
        // Stay in exercises — the key prop on YouTubeExercises includes currentSceneIndex,
        // so React will re-mount the component automatically
        return;
      }

      // All scenes done — proceed to speaking
      saveSceneProgress(currentSceneIndex, newCompleted);
      trackEvent('all_scenes_completed', { video_id: videoId, total_scenes: scenes.length });
    }
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
    setLessonStats(prev => ({
      ...prev,
      flashcardsCount: count || 5,
    }));
    if (isAssignment && videoId) {
      markAssignmentCompleted(videoId);
    }
    setLessonState("complete");
  };

  const handleSceneSelect = (sceneIndex: number) => {
    setCurrentSceneIndex(sceneIndex);
    // Key prop on YouTubeExercises includes currentSceneIndex, so it auto-remounts
  };

  const handleNextVideo = async () => {
    if (!videoId) {
      navigate("/library");
      return;
    }

    setNextVideoLoading(true);
    try {
      const { data: currentVideo } = await supabase
        .from('youtube_videos')
        .select('id, category, is_short, difficulty_level')
        .eq('video_id', videoId)
        .single();

      if (!currentVideo) {
        navigate("/library");
        return;
      }

      const { data: weekVideoLinks } = await supabase
        .from('week_videos')
        .select('linked_video_id')
        .not('linked_video_id', 'is', null);

      const excludeIds = new Set<string>(
        (weekVideoLinks || []).map(wv => wv.linked_video_id).filter(Boolean) as string[]
      );
      excludeIds.add(currentVideo.id);

      const { data: candidates } = await supabase
        .from('youtube_videos')
        .select('id, video_id, category, is_short, difficulty_level')
        .eq('status', 'ready')
        .neq('video_id', videoId)
        .limit(100);

      if (!candidates || candidates.length === 0) {
        navigate("/library");
        return;
      }

      const communityVideos = candidates.filter(v => !excludeIds.has(v.id));
      if (communityVideos.length === 0) {
        navigate("/library");
        return;
      }

      const scored = communityVideos.map(v => {
        let score = 0;
        if (v.category && v.category === currentVideo.category) score += 3;
        if (v.is_short === currentVideo.is_short) score += 2;
        if (v.difficulty_level === currentVideo.difficulty_level) score += 1;
        score += Math.random() * 0.5;
        return { ...v, score };
      });

      scored.sort((a, b) => b.score - a.score);
      const nextVideo = scored[0];

      trackEvent('next_video_recommended', {
        from_video: videoId,
        to_video: nextVideo.video_id,
        score: nextVideo.score,
      });

      navigate(`/lesson/${nextVideo.video_id}`);
    } catch (error) {
      console.error('Error finding next video:', error);
      navigate("/library");
    } finally {
      setNextVideoLoading(false);
    }
  };

  const handleViewProgress = () => navigate("/profile");
  const handleRetry = () => { setLessonState("select-level"); setSelectedLevel(""); };
  const handleBackToLibrary = () => navigate("/library");

  if (!videoId) {
    navigate("/library");
    return null;
  }

  const currentScene = isSegmented && scenes.length > 0 ? scenes[currentSceneIndex] : null;

  return (
    <div className="min-h-screen bg-background">
      {lessonState === "select-level" && (
        <YouTubeVideoExercises
          videoId={videoId}
          onBack={handleBack}
          onStartExercises={handleStartExercises}
        />
      )}

      {lessonState === "loading-scenes" && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">Analyzing video scenes...</p>
          </div>
        </div>
      )}

      {lessonState === "exercises" && (
        <div className="flex flex-col lg:flex-row gap-4 p-4">
          {isSegmented && scenes.length > 0 && (
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
          )}
          <div className={`flex-1 ${isSegmented ? 'order-1 lg:order-2' : ''}`}>
            {currentScene && (
              <div className="mb-4 px-2">
                <p className="text-sm text-muted-foreground">
                  Scene {currentSceneIndex + 1} of {scenes.length}: <span className="font-medium text-foreground">{currentScene.scene_title}</span>
                </p>
              </div>
            )}
            <YouTubeExercises
              key={`${videoId}-${selectedLevel}-${currentSceneIndex}`}
              videoId={videoId}
              level={selectedLevel}
              intensity="intense"
              onBack={handleBack}
              onComplete={handleExercisesComplete}
              onContinueToSpeaking={handleContinueToSpeaking}
              onTryNextLevel={handleTryNextLevel}
              onSkipToFlashcards={handleSkipToFlashcards}
              sceneId={currentScene?.id}
              sceneTranscript={currentScene?.scene_transcript}
            />
          </div>
        </div>
      )}

      {lessonState === "speaking" && (
        <YouTubeSpeaking
          videoId={videoId}
          level={selectedLevel}
          onComplete={handleSpeakingComplete}
          onBack={() => setLessonState("exercises")}
        />
      )}

      {lessonState === "flashcards" && (
        <VideoFlashcards
          videoId={videoId}
          level={selectedLevel}
          onComplete={() => handleFlashcardsComplete()}
          onBack={() => setLessonState("speaking")}
        />
      )}

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
