import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, CheckCircle, Play, ArrowRight, RotateCcw, BarChart3, Home } from "lucide-react";
import { motion } from "framer-motion";
import { StepProgress } from "./StepProgress";
import { trackEvent } from "@/lib/analytics";

interface LessonCompleteScreenProps {
  exerciseScore: number;
  totalExercises: number;
  exerciseAccuracy: number;
  flashcardsCount: number;
  onNextVideo: () => void;
  onViewProgress: () => void;
  onRetry: () => void;
  onBackToLibrary: () => void;
}

const LessonCompleteScreen = ({
  exerciseScore,
  totalExercises,
  exerciseAccuracy,
  flashcardsCount,
  onNextVideo,
  onViewProgress,
  onRetry,
  onBackToLibrary,
}: LessonCompleteScreenProps) => {
  const xpEarned = Math.round(exerciseAccuracy * 0.5) + flashcardsCount * 2 + 10;

  // Track lesson completion once on mount
  useEffect(() => {
    trackEvent('lesson_completed', {
      exercises_count: totalExercises,
      exercise_score: exerciseScore,
      exercise_accuracy: exerciseAccuracy,
      flashcards_count: flashcardsCount,
      xp_earned: xpEarned,
      timestamp: new Date().toISOString()
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-[100dvh] bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col"
    >
      <div className="flex-1 flex items-center justify-center overflow-auto p-3 md:p-8">
        <div className="max-w-lg w-full space-y-4 md:space-y-6">
          {/* Celebration header */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="text-center space-y-3 md:space-y-4"
          >
            <div className="relative inline-block">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg mx-auto"
              >
                <Trophy className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground" />
              </motion.div>
            </div>

            <h1 className="text-2xl md:text-4xl font-bold text-foreground">
              🎉 Lesson Complete!
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              Amazing work! You've finished all 3 steps.
            </p>
          </motion.div>

        {/* Stats card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-xl rounded-2xl border-0">
            <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Summary stats */}
              <div className="space-y-2 md:space-y-3">
                <h3 className="font-medium text-center text-foreground text-sm md:text-base">You completed:</h3>
                <ul className="space-y-1 md:space-y-2">
                  <li className="flex items-center gap-2 md:gap-3 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
                    <span>{totalExercises} exercises</span>
                  </li>
                  <li className="flex items-center gap-2 md:gap-3 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
                    <span>Speaking practice</span>
                  </li>
                  <li className="flex items-center gap-2 md:gap-3 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
                    <span>{flashcardsCount} flashcards</span>
                  </li>
                </ul>
              </div>

              {/* Score display */}
              <div className="text-center pt-3 md:pt-4 border-t">
                <div className="text-3xl md:text-4xl font-bold text-primary">
                  {exerciseAccuracy}%
                  <span className="text-sm md:text-lg ml-2 text-muted-foreground">⚡ +{xpEarned} XP</span>
                </div>
              </div>

              {/* Step progress - completed */}
              <StepProgress currentStep={3} showCheckOnComplete={true} />
            </CardContent>
          </Card>
        </motion.div>
        </div>
      </div>

        {/* Action buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-4"
        >
          {/* Primary CTA */}
          <Button
            onClick={onNextVideo}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 rounded-full py-6 text-lg gap-2"
          >
            <Play className="w-5 h-5" />
            🎯 Next Video
            <ArrowRight className="w-5 h-5" />
          </Button>

          {/* Secondary options */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={onViewProgress}
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs">Progress</span>
            </Button>
            <Button
              variant="outline"
              onClick={onRetry}
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-xs">Retry</span>
            </Button>
            <Button
              variant="outline"
              onClick={onBackToLibrary}
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <Home className="w-4 h-4" />
              <span className="text-xs">Library</span>
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LessonCompleteScreen;
