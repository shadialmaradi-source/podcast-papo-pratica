import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Target,
  Trophy,
  Star,
  Loader2,
  Brain,
  Mic,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { trackEvent } from "@/lib/analytics";
import { getNextMonthResetDate } from "@/services/subscriptionService";
import { UpgradePrompt } from "./subscription/UpgradePrompt";
import { DragDropExercises } from "./DragDropExercises";
import { TranslationHint } from "./exercises/TranslationHint";
import { ExerciseRenderer } from "./exercises/ExerciseRenderer";
import { useYouTubeExercises, checkAnswerCorrectness } from "@/hooks/useYouTubeExercises";

interface YouTubeExercisesProps {
  videoId: string;
  level: string;
  intensity: string;
  source?: string;
  language?: string;
  sceneId?: string;
  sceneTranscript?: string;
  dbVideoId?: string | null;
  nativeLanguage?: string;
  onBack: () => void;
  onComplete: () => void;
  onContinueToSpeaking?: (videoId: string, level: string) => void;
  onTryNextLevel?: (nextLevel: string) => void;
  onSkipToFlashcards?: () => void;
}

const levelInfo: Record<string, { name: string; color: string }> = {
  A1: { name: "Beginner", color: "bg-green-500" },
  A2: { name: "Elementary", color: "bg-green-600" },
  B1: { name: "Intermediate", color: "bg-warning" },
  B2: { name: "Upper-Intermediate", color: "bg-warning" },
  C1: { name: "Advanced", color: "bg-destructive" },
  C2: { name: "Proficiency", color: "bg-destructive" },
};

export function YouTubeExercises({
  videoId, level, intensity, source, language, sceneId, sceneTranscript,
  dbVideoId: dbVideoIdProp, nativeLanguage: nativeLanguageProp,
  onBack, onComplete, onContinueToSpeaking, onTryNextLevel, onSkipToFlashcards,
}: YouTubeExercisesProps) {
  const formatCorrectAnswer = (exercise: Exercise) => {
    if (!exercise?.correctAnswer) return "";
    const isSequenceExercise = exercise.type === "Sequencing" || exercise.type === "sequencing";
    if (!isSequenceExercise) return exercise.correctAnswer;

    const parsed = exercise.correctAnswer
      .split(",")
      .map((item: string) => Number.parseInt(item.trim(), 10))
      .filter((item: number) => Number.isFinite(item));

    if (parsed.length === 0) return exercise.correctAnswer;
    return parsed.map((index: number) => index + 1).join(",");
  };

  const {
    exercises, dragDropExercises, showDragDrop, currentExerciseIndex,
    answers, showResults, score, isLoading, error, showFeedback,
    currentAnswerCorrect, vocalQuota, showUpgradePrompt, currentExercise, progress,
    setShowDragDrop, setCurrentExerciseIndex, setShowFeedback, setShowUpgradePrompt,
    handleAnswerChange, handleCheckAnswer, handleNext, handleDragDropComplete,
  } = useYouTubeExercises({ videoId, level, intensity, sceneId, sceneTranscript, dbVideoId: dbVideoIdProp || undefined, nativeLanguage: nativeLanguageProp || undefined });

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back to Video
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6" />Generating Exercises
            </h2>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <div>
              <h3 className="font-semibold text-lg">Creating Custom Exercises</h3>
              <p className="text-muted-foreground">Analyzing video transcript and generating {level}-level exercises...</p>
            </div>
            <div className="max-w-md mx-auto">
              <Progress value={66} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">This may take a few moments...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back to Video
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <XCircle className="h-6 w-6 text-destructive" />Exercise Generation Failed
            </h2>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <div>
              <h3 className="font-semibold text-lg">Unable to Generate Exercises</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button onClick={onBack} variant="outline">Try Another Video</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results state
  if (showResults) {
    const maxScore = exercises.reduce((total, exercise) => total + exercise.points, 0);
    const percentage = Math.round((score / maxScore) * 100);
    const correctCount = exercises.filter((ex) => checkAnswerCorrectness(ex, answers[ex.id])).length;

    trackEvent('exercise_completed', {
      video_id: videoId, difficulty_level: level, score, total_exercises: exercises.length,
      accuracy: percentage, timestamp: new Date().toISOString(),
    });

    const vocalQuotaExceeded = vocalQuota && !vocalQuota.allowed;
    const resetDate = getNextMonthResetDate();

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-lg w-full space-y-6">
          <UpgradePrompt
            open={showUpgradePrompt}
            onOpenChange={setShowUpgradePrompt}
            title="Speaking Practice (Premium Feature)"
            description="Upgrade to get unlimited vocal exercises and improve your pronunciation."
            quotaUsed={vocalQuota?.count || 0}
            quotaLimit={vocalQuota?.limit || 5}
            resetDate={resetDate}
            onSkip={onSkipToFlashcards}
            skipLabel="Skip to Flashcards"
          />
          <Card className="shadow-xl rounded-2xl border-0">
            <CardContent className="pt-8 pb-6 space-y-6 text-center">
              <div className="space-y-2">
                <div className="text-5xl font-bold text-primary">{percentage}%</div>
                <h3 className="text-xl font-semibold text-foreground">
                  {percentage >= 80 ? "Excellent Work!" : percentage >= 60 ? "Great Progress!" : "Keep Practicing!"}
                </h3>
              </div>
              <div className="flex justify-center gap-8 py-4 border-y">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{correctCount}/{exercises.length}</div>
                  <div className="text-sm text-muted-foreground">Exercises</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{score}</div>
                  <div className="text-sm text-muted-foreground">Points</div>
                </div>
              </div>
              {vocalQuota && vocalQuota.limit > 0 && (
                <div className="text-sm text-muted-foreground">
                  Vocal exercises: {vocalQuota.count}/{vocalQuota.limit} this month
                </div>
              )}
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <div className="w-3 h-3 rounded-full bg-muted" />
                <div className="w-3 h-3 rounded-full bg-muted" />
                <span className="text-sm text-muted-foreground ml-2">Step 1 of 3 complete</span>
              </div>
              <div className="space-y-3 pt-2">
                {vocalQuotaExceeded ? (
                  <>
                    <Button onClick={() => setShowUpgradePrompt(true)} className="w-full gap-2 py-6 text-lg" size="lg">
                      <Mic className="h-5 w-5" />🎤 Continue to Speaking Practice<ArrowRight className="h-5 w-5" />
                    </Button>
                    <p className="text-xs text-muted-foreground">You've used all {vocalQuota?.limit} free vocal exercises this month</p>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      if (onContinueToSpeaking) onContinueToSpeaking(videoId, level);
                      else onComplete();
                    }}
                    className="w-full gap-2 py-6 text-lg"
                    size="lg"
                  >
                    <Mic className="h-5 w-5" />🎤 Continue to Speaking Practice<ArrowRight className="h-5 w-5" />
                  </Button>
                )}
                <Button variant="ghost" onClick={onBack} className="text-sm text-muted-foreground">
                  <ArrowLeft className="h-4 w-4 mr-1" />Back to Video
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Drag & drop mode
  if (showDragDrop && dragDropExercises.length > 0) {
    const convertedExercises = dragDropExercises
      .filter(ex => ["DragDropMatching", "DragDropSequencing", "DragDropCategorization", "DragDropWordOrder"].includes(ex.type))
      .map(ex => ({
        ...ex,
        type: ex.type as "DragDropMatching" | "DragDropSequencing" | "DragDropCategorization" | "DragDropWordOrder",
        items: ex.options || [],
        targets: ex.targets,
        categories: ex.categories
      }));
    return (
      <DragDropExercises
        exercises={convertedExercises}
        onComplete={handleDragDropComplete}
        onBack={() => setShowDragDrop(false)}
      />
    );
  }

  // Main exercise view
  const isBeginnerType = currentExercise && ['word_recognition', 'emoji_match', 'comprehension_check', 'sequence_recall'].includes(currentExercise.type);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back to Video
        </Button>
        <div className="flex-1">
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Target className="h-5 w-5 sm:h-6 sm:w-6" />Exercises
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={`${levelInfo[level]?.color} text-white`}>
              {level} - {levelInfo[level]?.name}
            </Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Exercise {currentExerciseIndex + 1} of {exercises.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Exercise {currentExerciseIndex + 1}</span>
            <Badge variant="outline" className="text-xs">{currentExercise.points} pts</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            {!isBeginnerType && (
              <>
                <h3 className="font-medium mb-4 text-lg leading-relaxed">{currentExercise.question}</h3>
                <TranslationHint translation={(currentExercise as any).questionTranslation} />
              </>
            )}
            <ExerciseRenderer
              exercise={currentExercise}
              userAnswer={answers[currentExercise.id] || ""}
              language={language}
              showFeedback={showFeedback}
              isCorrect={currentAnswerCorrect}
              onAnswerChange={handleAnswerChange}
              onNext={handleNext}
            />
          </div>

          {!isBeginnerType && (currentExercise.type === "Matching" || currentExercise.type === "Sequencing" ||
            currentExercise.type === "matching" || currentExercise.type === "sequencing") && !showFeedback && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <p><strong>Tip:</strong> {currentExercise.type === "Matching" || currentExercise.type === "matching"
                ? "Click pairs to match terms with definitions."
                : "Click statements in the order they appear in the video."}</p>
            </div>
          )}

          {!isBeginnerType && showFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl ${
                currentAnswerCorrect
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-red-500/10 border border-red-500/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  currentAnswerCorrect ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {currentAnswerCorrect ? <CheckCircle className="w-5 h-5 text-white" /> : <XCircle className="w-5 h-5 text-white" />}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${currentAnswerCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    {currentAnswerCorrect ? 'Correct!' : 'Not quite'}
                  </p>
                  {!currentAnswerCorrect && (
                    <p className="text-sm text-muted-foreground mt-1">Correct answer: {formatCorrectAnswer(currentExercise)}</p>
                  )}
                  {currentExercise.explanation && (
                    <p className="text-sm text-muted-foreground mt-1">{currentExercise.explanation}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {!isBeginnerType && !showFeedback &&
           (currentExercise.type === "Cloze" || currentExercise.type === "fill_blank" ||
            currentExercise.type === "Sequencing" || currentExercise.type === "sequencing" ||
            currentExercise.type === "Matching" || currentExercise.type === "matching" ||
            currentExercise.type === "SpotError") &&
           answers[currentExercise.id]?.trim() && (
            <Button onClick={handleCheckAnswer} className="w-full bg-primary hover:bg-primary/90">Check Answer</Button>
          )}

          {!isBeginnerType && (
            <div className="flex justify-between">
              <Button
                variant="outline"
                disabled={currentExerciseIndex === 0}
                onClick={() => { setShowFeedback(false); setCurrentExerciseIndex(currentExerciseIndex - 1); }}
              >
                Previous
              </Button>
              {showFeedback ? (
                <Button onClick={handleNext} className="bg-primary hover:bg-primary/90">
                  {currentExerciseIndex === exercises.length - 1 ? "See Results" : "Next"}
                </Button>
              ) : (
                (currentExercise.type !== "MCQ" && currentExercise.type !== "TF" && currentExercise.type !== "multiple_choice") && <div />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
