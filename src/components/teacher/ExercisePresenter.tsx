import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function extractYouTubeVideoId(url: string): string | null {
  let match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  match = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  match = url.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  return null;
}
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";

interface Exercise {
  id: string;
  exercise_type: string;
  content: any;
  order_index: number;
}

const EXERCISE_TYPE_LABELS: Record<string, string> = {
  fill_in_blank: "Fill in the Blank",
  multiple_choice: "Quiz",
  image_discussion: "Image Discussion",
  role_play: "Role-play",
  spot_the_mistake: "Spot the Mistake",
};

const TYPE_COLORS: Record<string, string> = {
  fill_in_blank: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  multiple_choice: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  image_discussion: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  role_play: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  spot_the_mistake: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function ExerciseContent({ exercise, revealed }: { exercise: Exercise; revealed: boolean }) {
  const c = exercise.content;

  if (exercise.exercise_type === "fill_in_blank") {
    return (
      <div className="space-y-4">
        <p className="text-xl font-medium text-foreground leading-relaxed">{c.sentence}</p>
        {c.hint && (
          <p className="text-sm text-muted-foreground italic">💡 Hint: {c.hint}</p>
        )}
        {revealed && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Answer</p>
            <p className="text-lg font-bold text-primary">{c.answer}</p>
          </div>
        )}
      </div>
    );
  }

  if (exercise.exercise_type === "multiple_choice") {
    return (
      <div className="space-y-4">
        <p className="text-xl font-medium text-foreground">{c.question}</p>
        <ul className="space-y-2">
          {(c.options || []).map((opt: string, i: number) => {
            const letter = ["A", "B", "C", "D"][i];
            const isCorrect = revealed && letter === c.correct;
            return (
              <li
                key={i}
                className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                  isCorrect
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-foreground"
                }`}
              >
                <span className="font-bold mr-2">{letter}.</span>{opt}
                {isCorrect && <span className="ml-2 text-primary">✓</span>}
              </li>
            );
          })}
        </ul>
        {revealed && c.explanation && (
          <p className="text-sm text-muted-foreground italic">{c.explanation}</p>
        )}
      </div>
    );
  }

  if (exercise.exercise_type === "image_discussion") {
    return (
      <div className="space-y-4">
        <p className="text-lg text-muted-foreground italic">"{c.prompt}"</p>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Discussion Questions</p>
          <ul className="space-y-2">
            {(c.discussion_questions || []).map((q: string, i: number) => (
              <li key={i} className="flex gap-2 text-foreground text-sm">
                <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
        {c.vocabulary?.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Vocabulary</p>
            <div className="flex flex-wrap gap-2">
              {c.vocabulary.map((v: string, i: number) => (
                <Badge key={i} variant="secondary">{v}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (exercise.exercise_type === "role_play") {
    return (
      <div className="space-y-4">
        <p className="text-lg font-medium text-foreground">{c.scenario}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Teacher</p>
            <p className="text-sm text-foreground">{c.teacher_role}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Student</p>
            <p className="text-sm text-foreground">{c.student_role}</p>
          </div>
        </div>
        {c.starter && (
          <p className="text-sm italic text-muted-foreground">
            🗣 Starter: <span className="text-foreground">"{c.starter}"</span>
          </p>
        )}
        {c.useful_phrases?.length > 0 && revealed && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Useful Phrases</p>
            <div className="flex flex-wrap gap-2">
              {c.useful_phrases.map((p: string, i: number) => (
                <Badge key={i} variant="outline">{p}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (exercise.exercise_type === "spot_the_mistake") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{c.instruction}</p>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-destructive mb-1">Find the mistake</p>
          <p className="text-xl text-foreground">{c.sentence}</p>
        </div>
        {revealed && (
          <>
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Correction</p>
              <p className="text-xl font-bold text-primary">{c.corrected}</p>
            </div>
            {c.explanation && (
              <p className="text-sm text-muted-foreground italic">{c.explanation}</p>
            )}
          </>
        )}
      </div>
    );
  }

  return <p className="text-muted-foreground">Unknown exercise type</p>;
}

interface ExercisePresenterProps {
  exercises: Exercise[];
  lessonTitle: string;
  lessonId: string;
  youtubeUrl?: string | null;
  onComplete: () => void;
}

export function ExercisePresenter({ exercises, lessonTitle, lessonId, youtubeUrl, onComplete }: ExercisePresenterProps) {
  const [current, setCurrent] = useState(0);
  const [revealed, setRevealed] = useState(false);

  // Extract YouTube video ID for embedding
  const youtubeVideoId = youtubeUrl ? extractYouTubeVideoId(youtubeUrl) : null;

  const exercise = exercises[current];
  const isFirst = current === 0;
  const isLast = current === exercises.length - 1;

  const syncIndex = (index: number) => {
    supabase.from("teacher_lessons").update({ current_exercise_index: index } as any).eq("id", lessonId).then();
  };

  const handleNext = () => {
    setRevealed(false);
    const next = current + 1;
    setCurrent(next);
    syncIndex(next);
  };

  const handlePrev = () => {
    setRevealed(false);
    const prev = current - 1;
    setCurrent(prev);
    syncIndex(prev);
  };

  if (!exercise) return null;

  const label = EXERCISE_TYPE_LABELS[exercise.exercise_type] || exercise.exercise_type;
  const colorClass = TYPE_COLORS[exercise.exercise_type] || "";

  return (
    <div className="space-y-4">
      {/* YouTube video */}
      {youtubeVideoId && (
        <div className="rounded-xl overflow-hidden border border-border bg-black aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeVideoId}`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Lesson video"
          />
        </div>
      )}

      {/* Progress bar */}
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
        <span>Exercise {current + 1} of {exercises.length}</span>
        <span>{Math.round(((current + 1) / exercises.length) * 100)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${((current + 1) / exercises.length) * 100}%` }}
        />
      </div>

      {/* Exercise card */}
      <Card className="border border-border shadow-sm">
        <CardContent className="pt-6 pb-6 px-6 space-y-6">
          {/* Type badge */}
          <div>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${colorClass}`}>
              {label}
            </span>
          </div>

          {/* Exercise content */}
          <ExerciseContent exercise={exercise} revealed={revealed} />
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrev}
          disabled={isFirst}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setRevealed((r) => !r)}
          className="flex-1"
        >
          {revealed ? (
            <><EyeOff className="h-4 w-4 mr-2" />Hide Answer</>
          ) : (
            <><Eye className="h-4 w-4 mr-2" />Reveal Answer</>
          )}
        </Button>

        {isLast ? (
          <Button size="sm" onClick={onComplete}>
            Complete Lesson
          </Button>
        ) : (
          <Button size="sm" onClick={handleNext}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
