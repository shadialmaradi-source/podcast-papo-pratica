import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Target,
  Youtube,
  Trophy,
  Star,
  Loader2,
  BookOpen,
  Brain,
  Mic,
  TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Exercise } from "@/services/exerciseGeneratorService";
import { DragDropExercises } from "./DragDropExercises";

interface YouTubeExercisesProps {
  videoId: string;
  level: string;
  intensity: string;
  onBack: () => void;
  onComplete: () => void;
  onContinueToSpeaking?: (videoId: string, level: string) => void;
  onTryNextLevel?: (nextLevel: string) => void;
}

const getNextLevel = (currentLevel: string): string | null => {
  const normalized = currentLevel.toLowerCase();
  switch (normalized) {
    case 'beginner':
    case 'a1':
    case 'a2':
      return 'intermediate';
    case 'intermediate':
    case 'b1':
    case 'b2':
      return 'advanced';
    case 'advanced':
    case 'c1':
    case 'c2':
      return null;
    default:
      return null;
  }
};



// Helper function to check answer correctness for different exercise types
const checkAnswerCorrectness = (exercise: Exercise, userAnswer: string): boolean => {
  if (!userAnswer) return false;
  
  switch (exercise.type) {
    case "MCQ":
    case "TF":
    case "Cloze":
    case "SpotError":
    case "multiple_choice":
    case "fill_blank":
      return userAnswer.toLowerCase().trim() === exercise.correctAnswer.toLowerCase().trim();
    
    case "Matching":
    case "matching":
      try {
        const correctPairs = JSON.parse(exercise.correctAnswer);
        const userPairs = userAnswer.split(',').filter(Boolean);
        // Compare actual pairs, not just count
        if (userPairs.length !== correctPairs.length) return false;
        return userPairs.every((pair, idx) => pair === correctPairs[idx]);
      } catch {
        return false;
      }
    
    case "Sequencing":
    case "sequencing":
      try {
        const correctSequence = JSON.parse(exercise.correctAnswer);
        const userSequence = userAnswer.split(',').map(i => parseInt(i)).filter(i => !isNaN(i));
        // Compare actual sequence values, not just length
        if (userSequence.length !== correctSequence.length) return false;
        return userSequence.every((val, idx) => val === correctSequence[idx]);
      } catch {
        return false;
      }
    
    default:
      return userAnswer.toLowerCase().trim() === exercise.correctAnswer.toLowerCase().trim();
  }
};

export function YouTubeExercises({ videoId, level, intensity, onBack, onComplete, onContinueToSpeaking, onTryNextLevel }: YouTubeExercisesProps) {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [dragDropExercises, setDragDropExercises] = useState<Exercise[]>([]);
  const [regularExercises, setRegularExercises] = useState<Exercise[]>([]);
  const [showDragDrop, setShowDragDrop] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dbVideoId, setDbVideoId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentAnswerCorrect, setCurrentAnswerCorrect] = useState(false);

  const currentExercise = exercises[currentExerciseIndex];
  const progress = exercises.length > 0 ? ((currentExerciseIndex + 1) / exercises.length) * 100 : 0;

  // Save exercise progress to database
  const saveProgress = async (questionIndex: number) => {
    if (!dbVideoId) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dbDifficulty = mapLevelToDbDifficulty(level);
      
      await supabase
        .from('youtube_exercise_progress')
        .upsert({
          user_id: user.id,
          video_id: dbVideoId,
          difficulty: dbDifficulty,
          current_question_index: questionIndex,
          total_questions: exercises.length,
          answers: answers,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,video_id,difficulty'
        });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  // Delete progress when completed
  const deleteProgress = async () => {
    if (!dbVideoId) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dbDifficulty = mapLevelToDbDifficulty(level);
      
      await supabase
        .from('youtube_exercise_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('video_id', dbVideoId)
        .eq('difficulty', dbDifficulty);
    } catch (error) {
      console.error('Error deleting progress:', error);
    }
  };

  // Map level names to database difficulty values
  const mapLevelToDbDifficulty = (lvl: string): string => {
    switch (lvl.toLowerCase()) {
      case 'a1':
      case 'a2':
      case 'beginner':
        return 'beginner';
      case 'b1':
      case 'b2':
      case 'intermediate':
        return 'intermediate';
      case 'c1':
      case 'c2':
      case 'advanced':
        return 'advanced';
      default:
        return lvl.toLowerCase();
    }
  };

  // Load exercises - first from DB, then fallback to client-side generation
  useEffect(() => {
    const loadExercises = async () => {
      setIsLoading(true);
      setError("");
      
      try {
        // First, try to get video by YouTube video_id
        let { data: videoData } = await supabase
          .from('youtube_videos')
          .select('id')
          .eq('video_id', videoId)
          .single();

        // If not found, try by database UUID
        if (!videoData) {
          const { data: videoById } = await supabase
            .from('youtube_videos')
            .select('id')
            .eq('id', videoId)
            .single();
          videoData = videoById;
        }

        if (videoData) {
          setDbVideoId(videoData.id);
          // Load pre-generated exercises from database using secure RPC function
          const dbDifficulty = mapLevelToDbDifficulty(level);
          const { data: dbExercises, error: dbError } = await supabase
            .rpc('get_youtube_exercises_with_answers', { 
              video_id_param: videoData.id,
              difficulty_param: dbDifficulty
            });

          if (dbError) {
            console.error('Error fetching exercises:', dbError);
          }

          if (dbExercises && dbExercises.length > 0) {
            console.log(`Loaded ${dbExercises.length} exercises from database`);
            
            // Shuffle and select up to 10 exercises
            const shuffled = [...dbExercises].sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, 10);
            
            // Format DB exercises to match Exercise interface
            const formattedExercises: Exercise[] = selected.map((ex, idx) => ({
              id: ex.id,
              type: mapDbTypeToExerciseType(ex.exercise_type) as Exercise['type'],
              question: ex.question,
              options: parseOptions(ex.options),
              correctAnswer: ex.correct_answer,
              explanation: ex.explanation || '',
              points: ex.xp_reward || 10,
              difficulty: ex.difficulty,
              level: level,
              mode: 'intense' as Exercise['mode']
            }));

            setRegularExercises(formattedExercises);
            setExercises(formattedExercises);
            setDragDropExercises([]);
            
            toast({
              title: "Exercises Ready! 🎯",
              description: `${formattedExercises.length} AI-generated exercises for ${level} level.`,
            });
            setIsLoading(false);
            return;
          }
        }

        // No exercises found - show error (exercises should be generated from YouTubeVideoExercises)
        console.error('No exercises found in database');
        setError("Esercizi non trovati. Torna indietro e seleziona nuovamente il livello per generarli.");
      } catch (err) {
        setError("Failed to load exercises. Please try another video.");
        console.error('Error loading exercises:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadExercises();
  }, [videoId, level, intensity]);

  // Helper to map DB exercise types to our Exercise types
  const mapDbTypeToExerciseType = (dbType: string): string => {
    switch (dbType) {
      case 'multiple_choice':
        return 'MCQ';
      case 'true_false':
        return 'TF';
      case 'fill_blank':
      case 'gap_fill':
        return 'Cloze';
      case 'matching':
        return 'Matching';
      case 'sequencing':
        return 'Sequencing';
      default:
        return 'MCQ';
    }
  };

  // Helper to parse options from DB (could be JSON string or array)
  const parseOptions = (options: any): string[] => {
    if (!options) return [];
    if (Array.isArray(options)) return options;
    if (typeof options === 'string') {
      try {
        return JSON.parse(options);
      } catch {
        return [];
      }
    }
    return [];
  };

  const levelInfo = {
    A1: { name: "Beginner", color: "bg-green-500" },
    A2: { name: "Elementary", color: "bg-green-600" },
    B1: { name: "Intermediate", color: "bg-warning" },
    B2: { name: "Upper-Intermediate", color: "bg-warning" },
    C1: { name: "Advanced", color: "bg-destructive" },
    C2: { name: "Proficiency", color: "bg-destructive" }
  };

  const handleAnswerChange = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentExercise.id]: value
    }));
    
    // For MCQ/TF, show immediate feedback
    if (currentExercise.type === "MCQ" || 
        currentExercise.type === "TF" || 
        currentExercise.type === "multiple_choice") {
      const isCorrect = checkAnswerCorrectness(currentExercise, value);
      setCurrentAnswerCorrect(isCorrect);
      setShowFeedback(true);
    }
  };

  // For fill_blank, sequencing, matching - explicit check
  const handleCheckAnswer = () => {
    const userAnswer = answers[currentExercise.id];
    const isCorrect = checkAnswerCorrectness(currentExercise, userAnswer);
    setCurrentAnswerCorrect(isCorrect);
    setShowFeedback(true);
  };

  const handleNext = async () => {
    setShowFeedback(false); // Reset feedback for next question
    
    if (currentExerciseIndex < exercises.length - 1) {
      const newIndex = currentExerciseIndex + 1;
      setCurrentExerciseIndex(newIndex);
      // Save progress after each answer
      await saveProgress(newIndex);
    } else {
      if (!showDragDrop && dragDropExercises.length > 0) {
        // Transition to drag & drop exercises
        setShowDragDrop(true);
        return;
      }
      
      // Calculate final score
      const allExercises = [...regularExercises, ...dragDropExercises];
      const totalScore = allExercises.reduce((total, exercise) => {
        const userAnswer = answers[exercise.id];
        const isCorrect = checkAnswerCorrectness(exercise, userAnswer);
        return total + (isCorrect ? exercise.points : 0);
      }, 0);
      
      setScore(totalScore);
      setShowResults(true);
      // Delete progress when completed
      await deleteProgress();
    }
  };

  const handleDragDropComplete = (results: any[]) => {
    // Add drag & drop results to answers
    const dragDropAnswers: Record<string, string> = {};
    results.forEach(result => {
      dragDropAnswers[result.exerciseId] = typeof result.userAnswer === 'string' 
        ? result.userAnswer 
        : JSON.stringify(result.userAnswer);
    });
    
    setAnswers(prev => ({ ...prev, ...dragDropAnswers }));
    
    // Calculate final score
    const allExercises = [...regularExercises, ...dragDropExercises];
    const totalScore = allExercises.reduce((total, exercise) => {
      const userAnswer = answers[exercise.id] || dragDropAnswers[exercise.id];
      const isCorrect = checkAnswerCorrectness(exercise, userAnswer);
      return total + (isCorrect ? exercise.points : 0);
    }, 0);
    
    setScore(totalScore);
    setShowResults(true);
  };

  const renderExercise = () => {
    const userAnswer = answers[currentExercise.id] || "";

    switch (currentExercise.type) {
      case "MCQ":
      case "TF":
      case "multiple_choice":
        return (
          <RadioGroup value={userAnswer} onValueChange={handleAnswerChange}>
            {currentExercise.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "Cloze":
      case "fill_blank":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Type the correct word to fill in the blank:
            </p>
            <Input
              type="text"
              placeholder="Type your answer here..."
              value={userAnswer}
              onChange={(e) => handleAnswerChange(e.target.value)}
              className="w-full text-lg"
              autoFocus
            />
          </div>
        );

      case "Matching":
      case "matching":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Click to match terms with their definitions (click pairs):
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Terms:</h4>
                {currentExercise.options?.slice(0, Math.floor(currentExercise.options.length / 2)).map((term, index) => (
                  <Button
                    key={index}
                    variant={userAnswer.includes(term) ? "default" : "outline"}
                    size="sm"
                    className="w-full text-left justify-start"
                    onClick={() => {
                      const pairs = userAnswer.split(',').filter(Boolean);
                      const newPair = `${term}:${index}`;
                      const updated = pairs.includes(newPair) 
                        ? pairs.filter(p => p !== newPair).join(',')
                        : [...pairs, newPair].join(',');
                      handleAnswerChange(updated);
                    }}
                  >
                    {term}
                  </Button>
                ))}
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Definitions:</h4>
                {currentExercise.options?.slice(Math.floor(currentExercise.options.length / 2)).map((definition, index) => (
                  <Button
                    key={index}
                    variant={userAnswer.includes(definition) ? "default" : "outline"}
                    size="sm"
                    className="w-full text-left justify-start text-xs p-2 h-auto whitespace-normal"
                    onClick={() => {
                      const pairs = userAnswer.split(',').filter(Boolean);
                      const newPair = `${definition}:${index}`;
                      const updated = pairs.includes(newPair) 
                        ? pairs.filter(p => p !== newPair).join(',')
                        : [...pairs, newPair].join(',');
                      handleAnswerChange(updated);
                    }}
                  >
                    {definition}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );

      case "Sequencing":
      case "sequencing":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Click the statements in the correct order (order matters):
            </p>
            <div className="space-y-2">
              {currentExercise.options?.map((statement, index) => (
                <Button
                  key={index}
                  variant={userAnswer.split(',').indexOf(index.toString()) !== -1 ? "default" : "outline"}
                  size="sm"
                  className="w-full text-left justify-start p-4 h-auto whitespace-normal relative"
                  onClick={() => {
                    const sequence = userAnswer.split(',').filter(Boolean);
                    const indexStr = index.toString();
                    if (sequence.includes(indexStr)) {
                      // Remove from sequence
                      const newSequence = sequence.filter(s => s !== indexStr);
                      handleAnswerChange(newSequence.join(','));
                    } else {
                      // Add to sequence
                      handleAnswerChange([...sequence, indexStr].join(','));
                    }
                  }}
                >
                  {userAnswer.split(',').indexOf(index.toString()) !== -1 && (
                    <Badge className="absolute top-2 right-2 h-5 w-5 rounded-full p-0 text-xs">
                      {userAnswer.split(',').indexOf(index.toString()) + 1}
                    </Badge>
                  )}
                  {statement}
                </Button>
              ))}
            </div>
          </div>
        );

      case "SpotError":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Select the correct word that should replace the error:
            </p>
            <RadioGroup value={userAnswer} onValueChange={handleAnswerChange}>
              {currentExercise.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`error-${index}`} />
                  <Label htmlFor={`error-${index}`} className="cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      default:
        return null;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Video
          </Button>
          
          <div className="flex-1">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6" />
              Generating Exercises
            </h2>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <div>
              <h3 className="font-semibold text-lg">Creating Custom Exercises</h3>
              <p className="text-muted-foreground">
                Analyzing video transcript and generating {level}-level exercises...
              </p>
            </div>
            <div className="max-w-md mx-auto">
              <Progress value={66} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                This may take a few moments...
              </p>
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
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Video
          </Button>
          
          <div className="flex-1">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <XCircle className="h-6 w-6 text-destructive" />
              Exercise Generation Failed
            </h2>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <div>
              <h3 className="font-semibold text-lg">Unable to Generate Exercises</h3>
              <p className="text-muted-foreground">
                {error}
              </p>
            </div>
            <Button onClick={onBack} variant="outline">
              Try Another Video
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results state
  if (showResults) {
    const maxScore = exercises.reduce((total, exercise) => total + exercise.points, 0);
    const percentage = Math.round((score / maxScore) * 100);

    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Video
          </Button>
          
          <div className="flex-1">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-warning" />
              Exercise Results
            </h2>
          </div>
        </div>

        <Card className="text-center">
          <CardContent className="pt-6 space-y-6">
            <div className="flex justify-center">
              <div className="text-6xl font-bold text-primary">{percentage}%</div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold">
                {percentage >= 80 ? "Excellent Work!" : percentage >= 60 ? "Great Progress!" : "Keep Practicing!"}
              </h3>
              <p className="text-muted-foreground">
                You completed {level} level exercises
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-lg mx-auto">
              <div className="text-center">
                <div className="text-2xl font-bold">{exercises.length}</div>
                <div className="text-sm text-muted-foreground">Exercises</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{score}</div>
                <div className="text-sm text-muted-foreground">Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{percentage}%</div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
              </div>
              <div className="text-center">
                <Badge className={`${levelInfo[level as keyof typeof levelInfo]?.color} text-white`}>
                  {level} Level
                </Badge>
              </div>
            </div>

            {/* Smart Action Buttons */}
            <div className="space-y-3 max-w-sm mx-auto">
              {/* Primary: Continue to Speaking */}
              <Button 
                onClick={() => {
                  if (onContinueToSpeaking) {
                    onContinueToSpeaking(videoId, level);
                  } else {
                    onComplete();
                  }
                }} 
                className="w-full gap-2"
                size="lg"
              >
                <Mic className="h-4 w-4" />
                Continue to Speaking Practice
              </Button>

              {/* Secondary: Try Next Level (if not advanced) */}
              {getNextLevel(level) && onTryNextLevel && (
                <Button 
                  variant="outline"
                  onClick={() => onTryNextLevel(getNextLevel(level)!)}
                  className="w-full gap-2"
                  size="lg"
                >
                  <TrendingUp className="h-4 w-4" />
                  Try {getNextLevel(level)!.charAt(0).toUpperCase() + getNextLevel(level)!.slice(1)} Level
                </Button>
              )}

              {/* Tertiary: Explore Community Videos */}
              <Button 
                variant="ghost"
                onClick={() => navigate("/library?tab=community")}
                className="w-full gap-2"
              >
                <Youtube className="h-4 w-4" />
                Explore Community Videos
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Results */}
        <Card>
          <CardHeader>
            <CardTitle>Exercise Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {exercises.map((exercise, index) => {
              const userAnswer = answers[exercise.id] || "";
              const isCorrect = checkAnswerCorrectness(exercise, userAnswer);
              
              return (
                <div key={exercise.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {isCorrect ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium">Question {index + 1}</span>
                      </div>
                      <p className="text-sm mb-2">{exercise.question}</p>
                      <div className="text-xs space-y-1">
                        <div>Your answer: <span className={isCorrect ? "text-green-600" : "text-red-600"}>{userAnswer || "No answer"}</span></div>
                        <div>Correct answer: <span className="text-green-600">{exercise.correctAnswer}</span></div>
                        <div className="text-muted-foreground">{exercise.explanation}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {isCorrect ? exercise.points : 0}/{exercise.points} pts
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render drag & drop exercises if in drag & drop mode
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Video
        </Button>
        
        <div className="flex-1">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6" />
            Transcript-Based Exercises
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={`${levelInfo[level as keyof typeof levelInfo]?.color} text-white`}>
              {level} - {levelInfo[level as keyof typeof levelInfo]?.name}
            </Badge>
            <Badge variant="outline">
              <Youtube className="h-3 w-3 mr-1" />
              Video: {videoId}
            </Badge>
            <Badge variant="outline" className={intensity === "intense" ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"}>
              <BookOpen className="h-3 w-3 mr-1" />
              {intensity === "intense" ? "20" : "10"} Custom Exercises - {intensity === "intense" ? "Intense" : "Light"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Progress */}
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

      {/* Exercise Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Exercise {currentExerciseIndex + 1}</span>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {currentExercise.type.replace('-', ' ').toUpperCase()}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {currentExercise.points} pts
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-medium mb-4 text-lg leading-relaxed">{currentExercise.question}</h3>
            {renderExercise()}
          </div>
          
          {(currentExercise.type === "Matching" || currentExercise.type === "Sequencing" || 
            currentExercise.type === "matching" || currentExercise.type === "sequencing") && !showFeedback && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <p><strong>Tip:</strong> {currentExercise.type === "Matching" || currentExercise.type === "matching" 
                ? "Click pairs to match terms with definitions." 
                : "Click statements in the order they appear in the video."}</p>
            </div>
          )}

          {/* Immediate Feedback */}
          {showFeedback && (
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
                  {currentAnswerCorrect ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <XCircle className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${currentAnswerCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    {currentAnswerCorrect ? 'Correct!' : 'Not quite'}
                  </p>
                  {!currentAnswerCorrect && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Correct answer: {currentExercise.correctAnswer}
                    </p>
                  )}
                  {currentExercise.explanation && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentExercise.explanation}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Check Answer button for non-MCQ exercises */}
          {!showFeedback && 
           (currentExercise.type === "Cloze" || 
            currentExercise.type === "fill_blank" ||
            currentExercise.type === "Sequencing" ||
            currentExercise.type === "sequencing" ||
            currentExercise.type === "Matching" ||
            currentExercise.type === "matching" ||
            currentExercise.type === "SpotError") && 
           answers[currentExercise.id]?.trim() && (
            <Button 
              onClick={handleCheckAnswer}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Check Answer
            </Button>
          )}
          
          <div className="flex justify-between">
            <Button
              variant="outline"
              disabled={currentExerciseIndex === 0}
              onClick={() => {
                setShowFeedback(false);
                setCurrentExerciseIndex(currentExerciseIndex - 1);
              }}
            >
              Previous
            </Button>
            
            {showFeedback ? (
              <Button 
                onClick={handleNext}
                className="bg-primary hover:bg-primary/90"
              >
                {currentExerciseIndex === exercises.length - 1 ? "See Results" : "Next"}
              </Button>
            ) : (
              // For MCQ types, don't show Next until feedback is shown
              (currentExercise.type !== "MCQ" && 
               currentExercise.type !== "TF" && 
               currentExercise.type !== "multiple_choice") && (
                <div /> // Placeholder to maintain flex layout
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}