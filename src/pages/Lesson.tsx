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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLessonFlow } from "@/hooks/useLessonFlow";
import { Lock } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

export default function Lesson() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();

  const flow = useLessonFlow(videoId);
  const { isPremium } = useSubscription();

  if (!videoId) {
    navigate("/library");
    return null;
  }

  const {
    lessonState, selectedLevel, nextVideoLoading, showLevelPopup, lessonStats,
    scenes, currentSceneIndex, completedScenes, dbVideoId,
    youtubeVideoId, videoTitle, videoLanguage, videoDuration, currentScene,
    segmentationStatus,
    accessBlock,
    nativeLanguage,
    handleLevelSelect, handleSceneVideoComplete, handleContinueToSpeaking,
    handleTryNextLevel, handleSkipToFlashcards, handleFlashcardsComplete,
    handleSceneSelect, handleNextVideo, handleBackToLibrary, handleViewProgress,
    handleRetry,
  } = flow;
  const hasSceneData = scenes.length > 0;

  const renderWithSceneNav = (content: React.ReactNode) => {
    if (!hasSceneData) return content;
    return (
      <div className="flex flex-col lg:flex-row gap-4 px-4 pb-4">
        <div className="lg:w-64 flex-shrink-0 order-2 lg:order-1">
          <div className="lg:sticky lg:top-20">
            <SceneNavigator
              scenes={scenes}
              currentSceneIndex={currentSceneIndex}
              completedScenes={completedScenes}
              onSceneSelect={handleSceneSelect}
              maxAccessibleSceneIndex={!isPremium && !flow.isAssignment ? 2 : null}
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
    <div className="px-4 pt-4 pb-2">
      <Button variant="ghost" size="sm" onClick={handleBackToLibrary} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Library
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {lessonState !== "complete" && lessonState !== "loading" && <BackButton />}

      {accessBlock && (
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="rounded-lg border bg-card p-8 text-center space-y-4">
            <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold">Upgrade to continue this lesson</h2>
            <p className="text-muted-foreground">
              {accessBlock.reason === "monthly_video_limit_reached"
                ? `Free plan reached this month’s library quota (${accessBlock.monthlyUnlockedCount || 15}/${accessBlock.monthlyLimit || 15} videos).`
                : `Free plan includes only the first ${accessBlock.sceneLimit || 3} scenes of each library video.`}
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <Button onClick={() => navigate("/premium")}>See Premium</Button>
              <Button variant="outline" onClick={handleBackToLibrary}>Back to library</Button>
            </div>
          </div>
        </div>
      )}

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

      {!accessBlock && lessonState === "loading" && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-lg font-medium text-foreground">Preparing your lesson...</p>
            <p className="text-sm text-muted-foreground">Analyzing video scenes</p>
          </div>
        </div>
      )}

      {!accessBlock && lessonState === "scene-video" && currentScene && youtubeVideoId && (
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

      {!accessBlock && lessonState === "scene-video" && !currentScene && youtubeVideoId && segmentationStatus.state === "failed" && (
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="rounded-lg border bg-card p-8 text-center space-y-4">
            <h2 className="text-2xl font-semibold">We couldn't prepare this lesson</h2>
            <p className="text-muted-foreground">
              {segmentationStatus.message || "Transcript extraction failed. This video may not have captions available."}
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <Button onClick={handleRetry}>Try again</Button>
              <Button variant="outline" onClick={handleBackToLibrary}>Pick a different video</Button>
            </div>
          </div>
        </div>
      )}

      {!accessBlock && lessonState === "scene-video" && !currentScene && youtubeVideoId && segmentationStatus.state !== "failed" && (
        <div>
          {!hasSceneData && segmentationStatus.state !== "idle" && (
            <div className="max-w-3xl mx-auto px-3 md:px-8 pt-3">
              <Alert>
                <AlertDescription>{segmentationStatus.message || "Scene segmentation is still in progress."}</AlertDescription>
              </Alert>
            </div>
          )}
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

      {!accessBlock && lessonState === "exercises" && (
        hasSceneData ? renderWithSceneNav(
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
            dbVideoId={dbVideoId}
            nativeLanguage={nativeLanguage}
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
            dbVideoId={dbVideoId}
            nativeLanguage={nativeLanguage}
          />
        )
      )}

      {!accessBlock && lessonState === "speaking" && (
        hasSceneData ? renderWithSceneNav(
          <YouTubeSpeaking videoId={videoId} level={selectedLevel} onComplete={flow.handleSpeakingComplete} onBack={handleBackToLibrary} sceneId={currentScene?.id} sceneTranscript={currentScene?.scene_transcript} dbVideoId={dbVideoId} />
        ) : (
          <YouTubeSpeaking videoId={videoId} level={selectedLevel} onComplete={flow.handleSpeakingComplete} onBack={handleBackToLibrary} dbVideoId={dbVideoId} />
        )
      )}

    {!accessBlock && lessonState === "flashcards" && (
  hasSceneData ? renderWithSceneNav(
    <VideoFlashcards
      videoId={videoId}
      level={selectedLevel}
      onComplete={() => handleFlashcardsComplete()}
      onBack={handleBackToLibrary}
      sceneId={currentScene?.id}
      sceneTranscript={currentScene?.scene_transcript}
      dbVideoId={dbVideoId}
      nativeLanguage={nativeLanguage}
    />
  ) : (
    <VideoFlashcards
      videoId={videoId}
      level={selectedLevel}
      onComplete={() => handleFlashcardsComplete()}
      onBack={handleBackToLibrary}
      dbVideoId={dbVideoId}
      nativeLanguage={nativeLanguage}
    />
  )
)}

      {!accessBlock && lessonState === "complete" && (
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
