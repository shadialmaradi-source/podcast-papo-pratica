import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Volume2, VolumeX, SkipForward, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BeginnerExerciseProps {
  exercise: {
    id: string;
    type: string;
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    points: number;
    questionTranslation?: string | null;
    contextSentence?: string | null; // stores targetWord for word_recognition/emoji_match
  };
  language?: string;
  onAnswer: (answer: string) => void;
  showFeedback: boolean;
  isCorrect: boolean;
  onNext: () => void;
}

// Browser TTS helper
const speakWord = (text: string, lang: string = "it-IT") => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.75;
  window.speechSynthesis.speak(utterance);
};

const getLangCode = (language?: string): string => {
  const map: Record<string, string> = {
    italian: "it-IT", english: "en-US", spanish: "es-ES",
    french: "fr-FR", portuguese: "pt-BR", german: "de-DE",
  };
  return map[language?.toLowerCase() || ""] || "it-IT";
};

// ── Word Recognition ──
export function WordRecognitionExercise({ exercise, language, onAnswer, showFeedback, isCorrect, onNext }: BeginnerExerciseProps) {
  const targetWord = exercise.contextSentence || exercise.question;
  const langCode = getLangCode(language);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground text-center">
        {exercise.questionTranslation || "Was this word in the video?"}
      </p>

      {/* Large word display */}
      <div className="flex flex-col items-center gap-4 py-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl sm:text-5xl font-bold text-foreground tracking-wide"
        >
          {targetWord}
        </motion.div>

        {/* TTS button */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => speakWord(targetWord, langCode)}
          >
            <Volume2 className="w-4 h-4" />
            Hear it
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            onClick={() => window.speechSynthesis.cancel()}
          >
            <VolumeX className="w-4 h-4" />
            Skip
          </Button>
        </div>
      </div>

      {/* Yes / No buttons */}
      {!showFeedback && (
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-16 text-xl font-semibold border-2 hover:bg-green-500/10 hover:border-green-500/50"
            onClick={() => onAnswer("Yes")}
          >
            ✅ Yes
          </Button>
          <Button
            variant="outline"
            className="h-16 text-xl font-semibold border-2 hover:bg-red-500/10 hover:border-red-500/50"
            onClick={() => onAnswer("No")}
          >
            ❌ No
          </Button>
        </div>
      )}

      {showFeedback && <FeedbackBlock isCorrect={isCorrect} exercise={exercise} onNext={onNext} />}
    </div>
  );
}

// ── Emoji Match ──
export function EmojiMatchExercise({ exercise, language, onAnswer, showFeedback, isCorrect, onNext }: BeginnerExerciseProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const targetWord = exercise.contextSentence || exercise.question;
  const langCode = getLangCode(language);

  const handleSelect = (emoji: string) => {
    setSelected(emoji);
    onAnswer(emoji);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground text-center">
        {exercise.questionTranslation || "Which emoji matches this word?"}
      </p>

      {/* Word display + TTS */}
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="text-3xl sm:text-4xl font-bold text-foreground">{targetWord}</div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => speakWord(targetWord, langCode)}>
          <Volume2 className="w-4 h-4" /> Hear it
        </Button>
      </div>

      {/* Emoji grid */}
      {!showFeedback && (
        <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
          {exercise.options.map((emoji) => (
            <Button
              key={emoji}
              variant="outline"
              className={cn(
                "h-20 w-20 text-4xl border-2 mx-auto",
                selected === emoji && "ring-2 ring-primary"
              )}
              onClick={() => handleSelect(emoji)}
            >
              {emoji}
            </Button>
          ))}
        </div>
      )}

      {showFeedback && <FeedbackBlock isCorrect={isCorrect} exercise={exercise} onNext={onNext} />}
    </div>
  );
}

// ── Comprehension Check ──
export function ComprehensionCheckExercise({ exercise, onAnswer, showFeedback, isCorrect, onNext }: BeginnerExerciseProps) {
  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <h3 className="text-xl sm:text-2xl font-semibold text-foreground leading-relaxed">
          {exercise.question}
        </h3>
        {exercise.questionTranslation && (
          <p className="text-sm text-muted-foreground mt-2">{exercise.questionTranslation}</p>
        )}
      </div>

      {!showFeedback && (
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-16 text-xl font-semibold border-2 hover:bg-green-500/10 hover:border-green-500/50"
            onClick={() => onAnswer("Yes")}
          >
            ✅ Yes
          </Button>
          <Button
            variant="outline"
            className="h-16 text-xl font-semibold border-2 hover:bg-red-500/10 hover:border-red-500/50"
            onClick={() => onAnswer("No")}
          >
            ❌ No
          </Button>
        </div>
      )}

      {showFeedback && <FeedbackBlock isCorrect={isCorrect} exercise={exercise} onNext={onNext} />}
    </div>
  );
}

// ── Sequence Recall ──
export function SequenceRecallExercise({ exercise, onAnswer, showFeedback, isCorrect, onNext }: BeginnerExerciseProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (option: string) => {
    setSelected(option);
    onAnswer(option);
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <h3 className="text-xl sm:text-2xl font-semibold text-foreground leading-relaxed">
          {exercise.question}
        </h3>
        {exercise.questionTranslation && (
          <p className="text-sm text-muted-foreground mt-2">{exercise.questionTranslation}</p>
        )}
      </div>

      {!showFeedback && (
        <div className="space-y-3">
          {exercise.options.map((option, index) => (
            <Button
              key={option}
              variant="outline"
              className={cn(
                "w-full h-14 text-left justify-start text-base font-medium border-2 px-4",
                selected === option && "ring-2 ring-primary bg-primary/5"
              )}
              onClick={() => handleSelect(option)}
            >
              <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">
                {index + 1}
              </span>
              {option}
            </Button>
          ))}
        </div>
      )}

      {showFeedback && <FeedbackBlock isCorrect={isCorrect} exercise={exercise} onNext={onNext} />}
    </div>
  );
}

// ── Shared Feedback Block ──
function FeedbackBlock({ isCorrect, exercise, onNext }: { isCorrect: boolean; exercise: BeginnerExerciseProps["exercise"]; onNext: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className={cn(
        "p-4 rounded-xl border",
        isCorrect ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
            isCorrect ? "bg-green-500" : "bg-red-500"
          )}>
            {isCorrect ? <CheckCircle className="w-5 h-5 text-white" /> : <XCircle className="w-5 h-5 text-white" />}
          </div>
          <div className="flex-1">
            <p className={cn("font-medium", isCorrect ? "text-green-600" : "text-red-600")}>
              {isCorrect ? "Correct! 🎉" : "Not quite"}
            </p>
            {!isCorrect && (
              <p className="text-sm text-muted-foreground mt-1">
                Correct answer: {exercise.correctAnswer}
              </p>
            )}
            {exercise.explanation && (
              <p className="text-sm text-muted-foreground mt-1">{exercise.explanation}</p>
            )}
          </div>
        </div>
      </div>

      <Button onClick={onNext} className="w-full">
        Next →
      </Button>
    </motion.div>
  );
}
