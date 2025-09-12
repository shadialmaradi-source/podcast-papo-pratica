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

  const getMockCorrectAnswer = () => {
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

  // Rest of the component implementation would go here
  const currentExercise = exercises[currentExerciseIndex];

  if (loading) {
    return <div>Loading exercises...</div>;
  }

  if (!currentExercise) {
    return <div>No exercises available</div>;
  }

  return (
    <div>
      {/* Exercise UI would go here */}
      <p>Exercise component placeholder</p>
    </div>
  );
};