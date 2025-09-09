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
import { CheckCircle, XCircle, Star, RefreshCw, ArrowLeft, AlertCircle, GripVertical, PartyPopper, TrendingUp, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Exercise, 
  ExerciseResult,
  getEpisodeExercises, 
  checkExerciseAnswer, 
  saveExerciseResult, 
  updateUserProgress,
  markEpisodeCompleted,
  getNextEpisodeSuggestions
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
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [nextEpisodes, setNextEpisodes] = useState<any>(null);

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
        toast({
          title: getLocalizedText('incorrect'),
          description: result.explanation || getLocalizedText('tryAgain'),
          variant: "destructive",
        });
      }
      
      // Track answers for accuracy
      setTotalAnswers(prev => prev + 1);
      if (result.is_correct) {
        setCorrectAnswers(prev => prev + 1);
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

  const handleNext = async () => {
    if (currentExerciseIndex < exercises.length - 1) {
      const nextIndex = currentExerciseIndex + 1;
      setCurrentExerciseIndex(nextIndex);
      setSelectedAnswer("");
      setShowResult(false);
      setExerciseResult(null);
      initializeExerciseState(exercises[nextIndex]);
    } else {
      // All exercises completed - show completion screen
      await handleEpisodeCompletion();
    }
  };

  const handleEpisodeCompletion = async () => {
    try {
      console.log('Episode completion starting...');
      
      // Mark episode as completed and get next episode suggestions
      if (!usingMockData) {
        await markEpisodeCompleted(episode.id);
        const suggestions = await getNextEpisodeSuggestions(episode.id, episode.podcast_source?.language || 'english');
        setNextEpisodes(suggestions);
        console.log('Next episode suggestions:', suggestions);
      } else {
        // Mock suggestions for demo
        setNextEpisodes({
          next_episode_id: 'next-123',
          next_episode_title: 'Episode 122: Advanced Conversations',
          alternative_episode_id: 'alt-456', 
          alternative_episode_title: 'Episode 130: Travel Phrases'
        });
      }
      
      // Show completion screen
      setShowCompletion(true);
      console.log('Completion screen should now show');
      
    } catch (error) {
      console.error('Error completing episode:', error);
      toast({
        title: "Error",
        description: "Failed to mark episode as completed",
        variant: "destructive",
      });
      
      // Still show completion screen even if backend fails
      setShowCompletion(true);
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

  // Completion Screen - This is the key fix!
  if (showCompletion) {
    const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="border-0 shadow-2xl bg-gradient-to-br from-background to-primary/5">
            <CardContent className="p-8 text-center">
              {/* Celebration Animation */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="mb-6"
              >
                <div className="relative">
                  <PartyPopper className="h-20 w-20 text-primary mx-auto" />
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, repeat: Infinity, duration: 2 }}
                    className="absolute -top-2 -right-2"
                  >
                    ✨
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7, repeat: Infinity, duration: 2 }}
                    className="absolute -bottom-2 -left-2"
                  >
                    🎉
                  </motion.div>
                </div>
              </motion.div>
              
              <h2 className="text-3xl font-bold mb-2">Episodio Completato!</h2>
              <p className="text-muted-foreground mb-8">Ottimo lavoro! Hai finito questo episodio.</p>
              
              {/* Stats */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="text-2xl font-bold text-yellow-600">{totalXP}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">XP Guadagnati</p>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-center"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold text-green-600">{accuracy}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Precisione</p>
                </motion.div>
              </div>
              
              {/* Progress Bar */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mb-8"
              >
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-sm font-medium">Progresso Episode</span>
                </div>
                <Progress value={100} className="h-2" />
              </motion.div>
              
              {/* Next Episode Suggestions */}
              {nextEpisodes && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-4 mb-8"
                >
                  <h3 className="text-lg font-semibold">Cosa Vuoi Fare Ora?</h3>
                  
                  <div className="grid gap-3">
                    {nextEpisodes.next_episode_id && (
                      <Button 
                        className="w-full justify-start h-auto p-4"
                        variant="default"
                        onClick={() => {
                          // Navigate to next episode
                          onComplete();
                        }}
                      >
                        <div className="text-left">
                          <div className="font-medium">Prossimo Episodio →</div>
                          <div className="text-sm opacity-80">{nextEpisodes.next_episode_title}</div>
                        </div>
                      </Button>
                    )}
                    
                    {nextEpisodes.alternative_episode_id && (
                      <Button 
                        className="w-full justify-start h-auto p-4"
                        variant="outline"
                        onClick={() => {
                          // Navigate to alternative episode
                          onComplete();
                        }}
                      >
                        <div className="text-left">
                          <div className="font-medium">O Prova →</div>
                          <div className="text-sm opacity-80">{nextEpisodes.alternative_episode_title}</div>
                        </div>
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
              
              {/* Back to Dashboard */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <Button 
                  variant="ghost" 
                  onClick={onComplete}
                  className="w-full"
                >
                  Torna alla Dashboard
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Show completion screen when all exercises are done
  if (showCompletion) {
    const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="max-w-2xl mx-auto border-0 shadow-xl">
          <CardHeader className="text-center space-y-6">
            <div className="flex justify-center">
              <PartyPopper className="h-16 w-16 text-primary animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold">Episode Completed!</CardTitle>
              <CardDescription className="text-lg">
                Great job on completing "{episode.title}"
              </CardDescription>
            </div>
            
            <div className="grid grid-cols-3 gap-4 p-6 bg-muted rounded-lg">
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <Star className="h-8 w-8 text-yellow-500" />
                </div>
                <div className="text-2xl font-bold text-primary">{totalXP}</div>
                <div className="text-sm text-muted-foreground">XP Earned</div>
              </div>
              
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-primary">{accuracy}%</div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
              </div>
              
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-primary">{correctAnswers}/{totalAnswers}</div>
                <div className="text-sm text-muted-foreground">Correct</div>
              </div>
            </div>
            
            <Progress value={100} className="w-full h-3" />
            <span className="text-sm text-muted-foreground">Episode Progress: 100%</span>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {nextEpisodes && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Next Episode Suggestions
                </h3>
                
                <div className="grid gap-3">
                  {nextEpisodes.next_episode_title && (
                    <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{nextEpisodes.next_episode_title}</h4>
                          <p className="text-sm text-muted-foreground">Recommended next episode</p>
                        </div>
                        <Button size="sm">Continue</Button>
                      </div>
                    </Card>
                  )}
                  
                  {nextEpisodes.alternative_episode_title && (
                    <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{nextEpisodes.alternative_episode_title}</h4>
                          <p className="text-sm text-muted-foreground">Alternative episode</p>
                        </div>
                        <Button variant="outline" size="sm">Try This</Button>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex gap-3 pt-4">
              <Button onClick={onBack} variant="outline" className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Library
              </Button>
              <Button onClick={onComplete} className="flex-1">
                Continue Learning
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main exercise interface
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
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">
                  {totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0}% accuracy
                </span>
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
                Retry Database Connection
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Exercise content */}
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p>Loading exercises...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={loadExercises} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : currentExercise ? (
            <div className="space-y-6">
              <motion.div
                key={currentExercise.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <h3 className="text-xl font-semibold mb-4">{currentExercise.question}</h3>
                
                {/* Multiple Choice */}
                {currentExercise.exercise_type === 'multiple_choice' && (
                  <RadioGroup
                    value={selectedAnswer as string}
                    onValueChange={setSelectedAnswer}
                    disabled={showResult}
                    className="space-y-3"
                  >
                    {currentExercise.options?.map((option: string, index: number) => (
                      <div key={index} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`option-${index}`} />
                        <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
                
                {/* True/False */}
                {currentExercise.exercise_type === 'true_false' && (
                  <RadioGroup
                    value={selectedAnswer as string}
                    onValueChange={setSelectedAnswer}
                    disabled={showResult}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="true" />
                      <Label htmlFor="true" className="cursor-pointer">True</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="false" />
                      <Label htmlFor="false" className="cursor-pointer">False</Label>
                    </div>
                  </RadioGroup>
                )}
                
                {/* Fill in the blank */}
                {(currentExercise.exercise_type === 'fill_blank' || currentExercise.exercise_type === 'gap_fill') && (
                  <div className="space-y-2">
                    <Label htmlFor="answer">Your answer:</Label>
                    <Input
                      id="answer"
                      value={selectedAnswer as string}
                      onChange={(e) => setSelectedAnswer(e.target.value)}
                      disabled={showResult}
                      placeholder="Type your answer here..."
                      className="w-full"
                    />
                  </div>
                )}
              </motion.div>

              {/* Result Display */}
              <AnimatePresence>
                {showResult && exerciseResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-4 rounded-lg border ${
                      exerciseResult.is_correct 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                        : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {exerciseResult.is_correct ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="font-medium">
                        {exerciseResult.is_correct ? 'Correct!' : 'Incorrect'}
                      </span>
                      {exerciseResult.is_correct && (
                        <Badge variant="secondary" className="ml-auto">
                          +{exerciseResult.xp_reward} XP
                        </Badge>
                      )}
                    </div>
                    {!exerciseResult.is_correct && (
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Correct answer:</strong> {exerciseResult.correct_answer}
                      </p>
                    )}
                    {exerciseResult.explanation && (
                      <p className="text-sm text-muted-foreground">
                        {exerciseResult.explanation}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                {!showResult ? (
                  <Button 
                    onClick={() => handleAnswer(getAnswerForSubmission())}
                    disabled={!isAnswerComplete()}
                    className="flex-1"
                  >
                    Submit Answer
                  </Button>
                ) : (
                  <Button onClick={handleNext} className="flex-1">
                    {currentExerciseIndex < exercises.length - 1 ? (
                      <>
                        {getLocalizedText('next')}
                        <div className="ml-2 text-xs opacity-75">
                          ({currentExerciseIndex + 2}/{exercises.length})
                        </div>
                      </>
                    ) : (
                      getLocalizedText('finish')
                    )}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p>No exercises available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};