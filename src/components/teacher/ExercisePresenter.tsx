import { useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, ChevronLeft, ChevronRight, Check } from "lucide-react";

interface Exercise {
  id: string;
  exercise_type: string;
  content: any;
  order_index: number;
}

const EXERCISE_TYPE_LABELS: Record<string, string> = {
  fill_in_blank: "Fill in the Blank",
  multiple_choice: "Quiz",
  role_play: "Role-play",
  spot_the_mistake: "Spot the Mistake",
};

const TYPE_COLORS: Record<string, string> = {
  fill_in_blank: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  multiple_choice: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  role_play: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  spot_the_mistake: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function ExerciseContent({ exercise, revealed }: { exercise: Exercise; revealed: boolean }) {
  const c = exercise.content;

  if (exercise.exercise_type === "fill_in_blank") {
    return (
      <div className="space-y-4">
        <p className="text-xl font-medium text-foreground leading-relaxed">{c.sentence}</p>
        {c.hint && <p className="text-sm text-muted-foreground italic">💡 Hint: {c.hint}</p>}
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

interface GroupState {
  currentIndex: number;
  revealed: boolean;
}

export function ExercisePresenter({ exercises, lessonTitle, lessonId, youtubeUrl, onComplete }: ExercisePresenterProps) {
  const activeGroupRef = useRef<HTMLDivElement>(null);

  // Group exercises by type preserving order of first appearance
  const groups = useMemo(() => {
    const typeOrder: string[] = [];
    const grouped: Record<string, Exercise[]> = {};
    for (const ex of exercises) {
      if (!grouped[ex.exercise_type]) {
        grouped[ex.exercise_type] = [];
        typeOrder.push(ex.exercise_type);
      }
      grouped[ex.exercise_type].push(ex);
    }
    return typeOrder.map((type) => ({ type, exercises: grouped[type] }));
  }, [exercises]);

  const [groupStates, setGroupStates] = useState<Record<string, GroupState>>(() => {
    const init: Record<string, GroupState> = {};
    groups.forEach((g) => { init[g.type] = { currentIndex: 0, revealed: false }; });
    return init;
  });

  const [activeGroup, setActiveGroup] = useState<string | null>(groups.length > 0 ? groups[0].type : null);

  const updateGroupState = (type: string, update: Partial<GroupState>) => {
    setGroupStates((prev) => ({
      ...prev,
      [type]: { ...prev[type], ...update },
    }));
  };

  const syncIndex = (index: number) => {
    supabase.from("teacher_lessons").update({ current_exercise_index: index } as any).eq("id", lessonId).then();
  };

  // Check if all groups are at last exercise
  const allComplete = groups.every((g) => {
    const state = groupStates[g.type];
    return state && state.currentIndex >= g.exercises.length - 1;
  });

  return (
    <div className="space-y-4">
      {groups.map((group, groupIndex) => {
        const state = groupStates[group.type] || { currentIndex: 0, revealed: false };
        const exercise = group.exercises[state.currentIndex];
        if (!exercise) return null;

        const label = EXERCISE_TYPE_LABELS[group.type] || group.type;
        const colorClass = TYPE_COLORS[group.type] || "";
        const isFirst = state.currentIndex === 0;
        const isLast = state.currentIndex === group.exercises.length - 1;
        const isActive = activeGroup === group.type;
        const isCollapsed = activeGroup !== null && !isActive;

        // Find next group type
        const nextGroup = groupIndex < groups.length - 1 ? groups[groupIndex + 1] : null;
        const nextTypeLabel = nextGroup ? (EXERCISE_TYPE_LABELS[nextGroup.type] || nextGroup.type) : null;

        // Collapsed view
        if (isCollapsed) {
          return (
            <div
              key={group.type}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => {
                setActiveGroup(group.type);
                setTimeout(() => activeGroupRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
              }}
            >
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${colorClass}`}>
                  {label}
                </span>
                <span className="text-sm text-muted-foreground">
                  {group.exercises.length}/{group.exercises.length} ✓
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          );
        }

        return (
          <div key={group.type} className="space-y-3" ref={isActive ? activeGroupRef : undefined}>
            {/* Section header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${colorClass}`}>
                  {label}
                </span>
                <span className="text-sm text-muted-foreground font-normal">
                  {state.currentIndex + 1} / {group.exercises.length}
                </span>
              </h3>
            </div>

            {/* Progress bar */}
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${((state.currentIndex + 1) / group.exercises.length) * 100}%` }}
              />
            </div>

            {/* Exercise card */}
            <Card className="border border-border shadow-sm">
              <CardContent className="pt-6 pb-6 px-6 space-y-6">
                <ExerciseContent exercise={exercise} revealed={state.revealed} />
              </CardContent>
            </Card>

            {/* Controls */}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  updateGroupState(group.type, { currentIndex: state.currentIndex - 1, revealed: false });
                }}
                disabled={isFirst}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => updateGroupState(group.type, { revealed: !state.revealed })}
                className="flex-1"
              >
                {state.revealed ? (
                  <><EyeOff className="h-4 w-4 mr-2" />Hide Answer</>
                ) : (
                  <><Eye className="h-4 w-4 mr-2" />Reveal Answer</>
                )}
              </Button>

              {isLast && nextGroup ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setActiveGroup(nextGroup.type);
                    setTimeout(() => activeGroupRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
                  }}
                  className="gap-1"
                >
                  Continue to {nextTypeLabel}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    const next = state.currentIndex + 1;
                    updateGroupState(group.type, { currentIndex: next, revealed: false });
                    // Sync the global exercise index
                    const globalIndex = exercises.findIndex((e) => e.id === group.exercises[next]?.id);
                    if (globalIndex >= 0) syncIndex(globalIndex);
                  }}
                  disabled={isLast}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {/* Complete button */}
      <Button onClick={onComplete} className="w-full" size="lg">
        Complete Lesson
      </Button>
    </div>
  );
}

export { ExerciseContent, EXERCISE_TYPE_LABELS, TYPE_COLORS };
export type { Exercise };
