import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const LANGUAGES = ["English", "Spanish", "Portuguese", "French", "Italian", "German", "Chinese", "Japanese", "Korean", "Arabic"];

interface Student {
  id: string;
  student_email: string;
  student_name: string | null;
  level: string | null;
  native_language: string | null;
  notes: string | null;
}

interface EditStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  onUpdated: () => void;
}

export function EditStudentModal({ open, onOpenChange, student, onUpdated }: EditStudentModalProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [nativeLanguage, setNativeLanguage] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (student) {
      setEmail(student.student_email);
      setName(student.student_name || "");
      setLevel(student.level || "");
      setNativeLanguage(student.native_language || "");
      setNotes(student.notes || "");
    }
  }, [student]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !email.trim()) return;

    setLoading(true);
    const { error } = await supabase
      .from("teacher_students" as any)
      .update({
        student_email: email.trim().toLowerCase(),
        student_name: name.trim() || null,
        level: level || null,
        native_language: nativeLanguage || null,
        notes: notes.trim() || null,
      } as any)
      .eq("id", student.id);

    setLoading(false);

    if (error) {
      toast({ title: "Error updating student", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Student updated" });
    onOpenChange(false);
    onUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email *</Label>
            <Input id="edit-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CEFR Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
                <SelectContent>
                  {CEFR_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Native Language</Label>
              <Select value={nativeLanguage} onValueChange={setNativeLanguage}>
                <SelectTrigger><SelectValue placeholder="Language" /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || !email.trim()}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
