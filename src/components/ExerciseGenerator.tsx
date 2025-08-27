import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  RotateCcw, 
  BookOpen,
  MessageSquare,
  PenTool,
  Target
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Exercise {
  id: string;
  type: "multiple_choice" | "fill_blanks" | "vocabulary" | "reflection";
  question: string;
  options?: string[];
  correct_answer?: number | string;
  explanation?: string;
  word?: string;
  definition?: string;
  example?: string;
  context?: string;
}

interface ExerciseGeneratorProps {
  podcastTitle: string;
  difficulty: string;
  language: string;
  onComplete: () => void;
}

// Mock exercises based on the JSON structure provided
const mockExercises: Exercise[] = [
  {
    id: "1",
    type: "multiple_choice",
    question: "Qual é o tema principal do podcast?",
    options: ["Tecnologia moderna", "Tradições brasileiras", "Economia global", "Política internacional"],
    correct_answer: 1,
    explanation: "O podcast foca nas tradições matinais brasileiras, especialmente o café da manhã."
  },
  {
    id: "2",
    type: "fill_blanks",
    question: "Complete a frase: 'Todo brasileiro _____ café pela manhã.'",
    options: ["toma", "tomou", "tomava", "tomará"],
    correct_answer: 0,
    context: "Presente habitual - ação que acontece regularmente"
  },
  {
    id: "3",
    type: "vocabulary",
    question: "Aprenda esta palavra:",
    word: "saudade",
    definition: "Sentimento de falta de algo ou alguém",
    example: "Sinto saudade do Brasil quando estou no exterior"
  },
  {
    id: "4",
    type: "reflection",
    question: "Na sua opinião, qual tradição matinal do seu país é mais interessante? Compare com as tradições brasileiras mencionadas no podcast.",
    explanation: "Resposta livre - mínimo 50 palavras"
  }
];

export function ExerciseGenerator({ podcastTitle, difficulty, language, onComplete }: ExerciseGeneratorProps) {
  const [currentExercise, setCurrentExercise] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, any>>({});
  const [showResults, setShowResults] = useState<Record<string, boolean>>({});
  const [reflectionAnswer, setReflectionAnswer] = useState("");
  const { toast } = useToast();

  const exercise = mockExercises[currentExercise];
  const progress = ((currentExercise + 1) / mockExercises.length) * 100;

  const handleAnswer = (answer: any) => {
    setSelectedAnswers({ ...selectedAnswers, [exercise.id]: answer });
    setShowResults({ ...showResults, [exercise.id]: true });

    if (exercise.type === "multiple_choice" || exercise.type === "fill_blanks") {
      const isCorrect = answer === exercise.correct_answer;
      toast({
        title: isCorrect ? "Correto!" : "Incorreto",
        description: isCorrect ? "Muito bem!" : exercise.explanation,
        variant: isCorrect ? "default" : "destructive",
      });
    }
  };

  const nextExercise = () => {
    if (currentExercise < mockExercises.length - 1) {
      setCurrentExercise(currentExercise + 1);
    } else {
      onComplete();
    }
  };

  const resetExercises = () => {
    setCurrentExercise(0);
    setSelectedAnswers({});
    setShowResults({});
    setReflectionAnswer("");
  };

  const getExerciseIcon = (type: string) => {
    switch (type) {
      case "multiple_choice": return <Target className="h-5 w-5" />;
      case "fill_blanks": return <PenTool className="h-5 w-5" />;
      case "vocabulary": return <BookOpen className="h-5 w-5" />;
      case "reflection": return <MessageSquare className="h-5 w-5" />;
      default: return <Target className="h-5 w-5" />;
    }
  };

  const getExerciseTitle = (type: string) => {
    switch (type) {
      case "multiple_choice": return "Múltipla Escolha";
      case "fill_blanks": return "Preencher Lacunas";
      case "vocabulary": return "Vocabulário";
      case "reflection": return "Reflexão";
      default: return "Exercício";
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-4">
        <Badge variant="outline" className="gap-2">
          <BookOpen className="h-3 w-3" />
          {podcastTitle}
        </Badge>
        <h2 className="text-2xl font-bold">Exercícios - Nível {difficulty}</h2>
        <Progress value={progress} className="w-full max-w-md mx-auto" />
        <p className="text-sm text-muted-foreground">
          Exercício {currentExercise + 1} de {mockExercises.length}
        </p>
      </div>

      {/* Exercise Card */}
      <Card className="shadow-elevated border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {getExerciseIcon(exercise.type)}
            {getExerciseTitle(exercise.type)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Multiple Choice */}
          {exercise.type === "multiple_choice" && (
            <div className="space-y-4">
              <p className="text-lg font-medium">{exercise.question}</p>
              <div className="grid gap-3">
                {exercise.options?.map((option, index) => {
                  const isSelected = selectedAnswers[exercise.id] === index;
                  const isCorrect = index === exercise.correct_answer;
                  const showResult = showResults[exercise.id];
                  
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      className={`justify-start p-4 h-auto transition-all ${
                        showResult
                          ? isCorrect
                            ? "border-success bg-success/10 text-success"
                            : isSelected
                            ? "border-destructive bg-destructive/10 text-destructive"
                            : ""
                          : isSelected
                          ? "border-primary bg-primary/10"
                          : ""
                      }`}
                      onClick={() => !showResults[exercise.id] && handleAnswer(index)}
                      disabled={showResults[exercise.id]}
                    >
                      <span className="font-medium mr-3">{String.fromCharCode(65 + index)}.</span>
                      {option}
                      {showResult && isCorrect && <CheckCircle className="ml-auto h-5 w-5" />}
                      {showResult && isSelected && !isCorrect && <XCircle className="ml-auto h-5 w-5" />}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fill in the Blanks */}
          {exercise.type === "fill_blanks" && (
            <div className="space-y-4">
              <p className="text-lg font-medium">{exercise.question}</p>
              <div className="grid gap-3">
                {exercise.options?.map((option, index) => {
                  const isSelected = selectedAnswers[exercise.id] === index;
                  const isCorrect = index === exercise.correct_answer;
                  const showResult = showResults[exercise.id];
                  
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      className={`justify-start p-4 transition-all ${
                        showResult
                          ? isCorrect
                            ? "border-success bg-success/10 text-success"
                            : isSelected
                            ? "border-destructive bg-destructive/10 text-destructive"
                            : ""
                          : isSelected
                          ? "border-primary bg-primary/10"
                          : ""
                      }`}
                      onClick={() => !showResults[exercise.id] && handleAnswer(index)}
                      disabled={showResults[exercise.id]}
                    >
                      {option}
                      {showResult && isCorrect && <CheckCircle className="ml-auto h-5 w-5" />}
                      {showResult && isSelected && !isCorrect && <XCircle className="ml-auto h-5 w-5" />}
                    </Button>
                  );
                })}
              </div>
              {showResults[exercise.id] && exercise.context && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Contexto:</p>
                  <p className="text-sm text-muted-foreground">{exercise.context}</p>
                </div>
              )}
            </div>
          )}

          {/* Vocabulary */}
          {exercise.type === "vocabulary" && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-light text-primary-foreground text-2xl font-bold">
                  {exercise.word?.[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-primary">{exercise.word}</h3>
                  <p className="text-lg text-muted-foreground mt-2">{exercise.definition}</p>
                </div>
              </div>
              
              <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                <p className="font-medium text-sm mb-2">Exemplo:</p>
                <p className="text-accent-foreground italic">"{exercise.example}"</p>
              </div>
              
              <Button 
                onClick={() => {
                  setSelectedAnswers({ ...selectedAnswers, [exercise.id]: "learned" });
                  setShowResults({ ...showResults, [exercise.id]: true });
                  toast({
                    title: "Palavra aprendida!",
                    description: "Continue praticando para memorizar melhor.",
                  });
                }}
                disabled={showResults[exercise.id]}
                className="w-full"
              >
                {showResults[exercise.id] ? "Palavra Aprendida!" : "Entendi!"}
              </Button>
            </div>
          )}

          {/* Reflection */}
          {exercise.type === "reflection" && (
            <div className="space-y-4">
              <p className="text-lg font-medium">{exercise.question}</p>
              <Textarea
                placeholder="Escreva sua resposta aqui... (mínimo 50 palavras)"
                value={reflectionAnswer}
                onChange={(e) => setReflectionAnswer(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>{reflectionAnswer.split(" ").filter(word => word.length > 0).length} palavras</span>
                <span>Mínimo: 50 palavras</span>
              </div>
              <Button 
                onClick={() => {
                  if (reflectionAnswer.split(" ").filter(word => word.length > 0).length >= 50) {
                    setSelectedAnswers({ ...selectedAnswers, [exercise.id]: reflectionAnswer });
                    setShowResults({ ...showResults, [exercise.id]: true });
                    toast({
                      title: "Reflexão enviada!",
                      description: "Excelente reflexão sobre o tema!",
                    });
                  } else {
                    toast({
                      title: "Resposta muito curta",
                      description: "Por favor, escreva pelo menos 50 palavras.",
                      variant: "destructive",
                    });
                  }
                }}
                disabled={showResults[exercise.id]}
                className="w-full"
              >
                {showResults[exercise.id] ? "Reflexão Enviada!" : "Enviar Reflexão"}
              </Button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={resetExercises}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reiniciar
            </Button>
            
            {showResults[exercise.id] && (
              <Button onClick={nextExercise} className="gap-2">
                {currentExercise === mockExercises.length - 1 ? "Finalizar" : "Próximo"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}