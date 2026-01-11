import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, ArrowLeft, Check, X, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface Exercise {
  id: string;
  type: 'multiple_choice' | 'fill_blank' | 'sequencing' | 'matching';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

interface LessonExercisesProps {
  exercises: Exercise[];
  onComplete: (score: number, total: number) => void;
  lessonId?: string;
}

// Helper to safely parse localStorage
const getSavedProgress = (key: string) => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const progress = JSON.parse(saved);
      // Check if within 24 hours
      if (Date.now() - progress.timestamp < 24 * 60 * 60 * 1000) {
        return progress;
      }
    }
  } catch (e) {
    console.error('Error reading progress:', e);
  }
  return null;
};

const LessonExercises = ({ exercises, onComplete, lessonId = 'first_lesson' }: LessonExercisesProps) => {
  const { toast } = useToast();
  
  // Generate unique storage key
  const targetLanguage = localStorage.getItem('onboarding_language') || 'spanish';
  const userLevel = localStorage.getItem('onboarding_level') || 'absolute_beginner';
  const progressKey = `listenflow_exercise_${targetLanguage}_${userLevel}_${lessonId}`;
  
  // State with lazy initialization from localStorage
  const [currentIndex, setCurrentIndex] = useState(() => {
    const saved = getSavedProgress(progressKey);
    return saved?.currentQuestionIndex ?? 0;
  });
  
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const saved = getSavedProgress(progressKey);
    return saved?.answers ?? {};
  });
  
  const [score, setScore] = useState(() => {
    const saved = getSavedProgress(progressKey);
    return saved?.score ?? 0;
  });
  
  const [isResuming, setIsResuming] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const currentExercise = exercises[currentIndex];
  const progress = ((currentIndex + 1) / exercises.length) * 100;

  // Save progress to localStorage
  const saveProgress = (newIndex: number, newAnswers: Record<string, string>, newScore: number) => {
    const progressData = {
      currentQuestionIndex: newIndex,
      answers: newAnswers,
      score: newScore,
      timestamp: Date.now()
    };
    localStorage.setItem(progressKey, JSON.stringify(progressData));
  };

  // Show welcome back message if resuming
  useEffect(() => {
    const saved = getSavedProgress(progressKey);
    if (saved && saved.currentQuestionIndex > 0) {
      setIsResuming(true);
      toast({
        title: "Welcome back! ✓",
        description: `Resuming question ${saved.currentQuestionIndex + 1}/${exercises.length}`,
        className: "bg-primary text-primary-foreground",
      });
      setTimeout(() => setIsResuming(false), 2500);
    }
  }, []);

  // Save on tab switch or close
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !showResults) {
        saveProgress(currentIndex, answers, score);
      }
    };
    
    const handleBeforeUnload = () => {
      if (!showResults) {
        saveProgress(currentIndex, answers, score);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentIndex, answers, score, showResults, progressKey]);

  const handleAnswer = (answer: string) => {
    if (showFeedback) return;
    
    const newAnswers = { ...answers, [currentExercise.id]: answer };
    setAnswers(newAnswers);
    
    const correct = answer.toLowerCase().trim() === currentExercise.correctAnswer.toLowerCase().trim();
    setIsCorrect(correct);
    const newScore = correct ? score + 1 : score;
    if (correct) setScore(newScore);
    setShowFeedback(true);
    
    // Save progress after each answer
    saveProgress(currentIndex, newAnswers, newScore);
    
    // Show subtle save confirmation
    toast({
      description: "Progress saved ✓",
      duration: 1500,
      className: "bg-muted text-muted-foreground text-sm",
    });
  };

  const handleNext = () => {
    setShowFeedback(false);
    if (currentIndex < exercises.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      saveProgress(newIndex, answers, score);
    } else {
      // Clear progress when completed
      localStorage.removeItem(progressKey);
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setShowFeedback(false);
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      saveProgress(newIndex, answers, score);
    }
  };

  const renderExercise = () => {
    switch (currentExercise.type) {
      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {currentExercise.options?.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(option)}
                disabled={showFeedback}
                className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                  showFeedback
                    ? option.toLowerCase() === currentExercise.correctAnswer.toLowerCase()
                      ? 'border-primary bg-primary/10 text-foreground'
                      : answers[currentExercise.id] === option
                        ? 'border-destructive bg-destructive/10 text-foreground'
                        : 'border-border bg-card text-muted-foreground'
                    : answers[currentExercise.id] === option
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                <span className="font-medium">{String.fromCharCode(65 + idx)}.</span> {option}
                {showFeedback && option.toLowerCase() === currentExercise.correctAnswer.toLowerCase() && (
                  <Check className="inline w-5 h-5 text-primary ml-2" />
                )}
                {showFeedback && answers[currentExercise.id] === option && option.toLowerCase() !== currentExercise.correctAnswer.toLowerCase() && (
                  <X className="inline w-5 h-5 text-destructive ml-2" />
                )}
              </button>
            ))}
          </div>
        );

      case 'fill_blank':
        return (
          <div className="space-y-4">
            <Input
              placeholder="Type your answer..."
              value={answers[currentExercise.id] || ''}
              onChange={(e) => setAnswers(prev => ({ ...prev, [currentExercise.id]: e.target.value }))}
              disabled={showFeedback}
              className="text-lg p-4 h-14"
            />
            {!showFeedback && (
              <Button
                onClick={() => handleAnswer(answers[currentExercise.id] || '')}
                className="w-full bg-primary hover:bg-primary/90"
                disabled={!answers[currentExercise.id]}
              >
                Check Answer
              </Button>
            )}
          </div>
        );

      case 'sequencing':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Put the words in the correct order:
            </p>
            {currentExercise.options?.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(option)}
                disabled={showFeedback}
                className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                  showFeedback
                    ? option === currentExercise.correctAnswer
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card'
                    : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        );

      case 'matching':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Select the correct match:
            </p>
            {currentExercise.options?.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(option)}
                disabled={showFeedback}
                className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                  showFeedback
                    ? option === currentExercise.correctAnswer
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card'
                    : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  if (showResults) {
    const percentage = Math.round((score / exercises.length) * 100);
    const passed = score >= 6;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 md:p-8 flex items-center justify-center"
      >
        <Card className="max-w-md w-full shadow-xl rounded-2xl border-0">
          <CardContent className="p-8 text-center space-y-6">
            <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${
              passed ? 'bg-primary/10' : 'bg-amber-500/10'
            }`}>
              <Award className={`w-12 h-12 ${passed ? 'text-primary' : 'text-amber-500'}`} />
            </div>
            
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                {score}/{exercises.length}
              </h2>
              <p className={`text-lg font-medium ${passed ? 'text-primary' : 'text-amber-500'}`}>
                {passed ? 'Great job!' : 'Keep practicing!'}
              </p>
            </div>

            <div className="w-full bg-muted rounded-full h-3">
              <div 
                className={`h-full rounded-full transition-all ${
                  passed ? 'bg-primary' : 'bg-amber-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            <p className="text-muted-foreground">
              {passed 
                ? "You've unlocked speaking practice!" 
                : "Try watching the video again for better comprehension."}
            </p>

            <Button
              onClick={() => onComplete(score, exercises.length)}
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 rounded-full"
            >
              {passed ? 'Continue to Speaking' : 'Continue Anyway'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 md:p-8"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          {isResuming && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-primary font-medium"
            >
              <Check className="w-4 h-4" />
              Resuming where you left off...
            </motion.div>
          )}
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Question {currentIndex + 1} of {exercises.length}</span>
            <span>{score} correct</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Exercise Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="shadow-xl rounded-2xl border-0">
              <CardContent className="p-6 md:p-8 space-y-6">
                <div className="space-y-2">
                  <span className="text-xs font-medium text-primary uppercase tracking-wide">
                    {currentExercise.type.replace('_', ' ')}
                  </span>
                  <h2 className="text-xl md:text-2xl font-semibold text-foreground">
                    {currentExercise.question}
                  </h2>
                </div>

                {renderExercise()}

                {/* Feedback */}
                {showFeedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl ${
                      isCorrect 
                        ? 'bg-primary/10 border border-primary/20' 
                        : 'bg-destructive/10 border border-destructive/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isCorrect ? 'bg-primary' : 'bg-destructive'
                      }`}>
                        {isCorrect ? (
                          <Check className="w-5 h-5 text-primary-foreground" />
                        ) : (
                          <X className="w-5 h-5 text-destructive-foreground" />
                        )}
                      </div>
                      <div>
                        <p className={`font-medium ${isCorrect ? 'text-primary' : 'text-destructive'}`}>
                          {isCorrect ? 'Correct!' : 'Not quite'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {currentExercise.explanation}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </Button>

          {showFeedback && (
            <Button
              onClick={handleNext}
              className="bg-primary hover:bg-primary/90 gap-2"
            >
              {currentIndex === exercises.length - 1 ? 'See Results' : 'Next'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default LessonExercises;
