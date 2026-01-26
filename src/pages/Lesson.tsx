import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import YouTubeVideoExercises from "@/components/YouTubeVideoExercises";
import { YouTubeExercises } from "@/components/YouTubeExercises";
import { YouTubeSpeaking } from "@/components/YouTubeSpeaking";
import VideoFlashcards from "@/components/VideoFlashcards";
import LessonCompleteScreen from "@/components/lesson/LessonCompleteScreen";
import { trackEvent } from "@/lib/analytics";

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
  const [lessonStats, setLessonStats] = useState<LessonStats>({
    exerciseScore: 0,
    totalExercises: 10,
    exerciseAccuracy: 0,
    flashcardsCount: 5,
  });

  const handleBack = () => {
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
    // Track video/lesson started
    trackEvent('video_started', {
      video_id: videoId,
      difficulty_level: level,
      timestamp: new Date().toISOString()
    });
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

  const handleFlashcardsComplete = (count?: number) => {
    // Update lesson stats with flashcard count
    setLessonStats(prev => ({
      ...prev,
      flashcardsCount: count || 5,
    }));
    setLessonState("complete");
  };

  const handleNextVideo = () => {
    navigate("/library");
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
        />
      )}
    </div>
  );
}
