import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import YouTubeVideoExercises from "@/components/YouTubeVideoExercises";
import { YouTubeExercises } from "@/components/YouTubeExercises";
import { YouTubeSpeaking } from "@/components/YouTubeSpeaking";
import VideoFlashcards from "@/components/VideoFlashcards";
import LessonCompleteScreen from "@/components/lesson/LessonCompleteScreen";
import { trackEvent, trackPageView, trackFunnelStep } from "@/lib/analytics";

type LessonState = "select-level" | "exercises" | "speaking" | "flashcards" | "complete";

interface LessonStats {
  exerciseScore: number;
  totalExercises: number;
  exerciseAccuracy: number;
  flashcardsCount: number;
}

export default function Lesson() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const [lessonState, setLessonState] = useState<LessonState>("select-level");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [nextVideoLoading, setNextVideoLoading] = useState(false);
  const [lessonStats, setLessonStats] = useState<LessonStats>({
    exerciseScore: 0,
    totalExercises: 10,
    exerciseAccuracy: 0,
    flashcardsCount: 5,
  });

  useEffect(() => {
    trackPageView("lesson", "student");
    trackFunnelStep("lesson", "select_level", 0, { video_id: videoId });
  }, [videoId]);

    if (lessonState === "select-level") {
      navigate("/library");
    } else if (lessonState === "exercises") {
      setLessonState("select-level");
      setSelectedLevel("");
    } else if (lessonState === "speaking") {
      setLessonState("exercises");
    } else if (lessonState === "flashcards") {
      setLessonState("speaking");
    }
  };

  const handleStartExercises = (level: string) => {
    trackEvent('video_started', {
      video_id: videoId,
      difficulty_level: level,
      timestamp: new Date().toISOString()
    });
    trackEvent('level_selected', { video_id: videoId, level });
    setSelectedLevel(level);
    setLessonState("exercises");
  };

  const handleExercisesComplete = () => {
    setLessonState("speaking");
  };

  const handleContinueToSpeaking = (vid: string, level: string) => {
    setSelectedLevel(level);
    setLessonState("speaking");
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
    setLessonState("complete");
  };

  const handleNextVideo = async () => {
    if (!videoId) {
      navigate("/library");
      return;
    }

    setNextVideoLoading(true);
    try {
      // 1. Fetch current video metadata
      const { data: currentVideo } = await supabase
        .from('youtube_videos')
        .select('id, category, is_short, difficulty_level')
        .eq('video_id', videoId)
        .single();

      if (!currentVideo) {
        navigate("/library");
        return;
      }

      // 2. Get IDs of videos linked to the curated learning path (exclude them)
      const { data: weekVideoLinks } = await supabase
        .from('week_videos')
        .select('linked_video_id')
        .not('linked_video_id', 'is', null);

      const excludeIds = new Set<string>(
        (weekVideoLinks || []).map(wv => wv.linked_video_id).filter(Boolean) as string[]
      );
      excludeIds.add(currentVideo.id);

      // 3. Fetch candidate community videos
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

      // Filter out curated learning path videos
      const communityVideos = candidates.filter(v => !excludeIds.has(v.id));

      if (communityVideos.length === 0) {
        navigate("/library");
        return;
      }

      // 4. Score each candidate by similarity
      const scored = communityVideos.map(v => {
        let score = 0;
        if (v.category && v.category === currentVideo.category) score += 3;
        if (v.is_short === currentVideo.is_short) score += 2;
        if (v.difficulty_level === currentVideo.difficulty_level) score += 1;
        // Add small random factor for variety
        score += Math.random() * 0.5;
        return { ...v, score };
      });

      scored.sort((a, b) => b.score - a.score);
      const nextVideo = scored[0];

      trackEvent('next_video_recommended', {
        from_video: videoId,
        to_video: nextVideo.video_id,
        score: nextVideo.score,
        same_category: nextVideo.category === currentVideo.category,
        same_is_short: nextVideo.is_short === currentVideo.is_short,
      });

      navigate(`/lesson/${nextVideo.video_id}`);
    } catch (error) {
      console.error('Error finding next video:', error);
      navigate("/library");
    } finally {
      setNextVideoLoading(false);
    }
  };

  const handleViewProgress = () => {
    navigate("/profile");
  };

  const handleRetry = () => {
    setLessonState("select-level");
    setSelectedLevel("");
  };

  const handleBackToLibrary = () => {
    navigate("/library");
  };

  if (!videoId) {
    navigate("/library");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {lessonState === "select-level" && (
        <YouTubeVideoExercises
          videoId={videoId}
          onBack={handleBack}
          onStartExercises={handleStartExercises}
        />
      )}

      {lessonState === "exercises" && (
        <YouTubeExercises
          videoId={videoId}
          level={selectedLevel}
          intensity="intense"
          onBack={handleBack}
          onComplete={handleExercisesComplete}
          onContinueToSpeaking={handleContinueToSpeaking}
          onTryNextLevel={handleTryNextLevel}
          onSkipToFlashcards={handleSkipToFlashcards}
        />
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
