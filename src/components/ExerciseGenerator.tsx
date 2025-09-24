import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { DragDropExercises } from "./DragDropExercises";
import { CheckCircle, XCircle, Star, RefreshCw, ArrowLeft, AlertCircle, GripVertical, PartyPopper, TrendingUp, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Exercise, 
  ExerciseResult,
  NextActionRecommendation,
  getEpisodeExercises, 
  checkExerciseAnswer, 
  saveExerciseResult, 
  updateUserProgress,
  markEpisodeCompleted,
  getNextEpisodeSuggestions,
  getNextRecommendation
} from "@/services/exerciseService";
import { PodcastEpisode } from "@/services/podcastService";

interface ExerciseGeneratorProps {
  episode: PodcastEpisode;
  level: string;
  intensity: string;
  onComplete: () => void;
  onBack: () => void;
}

// Mock exercises - only used as absolute fallback
const getLevelDisplayName = (level: string): string => {
  const names = {
    beginner: "Beginner",
    intermediate: "Intermediate", 
    advanced: "Advanced"
  };
  return names[level as keyof typeof names] || level;
};

const createMockExercises = (episode: PodcastEpisode, level: string, intensity: string): Exercise[] => {
  const language = episode.podcast_source?.language || 'english';
  const levelMap: Record<string, string> = {
    'beginner': 'A1',
    'intermediate': 'B1', 
    'advanced': 'C1'
  };
  
  const cefrLevel = levelMap[level] || 'A1';

  const exerciseTexts = {
    english: {
      A1: [
        {
          question: "What is the main topic discussed in this episode?",
          options: ["Language learning", "Technology", "Travel", "Food"],
          correct_answer: "Language learning",
          explanation: "This episode focuses on effective language learning strategies."
        },
        {
          question: "Complete the sentence: 'Practice makes ___'",
          correct_answer: "perfect",
          explanation: "The common phrase is 'practice makes perfect'."
        }
      ],
      B1: [
        {
          question: "According to the speaker, what is the most effective way to learn a language?",
          options: ["Reading books only", "Daily practice with variety", "Memorizing grammar rules", "Watching movies only"],
          correct_answer: "Daily practice with variety",
          explanation: "The speaker emphasizes consistent daily practice using various methods."
        }
      ],
      C1: [
        {
          question: "Analyze the methodology discussed for language acquisition. What are its key strengths?",
          correct_answer: "Combines structured learning with practical application and addresses different learning styles",
          explanation: "Advanced analysis requires identifying multiple components and synergistic effects."
        }
      ]
    },
    italian: {
      A1: [
        {
          question: "Le gemelle si chiamano Gina e Sunny.",
          exercise_type: "true_false",
          correct_answer: "true",
          explanation: "Secondo il podcast, le gemelle si chiamano effettivamente Gina e Sunny."
        },
        {
          question: "Qual è il colore preferito di Gina?",
          options: ["Rosso", "Blu", "Verde", "Giallo"],
          correct_answer: "Blu",
          explanation: "Gina preferisce il colore blu."
        },
        {
          question: "Completa la frase: 'La famiglia vive a ___'",
          exercise_type: "gap_fill",
          options: ["Roma", "Milano", "Napoli", "Firenze"],
          correct_answer: "Roma",
          explanation: "La famiglia vive nella capitale italiana, Roma."
        }
      ],
      B1: [
        {
          question: "Secondo il racconto, quale tradizione italiana è più importante per la famiglia?",
          options: ["La pasta della domenica", "Il caffè del mattino", "La passeggiata serale", "Il calcio"],
          correct_answer: "La pasta della domenica",
          explanation: "La famiglia tiene molto alla tradizione della pasta domenicale tutti insieme."
        }
      ],
      C1: [
        {
          question: "Analizza il rapporto tra tradizione e modernità presentato nell'episodio",
          correct_answer: "La famiglia cerca di mantenere le tradizioni italiane pur adattandosi alla vita moderna",
          explanation: "Il podcast mostra come bilanciare valori tradizionali con esigenze contemporanee."
        }
      ]
    }
  };

  const texts = exerciseTexts[language as keyof typeof exerciseTexts] || exerciseTexts.english;
  const levelExercises = (texts as any)[cefrLevel] || (texts as any).A1 || exerciseTexts.english.A1;
  
  const exerciseCount = intensity === "intense" ? 20 : 10;
  const finalExercises = [];
  
  for (let i = 0; i < exerciseCount; i++) {
    const sourceExercise = levelExercises[i % levelExercises.length];
    finalExercises.push(sourceExercise);
  }

  return finalExercises.map((exercise, index) => ({
    id: `mock-${language}-${level}-${index + 1}`,
    episode_id: episode.id,
    question: exercise.question,
    exercise_type: exercise.exercise_type || (exercise.options ? "multiple_choice" : "fill_blank"),
    options: exercise.options,
    difficulty: level,
    intensity,
    xp_reward: level === "beginner" ? 5 : level === "intermediate" ? 10 : 15,
    order_index: index,
    correct_answer: exercise.correct_answer,
    explanation: exercise.explanation
  }));
};

export const ExerciseGenerator = ({ episode, level, intensity, onComplete, onBack }: ExerciseGeneratorProps) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | any[]>("");
  const [matchingAnswers, setMatchingAnswers] = useState<{[key: string]: string}>({});
  const [sequenceItems, setSequenceItems] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [exerciseResult, setExerciseResult] = useState<ExerciseResult | null>(null);
  const [totalXP, setTotalXP] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [nextEpisodes, setNextEpisodes] = useState<any>(null);
  const [nextRecommendation, setNextRecommendation] = useState<NextActionRecommendation | null>(null);

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching exercises from database for:', { 
        episodeId: episode.id, 
        level, 
        intensity 
      });
      
      // First, try to get exercises from the database
      const dbExercises = await getEpisodeExercises(episode.id, level, intensity);
      
      console.log('Database exercises found:', dbExercises.length);
      
      if (dbExercises && dbExercises.length > 0) {
        // Apply intensity filtering
        const targetCount = intensity === 'intense' ? 20 : 10;
        const filteredExercises = dbExercises.slice(0, targetCount);
        
const processedExercises = filteredExercises.map(exercise => ({
  ...exercise,
  // Process options if it's a JSON string
  options: typeof exercise.options === 'string' 
    ? JSON.parse(exercise.options) 
    : exercise.options,
  // Clean correct_answer of any extra quotes - with null check
  correct_answer: (exercise.correct_answer && typeof exercise.correct_answer === 'string')
    ? exercise.correct_answer.replace(/^["']|["']$/g, '') 
    : exercise.correct_answer || ""
}));

console.log('Sample processed exercise:', processedExercises[0]);
setExercises(processedExercises);
        setUsingMockData(false);
        
        // Initialize exercise state
        initializeExerciseState(processedExercises[0]);
        
        console.log('Using database exercises:', filteredExercises.length);
        
        toast({
          title: "Exercises Loaded",
          description: `Loaded ${filteredExercises.length} exercises from database`,
        });
        
      } else {
        // No database exercises found, use mock data as fallback
        console.log('No database exercises found, using mock data');
        
        const mockExercises = createMockExercises(episode, level, intensity);
        setExercises(mockExercises);
        setUsingMockData(true);
        
        // Initialize exercise state
        initializeExerciseState(mockExercises[0]);
        
        toast({
          title: "Using Sample Exercises",
          description: "No specific exercises found for this episode. Using sample exercises.",
          variant: "default",
        });
      }
      
    } catch (error) {
      console.error('Error loading exercises from database:', error);
      setError(error instanceof Error ? error.message : 'Failed to load exercises');
      
      // Fallback to mock data on error
      const mockExercises = createMockExercises(episode, level, intensity);
      setExercises(mockExercises);
      setUsingMockData(true);
      
      // Initialize exercise state
      initializeExerciseState(mockExercises[0]);
      
      toast({
        title: "Connection Error",
        description: "Could not connect to database. Using sample exercises.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeExerciseState = (exercise: Exercise) => {
    if (!exercise) return;
    
    setSelectedAnswer("");
    setMatchingAnswers({});
    setSequenceItems([]);
    
    if (exercise.exercise_type === 'sequencing' && exercise.options) {
      // Shuffle the items for sequencing
      const items = Array.isArray(exercise.options) ? exercise.options : exercise.options.items || [];
      setSequenceItems([...items].sort(() => Math.random() - 0.5));
    }
  };

  const handleAnswer = async (answer: string | any[]) => {
    if (showResult) return;
// Debug logging
console.log('=== ANSWER DEBUG ===');
console.log('Selected Answer:', answer, typeof answer);
console.log('Current Exercise:', currentExercise);
console.log('Correct Answer:', currentExercise.correct_answer, typeof currentExercise.correct_answer);
console.log('Exercise Options:', currentExercise.options);
    setSelectedAnswer(answer);
    setShowResult(true);

    try {
      let result: ExerciseResult;
      
      // Handle mock exercises differently
if (usingMockData || currentExercise.id.startsWith('mock-') || currentExercise.exercise_type === 'sequencing' || currentExercise.exercise_type === 'drag_drop_sequencing') {
  const mockCorrectAnswer = getMockCorrectAnswer();
  let answerStr = typeof answer === 'string' ? answer : JSON.stringify(answer);
  
  // Force sequencing logic for all exercises that might be sequencing
  let isCorrect = false;
  if (answerStr.includes('|||') || mockCorrectAnswer.includes('|||')) {
    // This is definitely a sequencing exercise - use sequencing comparison
    const userSequence = answerStr.split('|||').map(item => item.trim()).filter(Boolean);
    const correctSequence = mockCorrectAnswer.split('|||').map(item => item.trim()).filter(Boolean);
    isCorrect = userSequence.length === correctSequence.length && 
                userSequence.every((item, index) => item === correctSequence[index]);
  } else {
    // Regular text comparison
    isCorrect = answerStr.toLowerCase().trim() === mockCorrectAnswer.toLowerCase().trim();
  }
  
  result = {
    is_correct: isCorrect,
    correct_answer: mockCorrectAnswer,
    explanation: getMockExplanation(),
    xp_reward: currentExercise.xp_reward
  };
  
  setExerciseResult(result);
  
  // For mock exercises, simulate saving (but don't actually save to DB)
  console.log('Mock exercise result:', result);
  
} else {
  // Real database exercise
  result = await checkExerciseAnswer(currentExercise.id, answer);
  setExerciseResult(result);
  // Save the result to database
  await saveExerciseResult(
    currentExercise.id,
    episode.id,
    answer,
    result.is_correct,
    result.is_correct ? result.xp_reward : 0
  );
  
  console.log('Database exercise result:', result);
}

      // Handle correct/incorrect logic
      if (result.is_correct) {
        setTotalXP(prev => prev + result.xp_reward);
        
        // Only update user progress for real database exercises
        if (!usingMockData && !currentExercise.id.startsWith('mock-')) {
          await updateUserProgress(result.xp_reward);
        }
        
        toast({
          title: getLocalizedText('correct'),
          description: `+${result.xp_reward} XP`,
        });
      } else {
        toast({
          title: getLocalizedText('incorrect'),
          description: result.explanation || getLocalizedText('tryAgain'),
          variant: "destructive",
        });
      }

      setTotalAnswers(prev => prev + 1);
      if (result.is_correct) {
        setCorrectAnswers(prev => prev + 1);
      }

    } catch (error) {
      console.error('Error processing answer:', error);
      toast({
        title: "Error",
        description: "Failed to process answer",
        variant: "destructive",
      });
    }
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
      setShowResult(false);
      setExerciseResult(null);
      initializeExerciseState(exercises[currentExerciseIndex + 1]);
    } else {
      // Show completion screen
      handleExerciseCompletion();
    }
  };

  const handleExerciseCompletion = async () => {
    try {
      // Get next recommendation
      const recommendation = await getNextRecommendation('user-id', episode.id, level, intensity);
      setNextRecommendation(recommendation);
      
      // Get next episodes if needed
      if (recommendation.episodeId !== episode.id) {
        const suggestions = await getNextEpisodeSuggestions(episode.id, level);
        setNextEpisodes(suggestions);
      }
      
      setShowCompletion(true);
    } catch (error) {
      console.error('Error getting next recommendation:', error);
      setShowCompletion(true);
    }
  };

  const handleNextRecommendation = () => {
    if (nextRecommendation) {
      // Navigate to next recommended exercise
      onComplete();
    }
  };

  const handleEpisodeSelect = (episodeId: string) => {
    // Handle episode selection
    onComplete();
  };

 const getMockCorrectAnswer = () => {
  // Se correct_answer è vuoto e abbiamo opzioni, ricostruisci automaticamente per sequencing
  if ((!currentExercise.correct_answer || currentExercise.correct_answer === "") && currentExercise.options && Array.isArray(currentExercise.options)) {
    // Per qualsiasi esercizio con opzioni array, usa l'ordine delle opzioni come risposta corretta
    return currentExercise.options.join('|||');
  }
  return currentExercise.correct_answer || "";
};

  const getMockExplanation = () => {
    return currentExercise.explanation || "Check your answer and try again.";
  };

  const getLocalizedText = (key: string) => {
    const texts = {
      correct: "Correct!",
      incorrect: "Incorrect",
      tryAgain: "Try again",
    };
    return texts[key as keyof typeof texts] || key;
  };

  const currentExercise = exercises[currentExerciseIndex];
  const progress = exercises.length > 0 ? ((currentExerciseIndex + 1) / exercises.length) * 100 : 0;
  const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading exercises...</p>
        </div>
      </div>
    );
  }

  if (!currentExercise) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
          <p>No exercises available</p>
          <Button onClick={onBack} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (showCompletion) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <PartyPopper className="h-16 w-16 mx-auto mb-6 text-primary" />
          <h2 className="text-3xl font-bold mb-4">Exercise Complete!</h2>
          
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <Star className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                <p className="text-2xl font-bold">{totalXP}</p>
                <p className="text-sm text-muted-foreground">XP Earned</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">{accuracy.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">Accuracy</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{correctAnswers}/{totalAnswers}</p>
                <p className="text-sm text-muted-foreground">Correct</p>
              </CardContent>
            </Card>
          </div>

          {nextRecommendation && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>What's Next?</CardTitle>
                <CardDescription>{nextRecommendation.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleNextRecommendation} className="w-full mb-4">
                  {nextRecommendation.buttonText}
                </Button>
                <Button variant="outline" onClick={onComplete} className="w-full">
                  Choose another exercise
                </Button>
              </CardContent>
            </Card>
          )}

          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Episode
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-4">
          <Badge variant="secondary">
            {getLevelDisplayName(level)} • {intensity === 'intense' ? 'Intense' : 'Light'}
          </Badge>
          {usingMockData && (
            <Badge variant="outline">Sample Exercises</Badge>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Question {currentExerciseIndex + 1} of {exercises.length}</span>
          <span>{totalXP} XP • {accuracy.toFixed(0)}% accuracy</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

     {/* Exercise Content - Conditional rendering */}
      {currentExercise.exercise_type === "matching" ? (
        // Matching exercise uses its own layout
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{currentExercise.question}</h2>
          <DragDropExercises 
            exercises={[{
              id: currentExercise.id,
              type: "DragDropMatching",
              question: "",
              items: currentExercise.options?.map((pair: string) => pair.split(' → ')[0]) || [],
              targets: currentExercise.options?.map((pair: string) => pair.split(' → ')[1]) || [],
              correctAnswer: JSON.stringify(
                currentExercise.options?.reduce((acc: any, pair: string) => {
                  const [term, def] = pair.split(' → ');
                  acc[term] = def;
                  return acc;
                }, {}) || {}
              ),
              explanation: currentExercise.explanation || "",
              points: currentExercise.xp_reward || 5,
              difficulty: currentExercise.difficulty || level,
              level: level
            }]}
            onComplete={(results) => {
              handleAnswer(results[0].userAnswer);
            }}
            onBack={onBack}
          />
        </div>
      ) : (
        // All other exercise types use the Card layout
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {currentExercise.question}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Multiple Choice */}
              {currentExercise.exercise_type === 'multiple_choice' && currentExercise.options && (
                <RadioGroup
                  value={selectedAnswer as string}
                  onValueChange={setSelectedAnswer}
                  disabled={showResult}
                >
                  {currentExercise.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`}>{option}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {/* Fill in the blank */}
              {(currentExercise.exercise_type === 'fill_blank' || !currentExercise.exercise_type) && (
                <Input
                  value={selectedAnswer as string}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  placeholder="Type your answer..."
                  disabled={showResult}
                />
              )}

              {/* True/False */}
              {currentExercise.exercise_type === 'true_false' && (
                <RadioGroup
                  value={selectedAnswer as string}
                  onValueChange={setSelectedAnswer}
                  disabled={showResult}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="true" />
                    <Label htmlFor="true">True</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="false" />
                    <Label htmlFor="false">False</Label>
                  </div>
                </RadioGroup>
              )}

              {/* Sequencing */}
              {currentExercise.exercise_type === "sequencing" && (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">
                    Clicca sugli elementi nell'ordine corretto per creare la sequenza:
                  </div>

                  <div className="space-y-3">
                    {Array.isArray(currentExercise.options) && currentExercise.options.map((item, index) => {
                      const currentOrder = typeof selectedAnswer === 'string' ? selectedAnswer.split('|||').filter(Boolean) : [];
                      const isSelected = currentOrder.includes(item);
                      const position = isSelected ? currentOrder.indexOf(item) + 1 : null;

                      return (
                        <div 
                          key={index}
                          className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-blue-50 border-blue-300' 
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          }`}
                          onClick={() => {
                            if (!isSelected) {
                              const newOrder = [...currentOrder, item];
                              setSelectedAnswer(newOrder.join('|||'));
                            }
                          }}
                        >
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-medium ${
                            isSelected 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-300 text-gray-600'
                          }`}>
                            {position || '•'}
                          </div>
                          <span className="flex-1">{item}</span>
                          {isSelected && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newOrder = currentOrder.filter(orderItem => orderItem !== item);
                                setSelectedAnswer(newOrder.join('|||'));
                              }}
                              className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded"
                            >
                              Rimuovi
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected Order Display */}
                  {selectedAnswer && typeof selectedAnswer === 'string' && selectedAnswer !== '' && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-300 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">Ordine selezionato:</h4>
                      <div className="space-y-2">
                        {selectedAnswer.split('|||').filter(Boolean).map((item, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-500 text-white rounded-full text-sm flex items-center justify-center">
                              {index + 1}
                            </span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Answer Button for non-matching exercises */}
          {!showResult && (
            <Button
              onClick={() => handleAnswer(selectedAnswer)}
              disabled={!selectedAnswer || selectedAnswer === ""}
              className="w-full"
            >
              Submit Answer
            </Button>
          )}
        </>
      )}