import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, BookOpen, MessageSquare } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface SpeakingQuestion {
  id: string;
  question_text: string;
  difficulty: number;
  order_index: number;
}

interface VocabItem {
  id: string;
  target_word: string;
  translation: string;
  teacher_note: string | null;
}

interface StudentSpeakingViewProps {
  lessonId: string;
  lessonTitle: string;
  cefrLevel: string;
  topic: string | null;
  language: string;
}

export function StudentSpeakingView({ lessonId, lessonTitle, cefrLevel, topic, language }: StudentSpeakingViewProps) {
  const [questions, setQuestions] = useState<SpeakingQuestion[]>([]);
  const [vocabByQuestion, setVocabByQuestion] = useState<Record<string, VocabItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showVocab, setShowVocab] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: qs } = await supabase
        .from("speaking_lesson_questions" as any)
        .select("id, question_text, difficulty, order_index")
        .eq("lesson_id", lessonId)
        .order("order_index");

      if (qs && qs.length > 0) {
        setQuestions(qs as any);

        const questionIds = (qs as any[]).map((q: any) => q.id);
        const { data: vocab } = await supabase
          .from("speaking_vocabulary" as any)
          .select("id, question_id, target_word, translation, teacher_note")
          .in("question_id", questionIds);

        if (vocab) {
          const grouped: Record<string, VocabItem[]> = {};
          for (const v of vocab as any[]) {
            if (!grouped[v.question_id]) grouped[v.question_id] = [];
            grouped[v.question_id].push(v);
          }
          setVocabByQuestion(grouped);
        }
      }

      setLoading(false);
    };
    fetchData();
  }, [lessonId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No speaking questions found for this lesson.
        </CardContent>
      </Card>
    );
  }

  const currentQ = questions[currentIdx];
  const currentVocab = vocabByQuestion[currentQ.id] || [];
  const isVocabVisible = showVocab[currentQ.id] ?? false;

  const difficultyLabel = (d: number) =>
    d === 1 ? "Easy" : d === 2 ? "Medium" : "Hard";
  const difficultyColor = (d: number) =>
    d === 1
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : d === 2
      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MessageSquare className="h-4 w-4 text-primary" />
        <span>Speaking Practice</span>
        <span>·</span>
        <span>Question {currentIdx + 1} of {questions.length}</span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {questions.map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              setCurrentIdx(idx);
              trackEvent("speaking_question_reviewed", { lesson_id: lessonId, question_index: idx });
            }}
            className={`h-2 rounded-full transition-all ${
              idx === currentIdx
                ? "w-6 bg-primary"
                : idx < currentIdx
                ? "w-2 bg-primary/40"
                : "w-2 bg-muted-foreground/20"
            }`}
          />
        ))}
      </div>

      {/* Question card */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <Badge className={`text-xs ${difficultyColor(currentQ.difficulty)}`}>
              {difficultyLabel(currentQ.difficulty)}
            </Badge>
            <span className="text-xs text-muted-foreground">#{currentIdx + 1}</span>
          </div>

          <p className="text-xl font-medium text-foreground leading-relaxed">
            {currentQ.question_text}
          </p>

          {/* Vocabulary */}
          {currentVocab.length > 0 && (
            <div>
              <button
                onClick={() =>
                  setShowVocab((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }))
                }
                className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
              >
                <BookOpen className="h-3.5 w-3.5" />
                {isVocabVisible ? "Hide" : "Show"} Vocabulary ({currentVocab.length})
              </button>

              {isVocabVisible && (
                <div className="mt-3 grid gap-2">
                  {currentVocab.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-baseline gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
                    >
                      <span className="font-medium text-foreground text-sm">{v.target_word}</span>
                      <span className="text-muted-foreground text-sm">→</span>
                      <span className="text-sm text-foreground">{v.translation}</span>
                      {v.teacher_note && (
                        <span className="text-xs text-muted-foreground italic ml-auto">
                          ({v.teacher_note})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your Notes (optional)
            </p>
            <Textarea
              value={notes[currentQ.id] || ""}
              onChange={(e) =>
                setNotes((prev) => ({ ...prev, [currentQ.id]: e.target.value }))
              }
              placeholder="Practice your answer here..."
              className="min-h-[80px] resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous
        </Button>
        <Button
          size="sm"
          onClick={() => {
            setCurrentIdx((i) => Math.min(questions.length - 1, i + 1));
            trackEvent("speaking_question_reviewed", { lesson_id: lessonId, question_index: currentIdx + 1 });
          }}
          disabled={currentIdx === questions.length - 1}
        >
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
