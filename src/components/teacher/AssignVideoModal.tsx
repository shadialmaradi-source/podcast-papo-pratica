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
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AssignVideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoTitle: string;
  videoId: string; // youtube video_id
  preselectedStudentEmail?: string;
  onAssigned?: () => void;
}

interface StudentOption {
  id: string;
  student_email: string;
  student_name: string | null;
}

export function AssignVideoModal({
  open,
  onOpenChange,
  videoTitle,
  videoId,
  preselectedStudentEmail,
  onAssigned,
}: AssignVideoModalProps) {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedEmail, setSelectedEmail] = useState(preselectedStudentEmail || "");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    supabase
      .from("teacher_students" as any)
      .select("id, student_email, student_name")
      .eq("teacher_id", user.id)
      .neq("status", "archived")
      .then(({ data }) => {
        setStudents((data || []) as unknown as StudentOption[]);
      });
  }, [user, open]);

  useEffect(() => {
    if (preselectedStudentEmail) setSelectedEmail(preselectedStudentEmail);
  }, [preselectedStudentEmail]);

  const handleSubmit = async () => {
    if (!user || !selectedEmail) {
      toast.error("Please select a student");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("video_assignments" as any).insert({
        teacher_id: user.id,
        student_email: selectedEmail,
        assignment_type: "video",
        video_id: videoId,
        video_title: videoTitle,
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        note: note || null,
        status: "assigned",
      } as any);

      if (error) throw error;

      const studentName = students.find(s => s.student_email === selectedEmail)?.student_name;
      const name = studentName || selectedEmail;
      toast.success(`Video assigned to ${name}!`);
      onOpenChange(false);
      setNote("");
      setDueDate(undefined);
      if (!preselectedStudentEmail) setSelectedEmail("");
      onAssigned?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign video");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Video</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground truncate">"{videoTitle}"</p>

        <div className="space-y-4 pt-2">
          {/* Student selector */}
          {!preselectedStudentEmail && (
            <div className="space-y-2">
              <Label>Select Student</Label>
              <Select value={selectedEmail} onValueChange={setSelectedEmail}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.student_email}>
                      {s.student_name || s.student_email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
            <Label>Add Note (optional)</Label>
            <Textarea
              placeholder="Focus on past tense conjugations..."
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
            <Button className="flex-1" onClick={handleSubmit} disabled={submitting || !selectedEmail}>
              {submitting ? "Assigning..." : "Assign Video"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
