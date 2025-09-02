import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Brain
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { getVideoTranscript } from "@/services/youtubeService";
import { generateTranscriptBasedExercises, Exercise } from "@/services/exerciseGeneratorService";

interface YouTubeExercisesProps {
  videoId: string;
  level: string;
  onBack: () => void;
  onComplete: () => void;
}



export function YouTubeExercises({ videoId, level, onBack, onComplete }: YouTubeExercisesProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const currentExercise = exercises[currentExerciseIndex];
  const progress = exercises.length > 0 ? ((currentExerciseIndex + 1) / exercises.length) * 100 : 0;

  // Load exercises based on transcript
  useEffect(() => {
    const loadExercises = async () => {
      setIsLoading(true);
      setError("");
      
      try {
        const transcript = await getVideoTranscript(videoId);
        const generatedExercises = generateTranscriptBasedExercises(transcript, level, videoId);
        setExercises(generatedExercises);
        
        toast({
          title: "Exercises Generated! 🎯",
          description: `10 transcript-based exercises created for ${level} level.`,
        });
      } catch (err) {
        setError("Failed to generate exercises. Please try another video.");
        console.error('Error generating exercises:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadExercises();
  }, [videoId, level]);

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
  };

  const handleNext = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      // Calculate final score
      const totalScore = exercises.reduce((total, exercise) => {
        const userAnswer = answers[exercise.id];
        const isCorrect = userAnswer?.toLowerCase().trim() === exercise.correctAnswer.toLowerCase().trim();
        return total + (isCorrect ? exercise.points : 0);
      }, 0);
      
      setScore(totalScore);
      setShowResults(true);
    }
  };

  const renderExercise = () => {
    const userAnswer = answers[currentExercise.id] || "";

    switch (currentExercise.type) {
      case "multiple-choice":
      case "true-false":
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

      case "fill-blank":
      case "flashcard":
        return (
          <Textarea
            placeholder={currentExercise.type === "flashcard" ? "Type the definition or meaning..." : "Type your answer here..."}
            value={userAnswer}
            onChange={(e) => handleAnswerChange(e.target.value)}
            className="min-h-[100px]"
          />
        );

      case "sentence-order":
        // For sentence ordering, we'll use a simple textarea for now
        return (
          <Textarea
            placeholder="Type the words in the correct order..."
            value={userAnswer}
            onChange={(e) => handleAnswerChange(e.target.value)}
            className="min-h-[100px]"
          />
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
              <h3 className="text-xl font-semibold">Great Work!</h3>
              <p className="text-muted-foreground">
                You scored {score} out of {maxScore} points
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

            <div className="flex gap-3 justify-center">
              <Button onClick={onComplete} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Continue Learning
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try Again
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
              const isCorrect = userAnswer.toLowerCase().trim() === exercise.correctAnswer.toLowerCase().trim();
              
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
            <Badge variant="outline" className="bg-green-50 text-green-700">
              <BookOpen className="h-3 w-3 mr-1" />
              10 Custom Exercises
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
          
          {currentExercise.type === "flashcard" && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <p><strong>Tip:</strong> Think about the meaning in the context of the video content.</p>
            </div>
          )}
          
          <div className="flex justify-between">
            <Button
              variant="outline"
              disabled={currentExerciseIndex === 0}
              onClick={() => setCurrentExerciseIndex(currentExerciseIndex - 1)}
            >
              Previous
            </Button>
            
            <Button 
              onClick={handleNext}
              disabled={!answers[currentExercise.id]?.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {currentExerciseIndex === exercises.length - 1 ? "Finish & See Results" : "Next Exercise"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}