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
import { DragDropExercises } from "./DragDropExercises";

interface YouTubeExercisesProps {
  videoId: string;
  level: string;
  intensity: string;
  onBack: () => void;
  onComplete: () => void;
}



// Helper function to check answer correctness for different exercise types
const checkAnswerCorrectness = (exercise: Exercise, userAnswer: string): boolean => {
  if (!userAnswer) return false;
  
  switch (exercise.type) {
    case "MCQ":
    case "TF":
    case "Cloze":
    case "SpotError":
      return userAnswer.toLowerCase().trim() === exercise.correctAnswer.toLowerCase().trim();
    
    case "Matching":
      try {
        const correctPairs = JSON.parse(exercise.correctAnswer);
        const userPairs = userAnswer.split(',').filter(Boolean);
        return userPairs.length === correctPairs.length; // Simplified check
      } catch {
        return false;
      }
    
    case "Sequencing":
      try {
        const correctSequence = JSON.parse(exercise.correctAnswer);
        const userSequence = userAnswer.split(',').map(i => parseInt(i)).filter(i => !isNaN(i));
        return userSequence.length === correctSequence.length; // Simplified check
      } catch {
        return false;
      }
    
    default:
      return userAnswer.toLowerCase().trim() === exercise.correctAnswer.toLowerCase().trim();
  }
};

export function YouTubeExercises({ videoId, level, intensity, onBack, onComplete }: YouTubeExercisesProps) {
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

  const currentExercise = exercises[currentExerciseIndex];
  const progress = exercises.length > 0 ? ((currentExerciseIndex + 1) / exercises.length) * 100 : 0;

  // Load exercises based on transcript
  useEffect(() => {
    const loadExercises = async () => {
      setIsLoading(true);
      setError("");
      
      try {
        const transcript = await getVideoTranscript(videoId);
        if (!transcript) {
          setError("No transcript available for this video");
          return;
        }
        
        const exerciseCount = intensity === "intense" ? 20 : 10;
        const generatedExercises = generateTranscriptBasedExercises(transcript, level, exerciseCount);
        
        // Separate drag & drop exercises from regular exercises
        const dragDropTypes = ["DragDropMatching", "DragDropSequencing", "DragDropCategorization", "DragDropWordOrder"];
        const dragDropExs = generatedExercises.filter(ex => dragDropTypes.includes(ex.type));
        const regularExs = generatedExercises.filter(ex => !dragDropTypes.includes(ex.type));
        
        setDragDropExercises(dragDropExs);
        setRegularExercises(regularExs);
        setExercises(regularExs); // Start with regular exercises
        
        toast({
          title: "Exercises Generated! 🎯",
          description: `${intensity === "intense" ? "20" : "10"} transcript-based exercises created for ${level} level.`,
        });
      } catch (err) {
        setError("Failed to generate exercises. Please try another video.");
        console.error('Error generating exercises:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadExercises();
  }, [videoId, level, intensity]);

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
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Select the correct word to fill in the blank:
            </p>
            <RadioGroup value={userAnswer} onValueChange={handleAnswerChange}>
              {currentExercise.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`cloze-${index}`} />
                  <Label htmlFor={`cloze-${index}`} className="cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case "Matching":
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
          
          {(currentExercise.type === "Matching" || currentExercise.type === "Sequencing") && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <p><strong>Tip:</strong> {currentExercise.type === "Matching" ? "Click pairs to match terms with definitions." : "Click statements in the order they appear in the video."}</p>
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