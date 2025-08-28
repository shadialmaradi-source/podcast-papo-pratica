import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Star, Heart, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { 
  Exercise, 
  ExerciseResult,
  getPodcastExercises, 
  checkExerciseAnswer, 
  saveExerciseResult, 
  updateUserProgress,
  decreaseHearts 
} from "@/services/exerciseService";

interface ExerciseGeneratorProps {
  podcastTitle: string;
  difficulty: string;
  language: string;
  onComplete: () => void;
}

// Mock podcast ID for now - in real app this would come from props
const MOCK_PODCAST_ID = "mock-podcast-1";

// Mock exercises for fallback
const mockExercises: Exercise[] = [
  {
    id: "mock-1",
    podcast_id: "mock-podcast-1",
    question: "What is the main theme of this podcast episode?",
    exercise_type: "multiple_choice",
    options: ["Technology", "Food", "Travel", "Health"],
    difficulty: "B1",
    xp_reward: 10,
    order_index: 0,
  },
  {
    id: "mock-2", 
    podcast_id: "mock-podcast-1",
    question: "Complete the sentence: 'The speaker mentioned that the best time to visit is ___'",
    exercise_type: "fill_blank",
    difficulty: "A2",
    xp_reward: 10,
    order_index: 1,
  },
  {
    id: "mock-3",
    podcast_id: "mock-podcast-1", 
    question: "Define the word 'wanderlust'",
    exercise_type: "vocabulary",
    difficulty: "B2",
    xp_reward: 15,
    order_index: 2,
    options: {
      word: "wanderlust",
      definition: "A strong desire to travel",
      example: "Her wanderlust led her to visit over 30 countries."
    }
  }
];

export const ExerciseGenerator = ({ podcastTitle, difficulty, language, onComplete }: ExerciseGeneratorProps) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [showResult, setShowResult] = useState(false);
  const [exerciseResult, setExerciseResult] = useState<ExerciseResult | null>(null);
  const [totalXP, setTotalXP] = useState(0);
  const [hearts, setHearts] = useState(5);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      // In a real app, we'd get the actual podcast ID from props
      const data = await getPodcastExercises(MOCK_PODCAST_ID);
      if (data.length === 0) {
        // If no exercises in DB, use mock data
        setExercises(mockExercises);
      } else {
        setExercises(data);
      }
    } catch (error) {
      console.error('Error loading exercises:', error);
      // Fallback to mock data
      setExercises(mockExercises);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    if (showResult) return;

    setSelectedAnswer(answer);
    setShowResult(true);

    try {
      // For mock exercises, simulate the answer checking
      if (currentExercise.id.startsWith('mock-')) {
        const mockResult: ExerciseResult = {
          is_correct: answer.toLowerCase().trim() === getMockCorrectAnswer().toLowerCase().trim(),
          correct_answer: getMockCorrectAnswer(),
          explanation: getMockExplanation(),
          xp_reward: currentExercise.xp_reward
        };
        setExerciseResult(mockResult);
        
        if (mockResult.is_correct) {
          setTotalXP(prev => prev + mockResult.xp_reward);
          toast({
            title: "Corretto! ✅",
            description: `+${mockResult.xp_reward} XP`,
          });
        } else {
          setHearts(prev => Math.max(0, prev - 1));
          toast({
            title: "Sbagliato ❌",
            description: mockResult.explanation || "Riprova!",
            variant: "destructive",
          });
        }
        return;
      }

      const result = await checkExerciseAnswer(currentExercise.id, answer);
      setExerciseResult(result);

      // Save the result
      await saveExerciseResult(
        currentExercise.id,
        MOCK_PODCAST_ID,
        answer,
        result.is_correct,
        result.is_correct ? result.xp_reward : 0
      );

      if (result.is_correct) {
        setTotalXP(prev => prev + result.xp_reward);
        await updateUserProgress(result.xp_reward);
        toast({
          title: "Corretto! ✅",
          description: `+${result.xp_reward} XP`,
        });
      } else {
        const newHearts = await decreaseHearts();
        setHearts(newHearts);
        toast({
          title: "Sbagliato ❌",
          description: result.explanation || "Riprova!",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error handling answer:', error);
      toast({
        title: "Errore",
        description: "Problema nel verificare la risposta",
        variant: "destructive",
      });
    }
  };

  const getMockCorrectAnswer = () => {
    switch (currentExercise.id) {
      case "mock-1": return "Travel";
      case "mock-2": return "spring";
      case "mock-3": return "A strong desire to travel";
      default: return "";
    }
  };

  const getMockExplanation = () => {
    switch (currentExercise.id) {
      case "mock-1": return "The podcast discusses various travel destinations and tips for travelers.";
      case "mock-2": return "The speaker clearly states that spring offers the best weather conditions.";
      case "mock-3": return "Wanderlust refers to the irresistible urge to travel and explore the world.";
      default: return "";
    }
  };

  const nextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
      setSelectedAnswer("");
      setShowResult(false);
      setExerciseResult(null);
    } else {
      onComplete();
    }
  };

  const resetExercises = () => {
    setCurrentExerciseIndex(0);
    setSelectedAnswer("");
    setShowResult(false);
    setExerciseResult(null);
    setTotalXP(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentExercise = exercises[currentExerciseIndex];
  const progress = ((currentExerciseIndex + (showResult ? 1 : 0)) / exercises.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="max-w-2xl mx-auto border-0 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="space-y-2">
            <CardTitle className="text-2xl">
              {podcastTitle}
            </CardTitle>
            <CardDescription>
              Esercizi di {language} - Livello {difficulty}
            </CardDescription>
            <div className="flex items-center gap-4 justify-center">
              <Badge variant={difficulty === "A1" ? "default" : "secondary"}>
                {difficulty}
              </Badge>
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">{hearts}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">{totalXP} XP</span>
              </div>
            </div>
          </div>
          
          <Progress value={progress} className="h-2" />
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">
              Domanda {currentExerciseIndex + 1} di {exercises.length}
            </h3>
            <p className="text-foreground">{currentExercise.question}</p>
          </div>

          <motion.div
            key={currentExerciseIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {currentExercise.exercise_type === "multiple_choice" && (
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                {currentExercise.options && Array.isArray(currentExercise.options) && 
                 currentExercise.options.map((option: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value={option} 
                      id={`option-${index}`}
                      disabled={showResult}
                    />
                    <Label 
                      htmlFor={`option-${index}`} 
                      className={`cursor-pointer ${
                        showResult && exerciseResult?.correct_answer === option 
                          ? "text-green-600 font-semibold" 
                          : showResult && selectedAnswer === option && !exerciseResult?.is_correct
                          ? "text-red-600"
                          : ""
                      }`}
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentExercise.exercise_type === "fill_blank" && (
              <div className="space-y-2">
                <Label htmlFor="answer">La tua risposta:</Label>
                <Input
                  id="answer"
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  placeholder="Inserisci la tua risposta..."
                  disabled={showResult}
                  className={showResult ? 
                    (exerciseResult?.is_correct ? "border-green-500" : "border-red-500") 
                    : ""
                  }
                />
              </div>
            )}

            {currentExercise.exercise_type === "vocabulary" && (
              <div className="space-y-4">
                {currentExercise.options && typeof currentExercise.options === 'object' && 
                 currentExercise.options.word && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-blue-900">Parola: {currentExercise.options.word}</h4>
                      <p className="text-blue-700">Esempio: {currentExercise.options.example}</p>
                    </CardContent>
                  </Card>
                )}
                <div className="space-y-2">
                  <Label htmlFor="vocab-answer">Definizione:</Label>
                  <Textarea
                    id="vocab-answer"
                    value={selectedAnswer}
                    onChange={(e) => setSelectedAnswer(e.target.value)}
                    placeholder="Scrivi la definizione della parola..."
                    disabled={showResult}
                    className={showResult ? 
                      (exerciseResult?.is_correct ? "border-green-500" : "border-red-500") 
                      : ""
                    }
                  />
                </div>
              </div>
            )}

            {currentExercise.exercise_type === "reflection" && (
              <div className="space-y-2">
                <Label htmlFor="reflection">La tua riflessione:</Label>
                <Textarea
                  id="reflection"
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  placeholder="Condividi i tuoi pensieri..."
                  disabled={showResult}
                  rows={4}
                />
              </div>
            )}

            {showResult && exerciseResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border-2 ${
                  exerciseResult.is_correct 
                    ? "bg-green-50 border-green-200" 
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {exerciseResult.is_correct ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`font-semibold ${
                    exerciseResult.is_correct ? "text-green-700" : "text-red-700"
                  }`}>
                    {exerciseResult.is_correct ? "Corretto!" : "Non corretto"}
                  </span>
                </div>
                <div className="text-sm">
                  {!exerciseResult.is_correct && (
                    <p className="text-red-600 mb-1">
                      <strong>Risposta corretta:</strong> {exerciseResult.correct_answer}
                    </p>
                  )}
                  {exerciseResult.explanation && (
                    <p className="text-gray-600">
                      <strong>Spiegazione:</strong> {exerciseResult.explanation}
                    </p>
                  )}
                  {exerciseResult.is_correct && (
                    <p className="text-green-600">
                      <strong>XP guadagnati:</strong> +{exerciseResult.xp_reward}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={resetExercises} 
                variant="outline" 
                size="lg"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Ricomincia
              </Button>
              
              {showResult ? (
                <Button 
                  onClick={nextExercise} 
                  size="lg"
                  className="flex-1"
                  variant="learning"
                >
                  {currentExerciseIndex < exercises.length - 1 ? "Prossimo" : "Completa"}
                </Button>
              ) : (
                <Button 
                  onClick={() => handleAnswer(selectedAnswer)} 
                  disabled={!selectedAnswer.trim()}
                  size="lg"
                  className="flex-1"
                  variant="learning"
                >
                  Conferma
                </Button>
              )}
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
};