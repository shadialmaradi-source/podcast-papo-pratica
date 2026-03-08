import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MessageSquare, CalendarDays, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";

interface Assignment {
  id: string;
  topic_title: string;
  topic_description: string | null;
  cefr_level: string;
  language: string;
  custom_instructions: string | null;
  due_date: string | null;
  status: string;
}

interface Question {
  id: string;
  question_text: string;
  difficulty: number;
  order_index: number;
}

interface Response {
  id: string;
  question_id: string;
  response_text: string | null;
  is_prepared: boolean;
}

export default function SpeakingAssignment() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !assignmentId) return;
    fetchData();
  }, [user, assignmentId]);

  const fetchData = async () => {
    setLoading(true);

    const { data: aData } = await supabase
      .from("speaking_assignments" as any)
      .select("id, topic_title, topic_description, cefr_level, language, custom_instructions, due_date, status")
      .eq("id", assignmentId)
      .maybeSingle();

    if (!aData) {
      setLoading(false);
      return;
    }
    setAssignment(aData as unknown as Assignment);

    const { data: qData } = await supabase
      .from("speaking_questions" as any)
      .select("id, question_text, difficulty, order_index")
      .eq("assignment_id", assignmentId)
      .order("order_index");

    const qs = (qData || []) as unknown as Question[];
    setQuestions(qs);

    const { data: rData } = await supabase
      .from("speaking_responses" as any)
      .select("id, question_id, response_text, is_prepared")
      .eq("assignment_id", assignmentId)
      .eq("student_id", user!.id);

    const resMap: Record<string, Response> = {};
    const draftMap: Record<string, string> = {};
    ((rData || []) as unknown as Response[]).forEach((r) => {
      resMap[r.question_id] = r;
      draftMap[r.question_id] = r.response_text || "";
    });
    setResponses(resMap);
    setDrafts(draftMap);
    setLoading(false);
  };

  const saveResponse = useCallback(
    async (questionId: string, text: string) => {
      if (!user || !assignmentId) return;
      const existing = responses[questionId];

      if (existing) {
        await supabase
          .from("speaking_responses" as any)
          .update({ response_text: text, submitted_at: new Date().toISOString() } as any)
          .eq("id", existing.id);
      } else {
        const { data } = await supabase
          .from("speaking_responses" as any)
          .insert({
            assignment_id: assignmentId,
            question_id: questionId,
            student_id: user.id,
            response_text: text,
            response_type: "text",
          } as any)
          .select("id, question_id, response_text, is_prepared")
          .single();

        if (data) {
          setResponses((prev) => ({ ...prev, [questionId]: data as unknown as Response }));
        }
      }
    },
    [user, assignmentId, responses]
  );

  const handleBlur = (questionId: string) => {
    const text = drafts[questionId] || "";
    saveResponse(questionId, text);
  };

  const markPrepared = async () => {
    if (!assignmentId) return;
    setSaving(true);

    // Save all drafts first
    for (const q of questions) {
      const text = drafts[q.id] || "";
      if (text.trim()) {
        await saveResponse(q.id, text);
      }
    }

    await supabase
      .from("speaking_assignments" as any)
      .update({ status: "reviewed" } as any)
      .eq("id", assignmentId);

    toast.success("Marked as prepared!");
    setAssignment((prev) => (prev ? { ...prev, status: "reviewed" } : prev));
    setSaving(false);
  };

  const difficultyDot = (d: number) => {
    if (d === 1) return <Circle className="h-3 w-3 fill-green-500 text-green-500" />;
    if (d === 2) return <Circle className="h-3 w-3 fill-yellow-500 text-yellow-500" />;
    return <Circle className="h-3 w-3 fill-red-500 text-red-500" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Assignment not found.</p>
        <Button variant="outline" onClick={() => navigate("/app")}>
          Back
        </Button>
      </div>
    );
  }

  const answeredCount = Object.values(responses).filter((r) => r.response_text?.trim()).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">{assignment.topic_title}</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Assignment info */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{assignment.cefr_level}</Badge>
                <Badge variant="outline" className="capitalize">{assignment.language}</Badge>
              </div>
              {assignment.due_date && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  Due {new Date(assignment.due_date).toLocaleDateString()}
                </span>
              )}
            </div>

            {assignment.topic_description && (
              <p className="text-sm text-muted-foreground">{assignment.topic_description}</p>
            )}

            {assignment.custom_instructions && (
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Teacher's note:</p>
                <p className="text-sm text-foreground italic">"{assignment.custom_instructions}"</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Practice these questions before your next lesson
            </p>
          </CardContent>
        </Card>

        {/* Questions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Questions ({answeredCount}/{questions.length} answered)
            </h2>
            <Badge variant={assignment.status === "reviewed" ? "default" : "secondary"}>
              {assignment.status === "reviewed" ? "Prepared" : "In Progress"}
            </Badge>
          </div>

          {questions.map((q, i) => (
            <Card key={q.id} className="border border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-sm font-bold text-muted-foreground mt-0.5">{i + 1}.</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {difficultyDot(q.difficulty)}
                      <p className="text-sm font-medium text-foreground">{q.question_text}</p>
                    </div>
                    <Textarea
                      placeholder="Type your notes here..."
                      value={drafts[q.id] || ""}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      onBlur={() => handleBlur(q.id)}
                      rows={2}
                      className="text-sm"
                    />
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground">
                        {responses[q.id]?.response_text?.trim()
                          ? "✓ Saved"
                          : "Auto-saves on blur"}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        disabled
                      >
                        🎙️ Record (Coming Soon)
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mark as prepared */}
        {assignment.status !== "reviewed" && questions.length > 0 && (
          <Button className="w-full" onClick={markPrepared} disabled={saving}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Mark as Prepared"}
          </Button>
        )}

        {assignment.status === "reviewed" && (
          <div className="text-center py-4">
            <Badge className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Prepared — ready for your lesson!
            </Badge>
          </div>
        )}
      </main>
    </div>
  );
}
