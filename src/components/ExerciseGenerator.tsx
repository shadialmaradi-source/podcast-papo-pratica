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
import { CheckCircle, XCircle, Star, Heart, RefreshCw, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { 
  Exercise, 
  ExerciseResult,
  getEpisodeExercises, 
  checkExerciseAnswer, 
  saveExerciseResult, 
  updateUserProgress,
  decreaseHearts 
} from "@/services/exerciseService";
import { PodcastEpisode } from "@/services/podcastService";

interface ExerciseGeneratorProps {
  episode: PodcastEpisode;
  level: string;
  onComplete: () => void;
  onBack: () => void;
}

// Mock exercises for fallback when no real exercises exist
const createMockExercises = (episode: PodcastEpisode, level: string): Exercise[] => {
  const baseExercises = {
    "A1": [
      {
        id: "mock-a1-1",
        episode_id: episode.id,
        question: "What time of day is mentioned in the episode?",
        exercise_type: "multiple_choice" as const,
        options: ["Morning", "Afternoon", "Evening", "Night"],
        difficulty: "A1",
        xp_reward: 5,
        order_index: 0,
        correct_answer: "Morning",
        explanation: "The speaker talks about morning routines at the beginning."
      },
      {
        id: "mock-a1-2", 
        episode_id: episode.id,
        question: "Complete: 'I usually ___ breakfast at 7 AM'",
        exercise_type: "fill_blank" as const,
        difficulty: "A1",
        xp_reward: 5,
        order_index: 1,
        correct_answer: "eat",
        explanation: "The verb 'eat' is used for consuming food."
      }
    ],
    "A2": [
      {
        id: "mock-a2-1",
        episode_id: episode.id,
        question: "According to the speaker, what is the best way to learn a language?",
        exercise_type: "multiple_choice" as const,
        options: ["Reading books", "Daily practice", "Watching movies", "Studying grammar"],
        difficulty: "A2",
        xp_reward: 7,
        order_index: 0,
        correct_answer: "Daily practice",
        explanation: "The speaker emphasizes the importance of consistent daily practice."
      },
      {
        id: "mock-a2-2", 
        episode_id: episode.id,
        question: "Fill in the blank: 'The most important thing is to ___ every day'",
        exercise_type: "fill_blank" as const,
        difficulty: "A2",
        xp_reward: 7,
        order_index: 1,
        correct_answer: "practice",
        explanation: "Consistent practice is key to language learning success."
      }
    ],
    "B1": [
      {
        id: "mock-b1-1",
        episode_id: episode.id,
        question: "What cultural difference does the speaker highlight about morning routines?",
        exercise_type: "multiple_choice" as const,
        options: [
          "Some cultures skip breakfast entirely", 
          "Different cultures have varying meal times", 
          "Exercise habits vary by country",
          "Work schedules differ globally"
        ],
        difficulty: "B1",
        xp_reward: 10,
        order_index: 0,
        correct_answer: "Different cultures have varying meal times",
        explanation: "The speaker discusses how meal timing varies across cultures."
      },
      {
        id: "mock-b1-2",
        episode_id: episode.id, 
        question: "Rearrange these words: 'important / very / is / consistency / language / in / learning'",
        exercise_type: "reorder" as const,
        difficulty: "B1",
        xp_reward: 10,
        order_index: 1,
        correct_answer: "Consistency is very important in language learning",
        explanation: "This sentence structure follows subject-verb-object pattern with emphasis."
      }
    ],
    "B2": [
      {
        id: "mock-b2-1",
        episode_id: episode.id,
        question: "Analyze the speaker's argument about habit formation. What evidence do they provide?",
        exercise_type: "comprehension" as const,
        difficulty: "B2",
        xp_reward: 12,
        order_index: 0,
        correct_answer: "The speaker mentions scientific studies and personal experience",
        explanation: "The argument combines research evidence with anecdotal experience."
      },
      {
        id: "mock-b2-2",
        episode_id: episode.id, 
        question: "What does 'establish a routine' mean in this context?",
        exercise_type: "vocabulary" as const,
        difficulty: "B2",
        xp_reward: 12,
        order_index: 1,
        options: {
          word: "establish a routine",
          definition: "To create and maintain regular habits",
          example: "It's important to establish a routine when learning a new language."
        },
        correct_answer: "To create and maintain regular habits",
        explanation: "Establishing a routine means creating consistent, repeated actions."
      }
    ],
    "C1": [
      {
        id: "mock-c1-1",
        episode_id: episode.id,
        question: "Critically evaluate the speaker's methodology for language acquisition. What are the strengths and potential weaknesses?",
        exercise_type: "analysis" as const,
        difficulty: "C1",
        xp_reward: 15,
        order_index: 0,
        correct_answer: "Strengths include practical applicability; weaknesses may include lack of formal structure",
        explanation: "Critical analysis requires examining both positive and negative aspects."
      },
      {
        id: "mock-c1-2",
        episode_id: episode.id, 
        question: "Discuss how the cultural perspectives presented might influence language learning outcomes.",
        exercise_type: "reflection" as const,
        difficulty: "C1",
        xp_reward: 15,
        order_index: 1,
        correct_answer: "Cultural awareness enhances understanding and motivation",
        explanation: "Cultural context provides deeper meaning and connection to the language."
      }
    ],
    "C2": [
      {
        id: "mock-c2-1",
        episode_id: episode.id,
        question: "Synthesize the key principles discussed and propose an alternative framework for language learning that addresses the limitations mentioned.",
        exercise_type: "synthesis" as const,
        difficulty: "C2",
        xp_reward: 20,
        order_index: 0,
        correct_answer: "A multimodal approach combining structured learning with immersive practice",
        explanation: "Advanced synthesis requires integrating concepts and creating new solutions."
      },
      {
        id: "mock-c2-2",
        episode_id: episode.id, 
        question: "Analyze the sociolinguistic implications of the cultural differences described. How might these impact cross-cultural communication?",
        exercise_type: "analysis" as const,
        difficulty: "C2",
        xp_reward: 20,
        order_index: 1,
        correct_answer: "Cultural patterns influence communication styles and expectations",
        explanation: "Understanding sociolinguistic factors is crucial for effective intercultural dialogue."
      }
    ]
  };

  return baseExercises[level as keyof typeof baseExercises] || baseExercises["A1"];
};

export const ExerciseGenerator = ({ episode, level, onComplete, onBack }: ExerciseGeneratorProps) => {
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
      const data = await getEpisodeExercises(episode.id);
      if (data.length === 0) {
        // If no exercises in DB, use mock data for the specified level
        setExercises(createMockExercises(episode, level));
      } else {
        // Filter exercises by level
        const levelFilteredExercises = data.filter(ex => ex.difficulty === level);
        setExercises(levelFilteredExercises.length > 0 ? levelFilteredExercises : createMockExercises(episode, level));
      }
    } catch (error) {
      console.error('Error loading exercises:', error);
      // Fallback to mock data for the specified level
      setExercises(createMockExercises(episode, level));
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
        episode.id,
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
    return currentExercise.correct_answer || "";
  };

  const getMockExplanation = () => {
    return currentExercise.explanation || "Good attempt! Keep practicing to improve your skills.";
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
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl">
              {episode.title}
            </CardTitle>
            <CardDescription>
              {episode.podcast_source?.title} - Exercises for Level {level}
            </CardDescription>
            <div className="flex items-center gap-4 justify-center">
              <Badge variant="default" className="bg-primary">
                Level {level}
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

            {(currentExercise.exercise_type === "reflection" || 
              currentExercise.exercise_type === "analysis" || 
              currentExercise.exercise_type === "synthesis" ||
              currentExercise.exercise_type === "comprehension") && (
              <div className="space-y-2">
                <Label htmlFor="reflection">Your answer:</Label>
                <Textarea
                  id="reflection"
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  placeholder="Share your thoughts and analysis..."
                  disabled={showResult}
                  rows={4}
                />
              </div>
            )}

            {currentExercise.exercise_type === "reorder" && (
              <div className="space-y-2">
                <Label htmlFor="reorder">Reorder the words to form a correct sentence:</Label>
                <Input
                  id="reorder"
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  placeholder="Write the reordered sentence..."
                  disabled={showResult}
                  className={showResult ? 
                    (exerciseResult?.is_correct ? "border-green-500" : "border-red-500") 
                    : ""
                  }
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