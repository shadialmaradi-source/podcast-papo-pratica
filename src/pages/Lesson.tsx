import { useParams, useNavigate } from "react-router-dom";
import { YouTubeExercises } from "@/components/YouTubeExercises";
import { YouTubeSpeaking } from "@/components/YouTubeSpeaking";
import VideoFlashcards from "@/components/VideoFlashcards";
import LessonCompleteScreen from "@/components/lesson/LessonCompleteScreen";
import LessonVideoPlayer from "@/components/lesson/LessonVideoPlayer";
import SceneNavigator from "@/components/lesson/SceneNavigator";
import { TranscriptViewer } from "@/components/transcript/TranscriptViewer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLessonFlow } from "@/hooks/useLessonFlow";

export default function Lesson() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();

  const flow = useLessonFlow(videoId);

  if (!videoId) {
    navigate("/library");
    return null;
  }

  const {
    lessonState, selectedLevel, nextVideoLoading, showLevelPopup, lessonStats,
    scenes, currentSceneIndex, completedScenes, isSegmented, dbVideoId,
    youtubeVideoId, videoTitle, videoLanguage, videoDuration, currentScene,
    handleLevelSelect, handleSceneVideoComplete, handleContinueToSpeaking,
    handleTryNextLevel, handleSkipToFlashcards, handleFlashcardsComplete,
    handleSceneSelect, handleNextVideo, handleBackToLibrary, handleViewProgress,
    handleRetry,
  } = flow;

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
      {lessonState !== "complete" && lessonState !== "loading" && <BackButton />}

      <Dialog open={showLevelPopup} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>What's your level?</DialogTitle>
            <DialogDescription>Choose your proficiency level. This will be used for all exercises on the platform.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 pt-2">
            {[
              { value: "beginner", label: "🌱 Beginner", desc: "I'm just starting out" },
              { value: "intermediate", label: "📚 Intermediate", desc: "I can have basic conversations" },
              { value: "advanced", label: "🎯 Advanced", desc: "I want to refine my skills" },
            ].map((opt) => (
              <Button key={opt.value} variant="outline" className="h-auto py-4 flex flex-col items-start text-left" onClick={() => handleLevelSelect(opt.value)}>
                <span className="font-medium text-base">{opt.label}</span>
                <span className="text-sm text-muted-foreground">{opt.desc}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {lessonState === "loading" && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-lg font-medium text-foreground">Preparing your lesson...</p>
            <p className="text-sm text-muted-foreground">Analyzing video scenes</p>
          </div>
        </div>
      )}

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

      {lessonState === "scene-video" && !currentScene && youtubeVideoId && (
        <div>
          <LessonVideoPlayer
            video={{
              youtubeId: youtubeVideoId,
              startTime: 0,
              duration: videoDuration,
              suggestedSpeed: 1,
            }}
            onComplete={handleSceneVideoComplete}
          />
        </div>
      )}

      {lessonState === "exercises" && (
        isSegmented ? renderWithSceneNav(
          <YouTubeExercises
            key={`${videoId}-${selectedLevel}-${currentSceneIndex}`}
            videoId={videoId}
            level={selectedLevel}
            intensity="intense"
            onBack={handleBackToLibrary}
            onComplete={() => flow.handleExercisesComplete()}
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
            onComplete={() => flow.handleExercisesComplete()}
            onContinueToSpeaking={handleContinueToSpeaking}
            onTryNextLevel={handleTryNextLevel}
            onSkipToFlashcards={handleSkipToFlashcards}
          />
        )
      )}

      {lessonState === "speaking" && (
        isSegmented ? renderWithSceneNav(
          <YouTubeSpeaking videoId={videoId} level={selectedLevel} onComplete={flow.handleSpeakingComplete} onBack={handleBackToLibrary} sceneId={currentScene?.id} sceneTranscript={currentScene?.scene_transcript} />
        ) : (
          <YouTubeSpeaking videoId={videoId} level={selectedLevel} onComplete={flow.handleSpeakingComplete} onBack={handleBackToLibrary} />
        )
      )}

      {lessonState === "flashcards" && (
        isSegmented ? renderWithSceneNav(
          <VideoFlashcards videoId={videoId} level={selectedLevel} onComplete={() => handleFlashcardsComplete()} onBack={handleBackToLibrary} sceneTranscript={currentScene?.scene_transcript} dbVideoId={dbVideoId} />
        ) : (
          <VideoFlashcards videoId={videoId} level={selectedLevel} onComplete={() => handleFlashcardsComplete()} onBack={handleBackToLibrary} />
        )
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
