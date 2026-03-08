import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, MessageSquare } from "lucide-react";
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

interface SpeakingTopic {
  id: string;
  topic: string;
  cefr_level: string;
  language: string;
}

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function AssignSpeakingModal({
  open,
  onOpenChange,
  studentEmail,
  studentName,
  studentLevel,
  onAssigned,
}: AssignSpeakingModalProps) {
  const { user } = useAuth();
  const [predefinedTopics, setPredefinedTopics] = useState<SpeakingTopic[]>([]);
  const [selectedLevel, setSelectedLevel] = useState(studentLevel || "A1");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tabValue, setTabValue] = useState("predefined");

  useEffect(() => {
    if (!open) return;
    supabase
      .from("speaking_topics" as any)
      .select("*")
      .order("cefr_level")
      .then(({ data }) => {
        setPredefinedTopics((data || []) as unknown as SpeakingTopic[]);
      });
  }, [open]);

  const filteredTopics = predefinedTopics.filter((t) => t.cefr_level === selectedLevel);

  const handleSubmit = async () => {
    if (!user) return;

    const topicText =
      tabValue === "predefined"
        ? predefinedTopics.find((t) => t.id === selectedTopicId)?.topic
        : customTopic.trim();

    if (!topicText) {
      toast.error("Please select or enter a speaking topic");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("video_assignments" as any).insert({
        teacher_id: user.id,
        student_email: studentEmail,
        assignment_type: "speaking",
        speaking_topic: topicText,
        speaking_level: selectedLevel,
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        note: note || null,
        status: "assigned",
      } as any);

      if (error) throw error;

      toast.success(`Speaking topic assigned to ${studentName || studentEmail}!`);
      onOpenChange(false);
      setCustomTopic("");
      setSelectedTopicId("");
      setNote("");
      setDueDate(undefined);
      onAssigned?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign speaking topic");
    } finally {
      setSubmitting(false);
    }
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
          {/* Level selector */}
          <div className="space-y-2">
            <Label>CEFR Level</Label>
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CEFR_LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Topic selection tabs */}
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

            <TabsContent value="custom" className="space-y-2">
              <Textarea
                placeholder="E.g., Describe your morning routine using past tense"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                rows={3}
              />
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

          {/* Note */}
          <div className="space-y-2">
            <Label>Teacher Note (optional)</Label>
            <Textarea
              placeholder="Additional instructions..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Assigning..." : "Assign Topic"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
