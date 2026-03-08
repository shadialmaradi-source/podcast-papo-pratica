import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, MessageSquare, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AssignSpeakingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentEmail: string;
  studentName?: string | null;
  studentLevel?: string | null;
  onAssigned?: () => void;
}

interface PredefinedTopic {
  id: string;
  topic: string;
  cefr_level: string;
  language: string;
}

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const LANGUAGES = [
  { value: "italian", label: "Italian" },
  { value: "spanish", label: "Spanish" },
  { value: "portuguese", label: "Portuguese" },
  { value: "french", label: "French" },
  { value: "german", label: "German" },
  { value: "english", label: "English" },
];

export function AssignSpeakingModal({
  open,
  onOpenChange,
  studentEmail,
  studentName,
  studentLevel,
  onAssigned,
}: AssignSpeakingModalProps) {
  const { user } = useAuth();
  const [predefinedTopics, setPredefinedTopics] = useState<PredefinedTopic[]>([]);
  const [selectedLevel, setSelectedLevel] = useState(studentLevel || "A1");
  const [selectedLanguage, setSelectedLanguage] = useState("italian");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [instructions, setInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tabValue, setTabValue] = useState("predefined");

  useEffect(() => {
    if (!open) return;
    supabase
      .from("speaking_topics" as any)
      .select("*")
      .order("cefr_level")
      .then(({ data }) => {
        setPredefinedTopics((data || []) as unknown as PredefinedTopic[]);
      });
  }, [open]);

  const filteredTopics = predefinedTopics.filter((t) => t.cefr_level === selectedLevel && t.language === selectedLanguage);

  const handleSubmit = async () => {
    if (!user) return;

    const topicTitle =
      tabValue === "predefined"
        ? predefinedTopics.find((t) => t.id === selectedTopicId)?.topic
        : customTopic.trim();

    if (!topicTitle) {
      toast.error("Please select or enter a speaking topic");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create the speaking assignment
      const { data: assignment, error: aError } = await supabase
        .from("speaking_assignments" as any)
        .insert({
          teacher_id: user.id,
          student_email: studentEmail,
          topic_title: topicTitle,
          topic_description: tabValue === "custom" ? customDescription || null : null,
          cefr_level: selectedLevel,
          language: selectedLanguage,
          custom_instructions: instructions || null,
          due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
          status: "assigned",
        } as any)
        .select("id")
        .single();

      if (aError) throw aError;
      const assignmentId = (assignment as any).id;

      // 2. Generate questions via edge function
      toast.info("Generating discussion questions...");
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "generate-speaking-questions",
        {
          body: { topic: topicTitle, level: selectedLevel, language: selectedLanguage },
        }
      );

      if (fnError) {
        console.error("Question generation error:", fnError);
        toast.warning("Assignment created but question generation failed. You can retry later.");
      } else if (fnData?.questions?.length) {
        // 3. Insert questions
        const questionRows = fnData.questions.map((q: any, i: number) => ({
          assignment_id: assignmentId,
          question_text: q.question,
          difficulty: q.difficulty,
          order_index: i,
        }));

        const { error: qError } = await supabase
          .from("speaking_questions" as any)
          .insert(questionRows as any);

        if (qError) {
          console.error("Insert questions error:", qError);
          toast.warning("Assignment created but failed to save some questions.");
        }
      }

      toast.success(`Speaking topic assigned to ${studentName || studentEmail}!`);
      onOpenChange(false);
      resetForm();
      onAssigned?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign speaking topic");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomTopic("");
    setCustomDescription("");
    setSelectedTopicId("");
    setInstructions("");
    setDueDate(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Assign Speaking Topic
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          To: <strong>{studentName || studentEmail}</strong>
        </p>

        <div className="space-y-4 pt-2">
          {/* Level + Language */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CEFR_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Topic tabs */}
          <Tabs value={tabValue} onValueChange={setTabValue}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="predefined">Predefined</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>

            <TabsContent value="predefined" className="space-y-2">
              {filteredTopics.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No predefined topics for {selectedLevel}.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredTopics.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTopicId(t.id)}
                      className={cn(
                        "w-full text-left text-sm px-3 py-2 rounded-md border transition-colors",
                        selectedTopicId === t.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border hover:bg-muted text-muted-foreground"
                      )}
                    >
                      {t.topic}
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="custom" className="space-y-3">
              <div className="space-y-2">
                <Label>Topic Title</Label>
                <Input
                  placeholder="E.g., Food & Cooking"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  placeholder="Brief description of what to discuss..."
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Due date */}
          <div className="space-y-2">
            <Label>Due Date (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label>Instructions for Student (optional)</Label>
            <Textarea
              placeholder="E.g., Prepare questions 1-4 for our next lesson."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign Topic"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
