import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  XCircle, 
  Volume2, 
  Mic,
  ArrowRight,
  RefreshCw,
  Target,
  Clock,
  Brain
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";

interface EnhancedExercise {
  id: string;
  type: 'speaking' | 'writing' | 'listening' | 'translation' | 'pronunciation' | 'conversation';
  question: string;
  content?: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: string;
  audioUrl?: string;
  imageUrl?: string;
  context?: string;
  vocabularyWords?: string[];
}

interface EnhancedExercisesProps {
  exercises: EnhancedExercise[];
  onComplete: (results: any[]) => void;
  onBack: () => void;
}

export const EnhancedExercises = ({ exercises, onComplete, onBack }: EnhancedExercisesProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<string | string[]>("");
  const [orderedItems, setOrderedItems] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const currentExercise = exercises[currentIndex];
  const progress = ((currentIndex + 1) / exercises.length) * 100;

  const handleSubmit = () => {
    if (!currentExercise) return;

    let correct = false;
    const answer = typeof userAnswer === 'string' ? userAnswer : userAnswer.join(' ');

    // Check answer based on exercise type
    switch (currentExercise.type) {
      case 'translation':
      case 'writing':
        correct = answer.toLowerCase().trim() === currentExercise.correctAnswer.toLowerCase().trim();
        break;
      case 'speaking':
      case 'pronunciation':
        // For speaking exercises, we'd typically need speech recognition
        // For now, we'll mark as correct if user provided audio
        correct = audioBlob !== null || answer.length > 0;
        break;
      case 'listening':
        correct = answer.toLowerCase() === currentExercise.correctAnswer.toLowerCase();
        break;
      case 'conversation':
        // For conversation exercises, check if response is appropriate length
        correct = answer.length >= 10;
        break;
      default:
        correct = answer === currentExercise.correctAnswer;
    }

    setIsCorrect(correct);
    setShowResult(true);

    const result = {
      exerciseId: currentExercise.id,
      userAnswer: answer,
      isCorrect: correct,
      timeSpent: Date.now(), // In real app, track actual time
      audioResponse: audioBlob
    };

    setResults(prev => [...prev, result]);

    toast({
      title: correct ? "Correct!" : "Keep practicing",
      description: correct ? "+10 XP" : "Try again next time",
      variant: correct ? "default" : "destructive",
    });
  };

  const handleNext = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserAnswer("");
      setOrderedItems([]);
      setShowResult(false);
      setAudioBlob(null);
    } else {
      onComplete(results);
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    // Implement audio recording logic here
    toast({
      title: "Recording started",
      description: "Speak your answer clearly",
    });
    
    // Simulate recording for demo
    setTimeout(() => {
      stopRecording();
    }, 3000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    // Create a mock audio blob for demo
    setAudioBlob(new Blob(['mock audio'], { type: 'audio/wav' }));
    toast({
      title: "Recording stopped",
      description: "Recording saved successfully",
    });
  };

  const playAudio = () => {
    if (currentExercise.audioUrl) {
      const audio = new Audio(currentExercise.audioUrl);
      audio.play();
    } else {
      toast({
        title: "Audio not available",
        description: "No audio file for this exercise",
        variant: "destructive",
      });
    }
  };

  const renderExerciseContent = () => {
    if (!currentExercise) return null;

    switch (currentExercise.type) {
      case 'speaking':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-lg mb-4">{currentExercise.question}</p>
              {currentExercise.context && (
                <p className="text-muted-foreground mb-4">
                  <strong>Context:</strong> {currentExercise.context}
                </p>
              )}
            </div>

            <div className="flex flex-col items-center space-y-4">
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                variant={isRecording ? "destructive" : "default"}
                size="lg"
                className="w-32 h-32 rounded-full"
              >
                <Mic className={`h-8 w-8 ${isRecording ? 'animate-pulse' : ''}`} />
              </Button>
              
              <p className="text-sm text-muted-foreground">
                {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
              </p>

              {audioBlob && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Recording saved</span>
                </div>
              )}

              <div className="w-full">
                <Label htmlFor="text-answer">Or type your answer:</Label>
                <Textarea
                  id="text-answer"
                  placeholder="Type your response here..."
                  value={userAnswer as string}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        );

      case 'listening':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-lg mb-4">{currentExercise.question}</p>
              
              <Button onClick={playAudio} variant="outline" size="lg">
                <Volume2 className="h-6 w-6 mr-2" />
                Play Audio
              </Button>
            </div>

            <div>
              <Label htmlFor="listening-answer">What did you hear?</Label>
              <Input
                id="listening-answer"
                placeholder="Type what you heard..."
                value={userAnswer as string}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
        );

      case 'translation':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-lg mb-2">{currentExercise.question}</p>
              {currentExercise.content && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-xl font-medium">{currentExercise.content}</p>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="translation">Your translation:</Label>
              <Textarea
                id="translation"
                placeholder="Enter your translation..."
                value={userAnswer as string}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
        );

      case 'writing':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-lg mb-4">{currentExercise.question}</p>
              {currentExercise.context && (
                <p className="text-muted-foreground">
                  <strong>Context:</strong> {currentExercise.context}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="writing-response">Your response:</Label>
              <Textarea
                id="writing-response"
                placeholder="Write your response in detail..."
                value={userAnswer as string}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="mt-2 min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 50 characters recommended
              </p>
            </div>
          </div>
        );

      case 'pronunciation':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-lg mb-4">{currentExercise.question}</p>
              <div className="p-4 bg-muted/50 rounded-lg mb-4">
                <p className="text-2xl font-bold">{currentExercise.content}</p>
              </div>
              
              <Button onClick={playAudio} variant="outline" className="mb-4">
                <Volume2 className="h-4 w-4 mr-2" />
                Listen to pronunciation
              </Button>
            </div>

            <div className="flex flex-col items-center space-y-4">
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                variant={isRecording ? "destructive" : "default"}
                size="lg"
                className="w-24 h-24 rounded-full"
              >
                <Mic className={`h-6 w-6 ${isRecording ? 'animate-pulse' : ''}`} />
              </Button>
              
              <p className="text-sm text-muted-foreground">
                {isRecording ? 'Recording...' : 'Record your pronunciation'}
              </p>

              {audioBlob && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Pronunciation recorded</span>
                </div>
              )}
            </div>
          </div>
        );

      case 'conversation':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-lg mb-4">{currentExercise.question}</p>
              {currentExercise.context && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Situation:</p>
                  <p>{currentExercise.context}</p>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="conversation">Your response:</Label>
              <Textarea
                id="conversation"
                placeholder="How would you respond in this situation?"
                value={userAnswer as string}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="mt-2 min-h-[100px]"
              />
            </div>

            <div className="flex justify-center">
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                variant={isRecording ? "destructive" : "outline"}
              >
                <Mic className={`h-4 w-4 mr-2 ${isRecording ? 'animate-pulse' : ''}`} />
                {isRecording ? 'Stop Recording' : 'Record Response'}
              </Button>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center">
            <p>Exercise type not implemented: {currentExercise.type}</p>
          </div>
        );
    }
  };

  if (!currentExercise) {
    return (
      <div className="text-center p-8">
        <p>No exercises available</p>
        <Button onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline">
            {currentIndex + 1} / {exercises.length}
          </Badge>
          <Badge variant="secondary">
            {currentExercise.type}
          </Badge>
          <Badge variant="outline">
            {currentExercise.difficulty}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span className="text-sm">5:00</span>
        </div>
      </div>

      {/* Progress */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Exercise Content */}
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
      >
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              {currentExercise.type === 'speaking' && <Mic className="h-8 w-8 text-blue-500" />}
              {currentExercise.type === 'listening' && <Volume2 className="h-8 w-8 text-green-500" />}
              {currentExercise.type === 'writing' && <Brain className="h-8 w-8 text-purple-500" />}
              {currentExercise.type === 'translation' && <ArrowRight className="h-8 w-8 text-orange-500" />}
              {currentExercise.type === 'pronunciation' && <Target className="h-8 w-8 text-red-500" />}
              {currentExercise.type === 'conversation' && <CheckCircle className="h-8 w-8 text-teal-500" />}
            </div>
            <CardTitle className="text-xl capitalize">
              {currentExercise.type} Exercise
            </CardTitle>
            {currentExercise.vocabularyWords && (
              <div className="flex flex-wrap gap-1 justify-center mt-2">
                {currentExercise.vocabularyWords.map((word, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {word}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>

          <CardContent>
            {renderExerciseContent()}

            {/* Action Buttons */}
            <div className="flex justify-center mt-8">
              {!showResult ? (
                <Button 
                  onClick={handleSubmit}
                  disabled={
                    (!userAnswer || (typeof userAnswer === 'string' && userAnswer.trim() === '')) &&
                    !audioBlob
                  }
                  size="lg"
                  className="px-8"
                >
                  Submit Answer
                </Button>
              ) : (
                <div className="text-center space-y-4">
                  <div className={`flex items-center justify-center gap-2 ${
                    isCorrect ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isCorrect ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <XCircle className="h-6 w-6" />
                    )}
                    <span className="font-medium">
                      {isCorrect ? 'Correct!' : 'Keep practicing!'}
                    </span>
                  </div>

                  {currentExercise.explanation && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm">{currentExercise.explanation}</p>
                      {!isCorrect && (
                        <p className="text-sm mt-2">
                          <strong>Correct answer:</strong> {currentExercise.correctAnswer}
                        </p>
                      )}
                    </div>
                  )}

                  <Button onClick={handleNext} size="lg">
                    {currentIndex < exercises.length - 1 ? 'Next Exercise' : 'Complete'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};