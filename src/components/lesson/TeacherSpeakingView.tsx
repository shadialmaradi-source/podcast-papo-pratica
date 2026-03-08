import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, BookOpen } from "lucide-react";

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

interface TeacherSpeakingViewProps {
  lessonId: string;
}

export function TeacherSpeakingView({ lessonId }: TeacherSpeakingViewProps) {
  const [questions, setQuestions] = useState<SpeakingQuestion[]>([]);
  const [vocabByQuestion, setVocabByQuestion] = useState<Record<string, VocabItem[]>>({});
  const [loading, setLoading] = useState(true);

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

  const difficultyLabel = (d: number) =>
    d === 1 ? "Easy" : d === 2 ? "Medium" : "Hard";
  const difficultyColor = (d: number) =>
    d === 1
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : d === 2
      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No speaking questions found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MessageSquare className="h-4 w-4 text-primary" />
        <span>Speaking Practice · {questions.length} questions</span>
      </div>

      <div className="space-y-3">
        {questions.map((q, idx) => {
          const vocab = vocabByQuestion[q.id] || [];
          return (
            <Card key={q.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <span className="text-sm font-bold text-muted-foreground mt-0.5">{idx + 1}.</span>
                  <div className="flex-1">
                    <p className="text-foreground">{q.question_text}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`text-xs ${difficultyColor(q.difficulty)}`}>
                        {difficultyLabel(q.difficulty)}
                      </Badge>
                      {vocab.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <BookOpen className="h-3 w-3 mr-1" />
                          {vocab.length} vocab
                        </Badge>
                      )}
                    </div>
                    {vocab.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {vocab.map((v) => (
                          <span
                            key={v.id}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-0.5 text-xs"
                          >
                            <span className="font-medium">{v.target_word}</span>
                            <span className="text-muted-foreground">→</span>
                            <span>{v.translation}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
