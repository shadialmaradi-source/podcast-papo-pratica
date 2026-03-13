import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Exercise } from "@/services/exerciseGeneratorService";
import {
  WordRecognitionExercise,
  EmojiMatchExercise,
  ComprehensionCheckExercise,
  SequenceRecallExercise,
} from "@/components/exercises/BeginnerExercises";

interface ExerciseRendererProps {
  exercise: Exercise;
  userAnswer: string;
  language?: string;
  showFeedback: boolean;
  isCorrect: boolean;
  onAnswerChange: (value: string) => void;
  onNext: () => void;
}

export function ExerciseRenderer({
  exercise,
  userAnswer,
  language,
  showFeedback,
  isCorrect,
  onAnswerChange,
  onNext,
}: ExerciseRendererProps) {
  switch (exercise.type) {
    case "MCQ":
    case "TF":
    case "multiple_choice":
      return (
        <RadioGroup value={userAnswer} onValueChange={onAnswerChange}>
          {exercise.options?.map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <RadioGroupItem value={option} id={`option-${index}`} />
              <Label htmlFor={`option-${index}`} className="cursor-pointer">{option}</Label>
            </div>
          ))}
        </RadioGroup>
      );

    case "Cloze":
    case "fill_blank":
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">Type the correct word to fill in the blank:</p>
          <Input
            type="text"
            placeholder="Type your answer here..."
            value={userAnswer}
            onChange={(e) => onAnswerChange(e.target.value)}
            className="w-full text-lg"
            autoFocus
          />
        </div>
      );

    case "Matching":
    case "matching":
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">Click to match terms with their definitions (click pairs):</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Terms:</h4>
              {exercise.options?.slice(0, Math.floor(exercise.options.length / 2)).map((term, index) => (
                <Button
                  key={index}
                  variant={userAnswer.includes(term) ? "default" : "outline"}
                  size="sm"
                  className="w-full text-left justify-start"
                  onClick={() => {
                    const pairs = userAnswer.split(',').filter(Boolean);
                    const newPair = `${term}:${index}`;
                    const updated = pairs.includes(newPair)
                      ? pairs.filter(p => p !== newPair).join(',')
                      : [...pairs, newPair].join(',');
                    onAnswerChange(updated);
                  }}
                >
                  {term}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Definitions:</h4>
              {exercise.options?.slice(Math.floor(exercise.options.length / 2)).map((definition, index) => (
                <Button
                  key={index}
                  variant={userAnswer.includes(definition) ? "default" : "outline"}
                  size="sm"
                  className="w-full text-left justify-start text-xs p-2 h-auto whitespace-normal"
                  onClick={() => {
                    const pairs = userAnswer.split(',').filter(Boolean);
                    const newPair = `${definition}:${index}`;
                    const updated = pairs.includes(newPair)
                      ? pairs.filter(p => p !== newPair).join(',')
                      : [...pairs, newPair].join(',');
                    onAnswerChange(updated);
                  }}
                >
                  {definition}
                </Button>
              ))}
            </div>
          </div>
        </div>
      );

    case "Sequencing":
    case "sequencing":
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">Click the statements in the correct order (order matters):</p>
          <div className="space-y-2">
            {exercise.options?.map((statement, index) => (
              <Button
                key={index}
                variant={userAnswer.split(',').indexOf(index.toString()) !== -1 ? "default" : "outline"}
                size="sm"
                className="w-full text-left justify-start p-4 h-auto whitespace-normal relative"
                onClick={() => {
                  const sequence = userAnswer.split(',').filter(Boolean);
                  const indexStr = index.toString();
                  if (sequence.includes(indexStr)) {
                    onAnswerChange(sequence.filter(s => s !== indexStr).join(','));
                  } else {
                    onAnswerChange([...sequence, indexStr].join(','));
                  }
                }}
              >
                {userAnswer.split(',').indexOf(index.toString()) !== -1 && (
                  <Badge className="absolute top-2 right-2 h-5 w-5 rounded-full p-0 text-xs">
                    {userAnswer.split(',').indexOf(index.toString()) + 1}
                  </Badge>
                )}
                {statement}
              </Button>
            ))}
          </div>
        </div>
      );

    case "SpotError":
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">Select the correct word that should replace the error:</p>
          <RadioGroup value={userAnswer} onValueChange={onAnswerChange}>
            {exercise.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`error-${index}`} />
                <Label htmlFor={`error-${index}`} className="cursor-pointer">{option}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      );

    case "word_recognition":
      return (
        <WordRecognitionExercise
          exercise={{ ...exercise, contextSentence: exercise.contextSentence }}
          language={language}
          onAnswer={onAnswerChange}
          showFeedback={showFeedback}
          isCorrect={isCorrect}
          onNext={onNext}
        />
      );

    case "emoji_match":
      return (
        <EmojiMatchExercise
          exercise={{ ...exercise, contextSentence: exercise.contextSentence }}
          language={language}
          onAnswer={onAnswerChange}
          showFeedback={showFeedback}
          isCorrect={isCorrect}
          onNext={onNext}
        />
      );

    case "comprehension_check":
      return (
        <ComprehensionCheckExercise
          exercise={exercise}
          onAnswer={onAnswerChange}
          showFeedback={showFeedback}
          isCorrect={isCorrect}
          onNext={onNext}
        />
      );

    case "sequence_recall":
      return (
        <SequenceRecallExercise
          exercise={exercise}
          onAnswer={onAnswerChange}
          showFeedback={showFeedback}
          isCorrect={isCorrect}
          onNext={onNext}
        />
      );

    default:
      return null;
  }
}
