import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Copy } from "lucide-react";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const TRANSLATION_LANGUAGES = [
  { value: "english", label: "English" },
  { value: "spanish", label: "Spanish" },
  { value: "italian", label: "Italian" },
  { value: "french", label: "French" },
  { value: "portuguese", label: "Portuguese" },
  { value: "german", label: "German" },
] as const;

export interface ReuseSourceLesson {
  id: string;
  title: string;
  cefr_level: string;
  translation_language?: string | null;
  language?: string | null;
  lesson_type?: string | null;
  exercise_types: string[];
  youtube_url?: string | null;
  paragraph_prompt?: string | null;
  paragraph_content?: string | null;
  transcript?: string | null;
  topic?: string | null;
  student_email?: string | null;
}

interface ReuseLessonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: ReuseSourceLesson | null;
  onReused?: () => void;
}

export function ReuseLessonModal({ open, onOpenChange, source, onReused }: ReuseLessonModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [studentEmail, setStudentEmail] = useState("");
  const [cefrLevel, setCefrLevel] = useState<string>("A1");
  const [translationLanguage, setTranslationLanguage] = useState<string>("english");
  const [knownStudents, setKnownStudents] = useState<{ email: string; name: string | null }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Reset / prefill on open
  useEffect(() => {
    if (!open || !source) return;
    setStudentEmail("");
    setCefrLevel(source.cefr_level || "A1");
    setTranslationLanguage(source.translation_language || "english");
  }, [open, source]);

  // Load teacher's known students for autocomplete
  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data } = await supabase
        .from("teacher_students")
        .select("student_email, student_name")
        .eq("teacher_id", user.id)
        .order("invited_at", { ascending: false })
        .limit(50);
      if (data) {
        setKnownStudents(data.map((s: any) => ({ email: s.student_email, name: s.student_name })));
      }
    })();
  }, [open, user]);

  const handleReuse = async () => {
    if (!user || !source) return;
    const normalizedEmail = studentEmail.trim().toLowerCase() || null;

    setSubmitting(true);
    try {
      const shareToken = crypto.randomUUID();
      const insertData: any = {
        teacher_id: user.id,
        title: source.title,
        student_email: normalizedEmail,
        cefr_level: cefrLevel,
        translation_language: translationLanguage,
        language: source.language || "italian",
        lesson_type: source.lesson_type || "exercise_only",
        exercise_types: source.exercise_types || [],
        topic: source.topic || null,
        youtube_url: source.youtube_url || null,
        paragraph_prompt: source.paragraph_prompt || null,
        paragraph_content: source.paragraph_content || null,
        transcript: source.transcript || null,
        status: "draft",
        share_token: shareToken,
      };

      const { data: newLesson, error: insertError } = await supabase
        .from("teacher_lessons")
        .insert(insertData)
        .select("id")
        .single();

      if (insertError) throw insertError;
      const newLessonId = newLesson.id;

      // Upsert student if a new email was provided
      if (normalizedEmail) {
        await supabase
          .from("teacher_students")
          .upsert(
            {
              teacher_id: user.id,
              student_email: normalizedEmail,
              status: "invited",
            } as any,
            { onConflict: "teacher_id,student_email", ignoreDuplicates: true }
          );
      }

      toast({
        title: "Lesson reused",
        description: "Generating fresh exercises for the new settings…",
      });

      // Kick off exercise generation in the background — don't block navigation
      const exerciseTypes = (source.exercise_types || []).filter((t) => t !== "image_discussion");
      const typesToGenerate = exerciseTypes.length > 0 ? exerciseTypes : ["multiple_choice"];
      Promise.all(
        typesToGenerate.map((exerciseType) =>
          supabase.functions.invoke("generate-lesson-exercises-by-type", {
            body: { lessonId: newLessonId, exerciseType },
          })
        )
      ).catch((err) => {
        console.error("[ReuseLessonModal] background generation failed:", err);
      });

      onReused?.();
      onOpenChange(false);
      navigate(`/teacher/lesson/${newLessonId}`);
    } catch (err: any) {
      const msg = err?.message || "Failed to reuse lesson";
      // Friendly limit/trial messages
      if (msg.includes("LESSON_LIMIT_REACHED")) {
        toast({
          title: "Lesson limit reached",
          description: msg.split("LESSON_LIMIT_REACHED:")[1] || msg,
          variant: "destructive",
        });
      } else if (msg.includes("TRIAL_EXPIRED")) {
        toast({
          title: "Trial expired",
          description: msg.split("TRIAL_EXPIRED:")[1] || msg,
          variant: "destructive",
        });
      } else {
        toast({ title: "Could not reuse lesson", description: msg, variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Reuse this lesson
          </DialogTitle>
          <DialogDescription>
            Create a new copy with a different student, level, or translation language. Exercises
            will be regenerated to match the new settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="reuse-student-email">Student email (optional)</Label>
            <Input
              id="reuse-student-email"
              type="email"
              list="reuse-known-students"
              placeholder="student@example.com"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              disabled={submitting}
            />
            <datalist id="reuse-known-students">
              {knownStudents.map((s) => (
                <option key={s.email} value={s.email}>
                  {s.name || s.email}
                </option>
              ))}
            </datalist>
            <p className="text-xs text-muted-foreground">
              Leave blank to create an unassigned copy.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>CEFR level</Label>
              <Select value={cefrLevel} onValueChange={setCefrLevel} disabled={submitting}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CEFR_LEVELS.map((lvl) => (
                    <SelectItem key={lvl} value={lvl}>
                      {lvl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Translation language</Label>
              <Select
                value={translationLanguage}
                onValueChange={setTranslationLanguage}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSLATION_LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleReuse} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reusing…
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Reuse lesson
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ReuseLessonModal;
