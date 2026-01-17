import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import YouTubeVideoExercises from "@/components/YouTubeVideoExercises";
import { YouTubeExercises } from "@/components/YouTubeExercises";
import { YouTubeSpeaking } from "@/components/YouTubeSpeaking";

type LessonState = "select-level" | "exercises" | "speaking" | "complete";

export default function Lesson() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const [lessonState, setLessonState] = useState<LessonState>("select-level");
  const [selectedLevel, setSelectedLevel] = useState("");

  const handleBack = () => {
    if (lessonState === "select-level") {
      navigate("/library");
    } else if (lessonState === "exercises") {
      setLessonState("select-level");
      setSelectedLevel("");
    } else if (lessonState === "speaking") {
      setLessonState("exercises");
    }
  };

  const handleStartExercises = (level: string) => {
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
    </div>
  );
}
