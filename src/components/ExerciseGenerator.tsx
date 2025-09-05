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
  intensity: string;
  onComplete: () => void;
  onBack: () => void;
}

// Mock exercises for fallback when no real exercises exist
const createMockExercises = (episode: PodcastEpisode, level: string, intensity: string): Exercise[] => {
  const language = episode.podcast_source?.language || 'english';
  // Map new level system to CEFR levels for mock exercises
const levelMap: Record<string, string> = {
  'beginner': 'A1',
  'intermediate': 'B1', 
  'advanced': 'C1'
};
console.log('Creating mock exercises:', { episode: episode.title, level, intensity, language });

const cefrLevel = levelMap[level] || 'A1'; // Fallback to A1 if level not found

  const exerciseTexts = {
    portuguese: {
      A1: [
        {
          question: "Qual é o horário mencionado no episódio?",
          options: ["Manhã", "Tarde", "Noite", "Madrugada"],
          correct_answer: "Manhã",
          explanation: "O locutor fala sobre rotinas matinais no início do episódio."
        },
        {
          question: "Complete: 'Eu geralmente ___ café da manhã às 7h'",
          correct_answer: "tomo",
          explanation: "O verbo 'tomar' é usado para café da manhã em português."
        }
      ],
      A2: [
        {
          question: "Segundo o locutor, qual é a melhor forma de aprender um idioma?",
          options: ["Ler livros", "Praticar diariamente", "Assistir filmes", "Estudar gramática"],
          correct_answer: "Praticar diariamente",
          explanation: "O locutor enfatiza a importância da prática consistente todos os dias."
        },
        {
          question: "Complete: 'O mais importante é ___ todos os dias'",
          correct_answer: "praticar",
          explanation: "A prática consistente é fundamental para o sucesso no aprendizado."
        }
      ],
      B1: [
        {
          question: "Que diferença cultural o locutor destaca sobre as rotinas matinais?",
          options: [
            "Algumas culturas não tomam café da manhã",
            "Diferentes culturas têm horários de refeição variados",
            "Hábitos de exercício variam por país",
            "Horários de trabalho diferem globalmente"
          ],
          correct_answer: "Diferentes culturas têm horários de refeição variados",
          explanation: "O locutor discute como os horários das refeições variam entre culturas."
        }
      ],
      B2: [
        {
          question: "Analise o argumento do locutor sobre formação de hábitos. Que evidências são fornecidas?",
          correct_answer: "O locutor menciona estudos científicos e experiência pessoal",
          explanation: "O argumento combina evidências de pesquisa com experiência anedótica."
        }
      ],
      C1: [
        {
          question: "Avalie criticamente a metodologia do locutor para aquisição de linguagem. Quais são os pontos fortes e fracos?",
          correct_answer: "Pontos fortes incluem aplicabilidade prática; fracos podem incluir falta de estrutura formal",
          explanation: "A análise crítica requer examinar aspectos positivos e negativos."
        }
      ],
      C2: [
        {
          question: "Sintetize os princípios-chave discutidos e proponha uma estrutura alternativa para aprendizado de idiomas.",
          correct_answer: "Uma abordagem multimodal combinando aprendizado estruturado com prática imersiva",
          explanation: "A síntese avançada requer integrar conceitos e criar novas soluções."
        }
      ]
    },
    spanish: {
      A1: [
        {
          question: "¿Qué hora del día se menciona en el episodio?",
          options: ["Mañana", "Tarde", "Noche", "Madrugada"],
          correct_answer: "Mañana",
          explanation: "El locutor habla sobre rutinas matutinas al inicio del episodio."
        },
        {
          question: "Completa: 'Yo generalmente ___ desayuno a las 7h'",
          correct_answer: "tomo",
          explanation: "El verbo 'tomar' se usa para el desayuno en español."
        }
      ],
      A2: [
        {
          question: "Según el locutor, ¿cuál es la mejor forma de aprender un idioma?",
          options: ["Leer libros", "Practicar diariamente", "Ver películas", "Estudiar gramática"],
          correct_answer: "Practicar diariamente",
          explanation: "El locutor enfatiza la importancia de la práctica consistente todos los días."
        }
      ],
      B1: [
        {
          question: "¿Qué diferencia cultural destaca el locutor sobre las rutinas matutinas?",
          options: [
            "Algunas culturas no desayunan",
            "Diferentes culturas tienen horarios de comida variados",
            "Los hábitos de ejercicio varían por país",
            "Los horarios de trabajo difieren globalmente"
          ],
          correct_answer: "Diferentes culturas tienen horarios de comida variados",
          explanation: "El locutor discute cómo los horarios de las comidas varían entre culturas."
        }
      ],
      B2: [
        {
          question: "Analiza el argumento del locutor sobre la formación de hábitos. ¿Qué evidencias proporciona?",
          correct_answer: "El locutor menciona estudios científicos y experiencia personal",
          explanation: "El argumento combina evidencia de investigación con experiencia anecdótica."
        }
      ],
      C1: [
        {
          question: "Evalúa críticamente la metodología del locutor para la adquisición del lenguaje.",
          correct_answer: "Fortalezas incluyen aplicabilidad práctica; debilidades pueden incluir falta de estructura formal",
          explanation: "El análisis crítico requiere examinar aspectos positivos y negativos."
        }
      ],
      C2: [
        {
          question: "Sintetiza los principios clave discutidos y propón un marco alternativo.",
          correct_answer: "Un enfoque multimodal que combine aprendizaje estructurado con práctica inmersiva",
          explanation: "La síntesis avanzada requiere integrar conceptos y crear nuevas soluciones."
        }
      ]
    },
    french: {
      A1: [
        {
          question: "Quel moment de la journée est mentionné dans l'épisode?",
          options: ["Matin", "Après-midi", "Soir", "Nuit"],
          correct_answer: "Matin",
          explanation: "Le présentateur parle des routines matinales au début de l'épisode."
        },
        {
          question: "Complétez: 'Je ___ généralement le petit-déjeuner à 7h'",
          correct_answer: "prends",
          explanation: "Le verbe 'prendre' est utilisé pour le petit-déjeuner en français."
        }
      ],
      A2: [
        {
          question: "Selon le présentateur, quelle est la meilleure façon d'apprendre une langue?",
          options: ["Lire des livres", "Pratiquer quotidiennement", "Regarder des films", "Étudier la grammaire"],
          correct_answer: "Pratiquer quotidiennement",
          explanation: "Le présentateur souligne l'importance de la pratique quotidienne."
        }
      ],
      B1: [
        {
          question: "Quelle différence culturelle le présentateur souligne-t-il sur les routines matinales?",
          options: [
            "Certaines cultures ne prennent pas de petit-déjeuner",
            "Différentes cultures ont des horaires de repas variés",
            "Les habitudes d'exercice varient selon les pays",
            "Les horaires de travail diffèrent globalement"
          ],
          correct_answer: "Différentes cultures ont des horaires de repas variés",
          explanation: "Le présentateur discute comment les horaires des repas varient entre cultures."
        }
      ]
    },
    german: {
      A1: [
        {
          question: "Welche Tageszeit wird in der Episode erwähnt?",
          options: ["Morgen", "Nachmittag", "Abend", "Nacht"],
          correct_answer: "Morgen",
          explanation: "Der Sprecher spricht über Morgenroutinen zu Beginn der Episode."
        },
        {
          question: "Vervollständigen Sie: 'Ich ___ normalerweise um 7 Uhr Frühstück'",
          correct_answer: "esse",
          explanation: "Das Verb 'essen' wird für das Frühstück auf Deutsch verwendet."
        }
      ]
    },
    english: {
      A1: [
        {
          question: "What time of day is mentioned in the episode?",
          options: ["Morning", "Afternoon", "Evening", "Night"],
          correct_answer: "Morning",
          explanation: "The speaker talks about morning routines at the beginning."
        },
        {
          question: "Complete: 'I usually ___ breakfast at 7 AM'",
          correct_answer: "eat",
          explanation: "The verb 'eat' is used for consuming food."
        }
      ]
    },
    italian: {
      B1: [
        {
          question: "Quando è nata ufficialmente la RAI?",
          options: ["Anni Quaranta", "Anni Cinquanta", "Anni Sessanta", "Anni Settanta"],
          correct_answer: "Anni Cinquanta",
          explanation: "La storia della televisione italiana inizia ufficialmente negli anni Cinquanta con la nascita della RAI."
        },
        {
          question: "Cosa sono gli sceneggiati televisivi?",
          options: ["Programmi di varietà", "Serie televisive con storie", "Telegiornali", "Show comici"],
          correct_answer: "Serie televisive con storie",
          explanation: "Gli sceneggiati erano le prime serie TV italiane, come Il Commissario Maigret."
        }
      ]
    }
  };

  const texts = exerciseTexts[language as keyof typeof exerciseTexts] || exerciseTexts.english;
  const levelExercises = (texts as any)[cefrLevel] || (texts as any).A1 || exerciseTexts.english.A1;
  
  // Determine number of exercises based on intensity
  const exerciseCount = intensity === "intense" ? 20 : 10;
  
  // If we need more exercises than available, repeat them with variations
  const finalExercises = [];
  for (let i = 0; i < exerciseCount; i++) {
    const sourceExercise = levelExercises[i % levelExercises.length];
    finalExercises.push(sourceExercise);
  }
  
  console.log('Generated exercises:', finalExercises.length, 'exercises for level:', level)

  return finalExercises.map((exercise, index) => ({
    id: `mock-${language}-${level}-${index + 1}`,
    episode_id: episode.id,
    question: exercise.question,
    exercise_type: exercise.options ? "multiple_choice" as const : "fill_blank" as const,
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
      const data = await getEpisodeExercises(episode.id, level, intensity);
      if (data.length === 0) {
        // If no exercises in DB, use mock data for the specified level and intensity
        setExercises(createMockExercises(episode, level, intensity));
      } else {
        // Apply intensity filtering if needed (limit based on intensity)
        const targetCount = intensity === 'light' ? 10 : 20;
        const limitedExercises = data.slice(0, targetCount);
        setExercises(limitedExercises.length > 0 ? limitedExercises : createMockExercises(episode, level, intensity));
      }
    } catch (error) {
      console.error('Error loading exercises:', error);
      // Fallback to mock data for the specified level and intensity
      setExercises(createMockExercises(episode, level, intensity));
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
            title: episode.podcast_source?.language === 'portuguese' ? "Correto! ✅" : 
                   episode.podcast_source?.language === 'spanish' ? "¡Correcto! ✅" :
                   episode.podcast_source?.language === 'french' ? "Correct! ✅" :
                   episode.podcast_source?.language === 'german' ? "Richtig! ✅" : "Correct! ✅",
            description: `+${mockResult.xp_reward} XP`,
          });
        } else {
          setHearts(prev => Math.max(0, prev - 1));
          toast({
            title: episode.podcast_source?.language === 'portuguese' ? "Incorreto ❌" : 
                   episode.podcast_source?.language === 'spanish' ? "Incorrecto ❌" :
                   episode.podcast_source?.language === 'french' ? "Incorrect ❌" :
                   episode.podcast_source?.language === 'german' ? "Falsch ❌" : "Incorrect ❌",
            description: mockResult.explanation || (
              episode.podcast_source?.language === 'portuguese' ? "Tente novamente!" :
              episode.podcast_source?.language === 'spanish' ? "¡Inténtalo de nuevo!" :
              episode.podcast_source?.language === 'french' ? "Essayez encore!" :
              episode.podcast_source?.language === 'german' ? "Versuchen Sie es erneut!" : "Try again!"
            ),
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
          title: episode.podcast_source?.language === 'portuguese' ? "Correto! ✅" : 
                 episode.podcast_source?.language === 'spanish' ? "¡Correcto! ✅" :
                 episode.podcast_source?.language === 'french' ? "Correct! ✅" :
                 episode.podcast_source?.language === 'german' ? "Richtig! ✅" : "Correct! ✅",
          description: `+${result.xp_reward} XP`,
        });
      } else {
        const newHearts = await decreaseHearts();
        setHearts(newHearts);
        toast({
          title: episode.podcast_source?.language === 'portuguese' ? "Incorreto ❌" : 
                 episode.podcast_source?.language === 'spanish' ? "Incorrecto ❌" :
                 episode.podcast_source?.language === 'french' ? "Incorrect ❌" :
                 episode.podcast_source?.language === 'german' ? "Falsch ❌" : "Incorrect ❌",
          description: result.explanation || (
            episode.podcast_source?.language === 'portuguese' ? "Tente novamente!" :
            episode.podcast_source?.language === 'spanish' ? "¡Inténtalo de nuevo!" :
            episode.podcast_source?.language === 'french' ? "Essayez encore!" :
            episode.podcast_source?.language === 'german' ? "Versuchen Sie es erneut!" : "Try again!"
          ),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error handling answer:', error);
      toast({
        title: episode.podcast_source?.language === 'portuguese' ? "Erro" : 
               episode.podcast_source?.language === 'spanish' ? "Error" :
               episode.podcast_source?.language === 'french' ? "Erreur" :
               episode.podcast_source?.language === 'german' ? "Fehler" : "Error",
        description: episode.podcast_source?.language === 'portuguese' ? "Erro ao processar resposta" :
                     episode.podcast_source?.language === 'spanish' ? "Error al procesar respuesta" :
                     episode.podcast_source?.language === 'french' ? "Erreur lors du traitement de la réponse" :
                     episode.podcast_source?.language === 'german' ? "Fehler beim Verarbeiten der Antwort" : "Error processing answer",
        variant: "destructive",
      });
    }
  };

  const getMockCorrectAnswer = () => {
    const exerciseData = createMockExercises(episode, level, intensity)[currentExerciseIndex];
    return exerciseData?.correct_answer || "";
  };

  const getMockExplanation = () => {
    const exerciseData = createMockExercises(episode, level, intensity)[currentExerciseIndex];
    return exerciseData?.explanation || "";
  };

  const handleNext = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
      setSelectedAnswer("");
      setShowResult(false);
      setExerciseResult(null);
    } else {
      // Last exercise completed
      onComplete();
    }
  };

  const getLocalizedText = (key: string) => {
    const lang = episode.podcast_source?.language || 'english';
    const texts = {
      back: {
        portuguese: 'Voltar',
        spanish: 'Volver',
        french: 'Retour',
        german: 'Zurück',
        english: 'Back'
      },
      exercise: {
        portuguese: 'Exercício',
        spanish: 'Ejercicio',
        french: 'Exercice',
        german: 'Übung',
        english: 'Exercise'
      },
      of: {
        portuguese: 'de',
        spanish: 'de',
        french: 'de',
        german: 'von',
        english: 'of'
      },
      next: {
        portuguese: 'Próximo',
        spanish: 'Siguiente',
        french: 'Suivant',
        german: 'Weiter',
        english: 'Next'
      },
      finish: {
        portuguese: 'Finalizar',
        spanish: 'Terminar',
        french: 'Terminer',
        german: 'Beenden',
        english: 'Finish'
      }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="max-w-md mx-auto text-center p-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Loading Exercises...</h3>
          <p className="text-muted-foreground">Preparing your learning session</p>
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
          <p className="text-muted-foreground mb-4">We couldn't find any exercises for this episode.</p>
          <Button onClick={onBack}>Go Back</Button>
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
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl">
              {episode.title}
            </CardTitle>
            <CardDescription>
              {episode.podcast_source?.title} - {getLevelDisplayName(level)} Level - {intensity === "intense" ? "Intense" : "Light"} Mode
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
                value={selectedAnswer} 
                onValueChange={setSelectedAnswer}
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

            {currentExercise.exercise_type === "fill_blank" && (
              <div className="space-y-3">
                <Label htmlFor="answer-input">Your answer:</Label>
                <Input
                  id="answer-input"
                  value={selectedAnswer}
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
                    setCurrentExerciseIndex(prev => prev - 1);
                    setSelectedAnswer("");
                    setShowResult(false);
                    setExerciseResult(null);
                  }
                }}
                disabled={currentExerciseIndex === 0}
              >
                Previous
              </Button>

              {!showResult ? (
                <Button 
                  onClick={() => handleAnswer(selectedAnswer)}
                  disabled={!selectedAnswer.trim()}
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