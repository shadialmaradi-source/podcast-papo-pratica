import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Star, Heart, RefreshCw, ArrowLeft, AlertCircle, GripVertical } from "lucide-react";
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
  intensity: string;
  onComplete: () => void;
  onBack: () => void;
}

// Mock exercises - only used as absolute fallback
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
  const [hearts, setHearts] = useState(5);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        
        setExercises(filteredExercises);
        setUsingMockData(false);
        
        // Initialize exercise state
        initializeExerciseState(filteredExercises[0]);
        
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

    setSelectedAnswer(answer);
    setShowResult(true);

    try {
      let result: ExerciseResult;
      
      // Handle mock exercises differently
      if (usingMockData || currentExercise.id.startsWith('mock-')) {
        const mockCorrectAnswer = getMockCorrectAnswer();
        const answerStr = typeof answer === 'string' ? answer : JSON.stringify(answer);
        const isCorrect = answerStr.toLowerCase().trim() === mockCorrectAnswer.toLowerCase().trim();
        
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
        // Handle heart decrease
        if (!usingMockData && !currentExercise.id.startsWith('mock-')) {
          const newHearts = await decreaseHearts();
          setHearts(newHearts);
        } else {
          setHearts(prev => Math.max(0, prev - 1));
        }
        
        toast({
          title: getLocalizedText('incorrect'),
          description: result.explanation || getLocalizedText('tryAgain'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error handling answer:', error);
      toast({
        title: getLocalizedText('error'),
        description: getLocalizedText('errorProcessing'),
        variant: "destructive",
      });
    }
  };

  const getMockCorrectAnswer = () => {
    if (!usingMockData) return "";
    const mockExercises = createMockExercises(episode, level, intensity);
    return mockExercises[currentExerciseIndex]?.correct_answer || "";
  };

  const getMockExplanation = () => {
    if (!usingMockData) return "";
    const mockExercises = createMockExercises(episode, level, intensity);
    return mockExercises[currentExerciseIndex]?.explanation || "";
  };

  const handleNext = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      const nextIndex = currentExerciseIndex + 1;
      setCurrentExerciseIndex(nextIndex);
      setSelectedAnswer("");
      setShowResult(false);
      setExerciseResult(null);
      initializeExerciseState(exercises[nextIndex]);
    } else {
      onComplete();
    }
  };

  const moveSequenceItem = (fromIndex: number, toIndex: number) => {
    const newItems = [...sequenceItems];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    setSequenceItems(newItems);
    setSelectedAnswer(newItems);
  };

  const handleMatchingChange = (leftItem: string, rightValue: string) => {
    const newAnswers = { ...matchingAnswers, [leftItem]: rightValue };
    setMatchingAnswers(newAnswers);
    
    // Convert to array format for validation
    const leftItems = currentExercise.options?.left || [];
    const answerArray = leftItems.map((item: string) => newAnswers[item] || "");
    setSelectedAnswer(answerArray);
  };

  const getAnswerForSubmission = () => {
    if (currentExercise.exercise_type === 'matching') {
      return Object.values(matchingAnswers);
    } else if (currentExercise.exercise_type === 'sequencing') {
      return sequenceItems;
    } else {
      return selectedAnswer;
    }
  };

  const isAnswerComplete = () => {
    if (currentExercise.exercise_type === 'matching') {
      const leftItems = currentExercise.options?.left || [];
      return leftItems.every((item: string) => matchingAnswers[item]);
    } else if (currentExercise.exercise_type === 'sequencing') {
      return sequenceItems.length > 0;
    } else {
      const answerStr = typeof selectedAnswer === 'string' ? selectedAnswer : JSON.stringify(selectedAnswer);
      return Boolean(answerStr && answerStr.trim());
    }
  };

  const getLocalizedText = (key: string) => {
    const lang = episode.podcast_source?.language || 'english';
    const texts = {
      back: { portuguese: 'Voltar', spanish: 'Volver', french: 'Retour', german: 'Zurück', english: 'Back' },
      exercise: { portuguese: 'Exercício', spanish: 'Ejercicio', french: 'Exercice', german: 'Übung', english: 'Exercise' },
      of: { portuguese: 'de', spanish: 'de', french: 'de', german: 'von', english: 'of' },
      next: { portuguese: 'Próximo', spanish: 'Siguiente', french: 'Suivant', german: 'Weiter', english: 'Next' },
      finish: { portuguese: 'Finalizar', spanish: 'Terminar', french: 'Terminer', german: 'Beenden', english: 'Finish' },
      correct: { portuguese: 'Correto! ✅', spanish: '¡Correcto! ✅', french: 'Correct! ✅', german: 'Richtig! ✅', english: 'Correct! ✅' },
      incorrect: { portuguese: 'Incorreto ❌', spanish: 'Incorrecto ❌', french: 'Incorrect ❌', german: 'Falsch ❌', english: 'Incorrect ❌' },
      tryAgain: { portuguese: 'Tente novamente!', spanish: '¡Inténtalo de nuevo!', french: 'Essayez encore!', german: 'Versuchen Sie es erneut!', english: 'Try again!' },
      error: { portuguese: 'Erro', spanish: 'Error', french: 'Erreur', german: 'Fehler', english: 'Error' },
      errorProcessing: { portuguese: 'Erro ao processar resposta', spanish: 'Error al procesar respuesta', french: 'Erreur lors du traitement de la réponse', german: 'Fehler beim Verarbeiten der Antwort', english: 'Error processing answer' }
    };
    return texts[key as keyof typeof texts]?.[lang as keyof typeof texts[keyof typeof texts]] || texts[key as keyof typeof texts]?.english || key;
  };

  const getLevelDisplayName = (level: string) => {
    const names = {
      beginner: "Beginner",
      intermediate: "Intermediate", 
      advanced: "Advanced"
    };
    return names[level as keyof typeof names] || level;
  };

  // Retry loading exercises from database
  const retryLoadExercises = async () => {
    await loadExercises();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="max-w-md mx-auto text-center p-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Loading Exercises...</h3>
          <p className="text-muted-foreground">Connecting to database...</p>
        </Card>
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="max-w-md mx-auto text-center p-8">
          <XCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Exercises Available</h3>
          <p className="text-muted-foreground mb-4">
            {error ? `Database error: ${error}` : 'Could not load exercises for this episode.'}
          </p>
          <div className="space-y-2">
            <Button onClick={retryLoadExercises} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button onClick={onBack}>Go Back</Button>
          </div>
        </Card>
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
              {getLocalizedText('back')}
            </Button>
            
            {/* Show indicator if using mock data */}
            {usingMockData && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3" />
                <span>Sample Mode</span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-2xl">
              {episode.title}
            </CardTitle>
            <CardDescription>
              {episode.podcast_source?.title} - {getLevelDisplayName(level)} Level - {intensity === "intense" ? "Intense" : "Light"} Mode
              {usingMockData && (
                <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Using sample exercises - database exercises not available
                </div>
              )}
            </CardDescription>
            
            <div className="flex items-center gap-4 justify-center">
              <Badge variant="outline">
                {getLocalizedText('exercise')} {currentExerciseIndex + 1} {getLocalizedText('of')} {exercises.length}
              </Badge>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">{totalXP} XP</span>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Heart 
                    key={i} 
                    className={`h-4 w-4 ${i < hearts ? 'text-red-500 fill-current' : 'text-gray-300'}`} 
                  />
                ))}
              </div>
            </div>
          </div>
          
          <Progress value={progress} className="w-full" />
          
          {/* Database connection retry button */}
          {usingMockData && (
            <div className="pt-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={retryLoadExercises}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Database Again
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          <motion.div
            key={currentExerciseIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="text-lg font-medium leading-relaxed">
              {currentExercise.question}
            </div>

            {currentExercise.exercise_type === "multiple_choice" && currentExercise.options && (
              <RadioGroup 
                value={typeof selectedAnswer === 'string' ? selectedAnswer : ''} 
                onValueChange={(value) => setSelectedAnswer(value)}
                className="space-y-3"
              >
                {currentExercise.options.map((option: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value={option} 
                      id={`option-${index}`}
                      disabled={showResult}
                    />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentExercise.exercise_type === "true_false" && (
              <RadioGroup 
                value={typeof selectedAnswer === 'string' ? selectedAnswer : ''} 
                onValueChange={(value) => setSelectedAnswer(value)}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="true" disabled={showResult} />
                  <Label htmlFor="true" className="flex-1 cursor-pointer">True</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="false" disabled={showResult} />
                  <Label htmlFor="false" className="flex-1 cursor-pointer">False</Label>
                </div>
              </RadioGroup>
            )}

            {currentExercise.exercise_type === "matching" && currentExercise.options && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Match these items:</Label>
                    <div className="space-y-2 mt-2">
                      {currentExercise.options.left?.map((item: string, index: number) => (
                        <div key={index} className="p-2 border rounded bg-muted/30">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">With these options:</Label>
                    <div className="space-y-2 mt-2">
                      {currentExercise.options.left?.map((leftItem: string, index: number) => (
                        <Select 
                          key={index}
                          value={matchingAnswers[leftItem] || ""} 
                          onValueChange={(value) => handleMatchingChange(leftItem, value)}
                          disabled={showResult}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select match..." />
                          </SelectTrigger>
                          <SelectContent>
                            {currentExercise.options.right?.map((option: string, optIndex: number) => (
                              <SelectItem key={optIndex} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentExercise.exercise_type === "sequencing" && (
              <div className="space-y-3">
                <Label>Drag to reorder these items correctly:</Label>
                <div className="space-y-2">
                  {sequenceItems.map((item, index) => (
                    <motion.div
                      key={`${item}-${index}`}
                      className="flex items-center p-3 border rounded bg-background cursor-move"
                      whileHover={{ scale: showResult ? 1 : 1.02 }}
                      whileDrag={{ scale: 0.95 }}
                      drag={!showResult ? "y" : false}
                      dragConstraints={{ top: 0, bottom: 0 }}
                      onDragEnd={(e, info) => {
                        if (showResult) return;
                        const draggedIndex = index;
                        const offset = info.offset.y;
                        const itemHeight = 60; // approximate height
                        const targetIndex = Math.max(0, Math.min(
                          sequenceItems.length - 1,
                          draggedIndex + Math.round(offset / itemHeight)
                        ));
                        if (targetIndex !== draggedIndex) {
                          moveSequenceItem(draggedIndex, targetIndex);
                        }
                      }}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground mr-2" />
                      <span className="flex-1">{item}</span>
                      <span className="text-sm text-muted-foreground ml-2">#{index + 1}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {currentExercise.exercise_type === "gap_fill" && currentExercise.options && (
              <div className="space-y-3">
                <Label>Fill in the gap:</Label>
                <div className="text-lg leading-relaxed">
                  {currentExercise.question.split('___').map((part, index) => (
                    <span key={index}>
                      {part}
                      {index < currentExercise.question.split('___').length - 1 && (
                        <Select 
                          value={typeof selectedAnswer === 'string' ? selectedAnswer : ''} 
                          onValueChange={(value) => setSelectedAnswer(value)}
                          disabled={showResult}
                        >
                          <SelectTrigger className="inline-flex w-auto min-w-32 mx-1">
                            <SelectValue placeholder="?" />
                          </SelectTrigger>
                          <SelectContent>
                            {currentExercise.options.map((option: string, optIndex: number) => (
                              <SelectItem key={optIndex} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {currentExercise.exercise_type === "fill_blank" && (
              <div className="space-y-3">
                <Label htmlFor="answer-input">Your answer:</Label>
                <Input
                  id="answer-input"
                  value={typeof selectedAnswer === 'string' ? selectedAnswer : ''}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  disabled={showResult}
                  className="text-lg"
                />
              </div>
            )}

            {showResult && exerciseResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border ${
                  exerciseResult.is_correct 
                    ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                    : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  {exerciseResult.is_correct ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${
                      exerciseResult.is_correct ? 'text-green-800 dark:text-green-100' : 'text-red-800 dark:text-red-100'
                    }`}>
                      {exerciseResult.is_correct ? 'Correct!' : 'Incorrect'}
                    </p>
                    {!exerciseResult.is_correct && (
                      <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                        Correct answer: <span className="font-medium">{exerciseResult.correct_answer}</span>
                      </p>
                    )}
                    {exerciseResult.explanation && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                        {exerciseResult.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (currentExerciseIndex > 0) {
      const prevIndex = currentExerciseIndex - 1;
                    setCurrentExerciseIndex(prevIndex);
                    setSelectedAnswer("");
                    setShowResult(false);
                    setExerciseResult(null);
                    initializeExerciseState(exercises[prevIndex]);
                  }
                }}
                disabled={currentExerciseIndex === 0}
              >
                Previous
              </Button>

              {!showResult ? (
                <Button 
                  onClick={() => handleAnswer(getAnswerForSubmission())}
                  disabled={!isAnswerComplete()}
                >
                  Submit
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  {currentExerciseIndex === exercises.length - 1 ? getLocalizedText('finish') : getLocalizedText('next')}
                </Button>
              )}
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
};