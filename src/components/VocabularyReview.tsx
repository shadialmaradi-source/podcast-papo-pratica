import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { 
  BookOpen, 
  Star, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  ArrowLeft,
  Brain,
  Target,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  getVocabularyDueForReview, 
  updateVocabularyProgress,
  getVocabularyStats
} from "@/services/vocabularyService";

interface VocabularyReviewProps {
  onBack: () => void;
}

export const VocabularyReview = ({ onBack }: VocabularyReviewProps) => {
  const [words, setWords] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    total: 0,
    xp: 0
  });
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    loadVocabularyReview();
    loadStats();
  }, []);

  const loadVocabularyReview = async () => {
    try {
      setLoading(true);
      const reviewWords = await getVocabularyDueForReview(20);
      
      if (reviewWords.length === 0) {
        setIsComplete(true);
        toast({
          title: "No words to review!",
          description: "You're all caught up with your vocabulary practice.",
        });
      } else {
        setWords(reviewWords);
      }
    } catch (error) {
      console.error('Error loading vocabulary review:', error);
      toast({
        title: "Error",
        description: "Failed to load vocabulary review",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const vocabularyStats = await getVocabularyStats();
      setStats(vocabularyStats);
    } catch (error) {
      console.error('Error loading vocabulary stats:', error);
    }
  };

  const handleAnswer = async (isCorrect: boolean, difficulty: number = 3) => {
    if (!words[currentIndex]) return;

    try {
      await updateVocabularyProgress(
        words[currentIndex].word_id,
        isCorrect,
        difficulty
      );

      setSessionStats(prev => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1,
        xp: prev.xp + (isCorrect ? 5 : 0)
      }));

      toast({
        title: isCorrect ? "Correct!" : "Keep practicing",
        description: isCorrect ? "+5 XP" : "You'll get it next time",
        variant: isCorrect ? "default" : "destructive",
      });

      // Move to next word after delay
      setTimeout(() => {
        if (currentIndex < words.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setShowAnswer(false);
        } else {
          setIsComplete(true);
        }
      }, 1500);

    } catch (error) {
      console.error('Error updating progress:', error);
      toast({
        title: "Error",
        description: "Failed to save progress",
        variant: "destructive",
      });
    }
  };

  const currentWord = words[currentIndex];
  const progress = words.length > 0 ? ((currentIndex + 1) / words.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BookOpen className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p>Loading vocabulary review...</p>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Star className="h-16 w-16 mx-auto mb-6 text-yellow-500" />
          <h2 className="text-3xl font-bold mb-4">Vocabulary Review Complete!</h2>
          
          {sessionStats.total > 0 ? (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="p-4 text-center">
                  <Target className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{sessionStats.correct}/{sessionStats.total}</p>
                  <p className="text-sm text-muted-foreground">Correct</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <Star className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                  <p className="text-2xl font-bold">{sessionStats.xp}</p>
                  <p className="text-sm text-muted-foreground">XP Earned</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <Brain className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">
                    {Math.round((sessionStats.correct / sessionStats.total) * 100)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Accuracy</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-lg text-muted-foreground mb-8">
              No words due for review. Check back later!
            </p>
          )}

          <div className="space-y-4">
            <Button onClick={() => window.location.reload()} className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              Review More Words
            </Button>
            
            <Button variant="outline" onClick={onBack} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BookOpen className="h-8 w-8 mx-auto mb-4" />
          <p>No vocabulary words available for review</p>
          <Button onClick={onBack} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="text-center">
          <h1 className="text-2xl font-bold">Vocabulary Review</h1>
          <p className="text-muted-foreground">
            {currentIndex + 1} of {words.length}
          </p>
        </div>
        
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Session</p>
          <p className="font-semibold">{sessionStats.correct}/{sessionStats.total}</p>
        </div>
      </div>

      {/* Progress */}
      <Progress value={progress} className="w-full" />

      {/* Word Card */}
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
      >
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
              <Badge variant="secondary">
                {currentWord.language}
              </Badge>
              <Badge variant="outline">
                Level {currentWord.mastery_level}
              </Badge>
              <Badge variant="outline">
                Seen {currentWord.times_seen}x
              </Badge>
            </div>
            
            <CardTitle className="text-4xl font-bold mb-2">
              {currentWord.word}
            </CardTitle>
            
            <CardDescription>
              What does this word mean?
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {!showAnswer ? (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Think about the meaning, then reveal the answer
                </p>
                
                <Button 
                  onClick={() => setShowAnswer(true)}
                  className="w-full"
                  size="lg"
                >
                  Show Definition
                </Button>
              </div>
            ) : (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-lg font-medium">
                      {currentWord.definition}
                    </p>
                    {currentWord.translation && (
                      <p className="text-muted-foreground mt-2">
                        Translation: {currentWord.translation}
                      </p>
                    )}
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      How well did you know this word?
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Button 
                        variant="outline"
                        onClick={() => handleAnswer(false, 1)}
                        className="h-16 flex flex-col gap-1"
                      >
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span>Didn't Know</span>
                        <span className="text-xs text-muted-foreground">Review again soon</span>
                      </Button>
                      
                      <Button 
                        variant="outline"
                        onClick={() => handleAnswer(true, 4)}
                        className="h-16 flex flex-col gap-1"
                      >
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span>Knew It!</span>
                        <span className="text-xs text-muted-foreground">Review later</span>
                      </Button>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleAnswer(false, 2)}
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        Somewhat
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleAnswer(true, 5)}
                      >
                        <Brain className="h-4 w-4 mr-1" />
                        Easy!
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Panel */}
      {stats && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-lg">Your Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{stats.total_words}</p>
                <p className="text-sm text-muted-foreground">Total Words</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.learned_words}</p>
                <p className="text-sm text-muted-foreground">Learned</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round(stats.accuracy)}%</p>
                <p className="text-sm text-muted-foreground">Accuracy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};