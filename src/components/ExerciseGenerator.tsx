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
  const levelExercises = (texts as any)[level] || (texts as any).beginner || exerciseTexts.english.A1;
  
  // Determine number of exercises based on intensity
  const exerciseCount = intensity === "intense" ? 20 : 10;
  const selectedExercises = levelExercises.slice(0, Math.min(exerciseCount, levelExercises.length));
  
  // If we need more exercises than available, repeat them with variations
  const finalExercises = [];
  for (let i = 0; i < exerciseCount; i++) {
    const sourceExercise = selectedExercises[i % selectedExercises.length];
    finalExercises.push(sourceExercise);
  }
  // Instead of using 'level' directly, use 'cefrLevel'
const availableExercises = exerciseTexts[language]?.[cefrLevel] || exerciseTexts.english.A1;

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
        description: episode.podcast_source?.language === 'portuguese' ? "Problema ao verificar a resposta" :
                     episode.podcast_source?.language === 'spanish' ? "Problema al verificar la respuesta" :
                     episode.podcast_source?.language === 'french' ? "Problème lors de la vérification de la réponse" :
                     episode.podcast_source?.language === 'german' ? "Problem beim Überprüfen der Antwort" : "Problem checking answer",
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
              {episode.podcast_source?.title} - {level} Level - {intensity === "intense" ? "Intense" : "Light"} Mode
            </CardDescription>
            <div className="flex items-center gap-4 justify-center">
              <Badge variant="default" className="bg-primary">
                {level}
              </Badge>
              <Badge variant="outline" className={intensity === "intense" ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"}>
                {intensity === "intense" ? "Intense" : "Light"} ({exercises.length} questions)
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
              {episode.podcast_source?.language === 'portuguese' ? `Pergunta ${currentExerciseIndex + 1} de ${exercises.length}` :
               episode.podcast_source?.language === 'spanish' ? `Pregunta ${currentExerciseIndex + 1} de ${exercises.length}` :
               episode.podcast_source?.language === 'french' ? `Question ${currentExerciseIndex + 1} sur ${exercises.length}` :
               episode.podcast_source?.language === 'german' ? `Frage ${currentExerciseIndex + 1} von ${exercises.length}` :
               `Question ${currentExerciseIndex + 1} of ${exercises.length}`}
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
<RadioGroup value={selectedAnswer} onValueChange={showResult ? undefined : setSelectedAnswer}>                {currentExercise.options && Array.isArray(currentExercise.options) && 
                 currentExercise.options.map((option: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value={option} 
id={`option-${index}`}
  disabled={showResult}
/>                    />
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
                <Label htmlFor="answer">
                  {episode.podcast_source?.language === 'portuguese' ? 'Sua resposta:' :
                   episode.podcast_source?.language === 'spanish' ? 'Tu respuesta:' :
                   episode.podcast_source?.language === 'french' ? 'Votre réponse:' :
                   episode.podcast_source?.language === 'german' ? 'Ihre Antwort:' : 'Your answer:'}
                </Label>
                <Input
                  id="answer"
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  placeholder={episode.podcast_source?.language === 'portuguese' ? 'Digite sua resposta...' :
                              episode.podcast_source?.language === 'spanish' ? 'Escribe tu respuesta...' :
                              episode.podcast_source?.language === 'french' ? 'Tapez votre réponse...' :
                              episode.podcast_source?.language === 'german' ? 'Geben Sie Ihre Antwort ein...' : 'Enter your answer...'}
                  disabled={showResult}
                  className={showResult ? 
                    (exerciseResult?.is_correct ? "border-green-500" : "border-red-500") 
                    : ""
                  } {currentExercise.exercise_type === "open_question" && (
  <div className="space-y-2">
    <Label htmlFor="open-answer">Your answer:</Label>
    <Textarea
      id="open-answer"
      value={selectedAnswer}
      onChange={(e) => setSelectedAnswer(e.target.value)}
      placeholder="Write your answer..."
      disabled={showResult}
      rows={3}
    />
  </div>
)}
                />
              </div>
            )}
{currentExercise.exercise_type === "ordering" && (
  <div className="space-y-4">
    <div className="text-sm text-gray-600 mb-4">
      {episode.podcast_source?.language === 'italian' ? 'Trascina per riordinare:' : 'Drag to reorder:'}
    </div>
    {/* Add your ordering component here */}
    <OrderingComponent 
      items={currentExercise.options}
      onOrderChange={setSelectedAnswer}
      disabled={showResult}
      correctOrder={exerciseResult?.correct_answer}
      showResult={showResult}
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
                    {episode.podcast_source?.language === 'portuguese' ? "Correto!" : 
                     episode.podcast_source?.language === 'spanish' ? "¡Correcto!" :
                     episode.podcast_source?.language === 'french' ? "Correct!" :
                     episode.podcast_source?.language === 'german' ? "Richtig!" : "Correct!"}
                  </span>
                </div>
                <div className="text-sm">
                  {!exerciseResult.is_correct && (
                    <p className="text-red-600 mb-1">
                      <strong>
                        {episode.podcast_source?.language === 'portuguese' ? 'Resposta correta:' :
                         episode.podcast_source?.language === 'spanish' ? 'Respuesta correcta:' :
                         episode.podcast_source?.language === 'french' ? 'Bonne réponse:' :
                         episode.podcast_source?.language === 'german' ? 'Richtige Antwort:' : 'Correct answer:'}
                      </strong> {exerciseResult.correct_answer}
                    </p>
                  )}
                  {exerciseResult.explanation && (
                    <p className="text-gray-600">
                      <strong>
                        {episode.podcast_source?.language === 'portuguese' ? 'Explicação:' :
                         episode.podcast_source?.language === 'spanish' ? 'Explicación:' :
                         episode.podcast_source?.language === 'french' ? 'Explication:' :
                         episode.podcast_source?.language === 'german' ? 'Erklärung:' : 'Explanation:'}
                      </strong> {exerciseResult.explanation}
                    </p>
                  )}
                  {exerciseResult.is_correct && (
                    <p className="text-green-600">
                      <strong>
                        {episode.podcast_source?.language === 'portuguese' ? 'XP ganhos:' :
                         episode.podcast_source?.language === 'spanish' ? 'XP ganados:' :
                         episode.podcast_source?.language === 'french' ? 'XP gagnés:' :
                         episode.podcast_source?.language === 'german' ? 'XP erhalten:' : 'XP earned:'}
                      </strong> +{exerciseResult.xp_reward}
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
                  {episode.podcast_source?.language === 'portuguese' ? 'Recomeçar' :
                   episode.podcast_source?.language === 'spanish' ? 'Reiniciar' :
                   episode.podcast_source?.language === 'french' ? 'Recommencer' :
                   episode.podcast_source?.language === 'german' ? 'Neu starten' : 'Restart'}
              </Button>
              
              {showResult ? (
                <Button 
                  onClick={nextExercise} 
                  size="lg"
                  className="flex-1"
                  variant="learning"
                >
                  {currentExerciseIndex < exercises.length - 1 ? 
                    (episode.podcast_source?.language === 'portuguese' ? "Próximo" :
                     episode.podcast_source?.language === 'spanish' ? "Siguiente" :
                     episode.podcast_source?.language === 'french' ? "Suivant" :
                     episode.podcast_source?.language === 'german' ? "Weiter" : "Next") :
                    (episode.podcast_source?.language === 'portuguese' ? "Completar" :
                     episode.podcast_source?.language === 'spanish' ? "Completar" :
                     episode.podcast_source?.language === 'french' ? "Terminer" :
                     episode.podcast_source?.language === 'german' ? "Abschließen" : "Complete")}
                </Button>
              ) : (
                <Button 
                  onClick={() => handleAnswer(selectedAnswer)} 
                  disabled={!selectedAnswer.trim()}
                  size="lg"
                  className="flex-1"
                  variant="learning"
                >
                  {episode.podcast_source?.language === 'portuguese' ? 'Confirmar' :
                   episode.podcast_source?.language === 'spanish' ? 'Confirmar' :
                   episode.podcast_source?.language === 'french' ? 'Confirmer' :
                   episode.podcast_source?.language === 'german' ? 'Bestätigen' : 'Confirm'}
                </Button>
              )}
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
};