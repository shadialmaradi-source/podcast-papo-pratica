import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const LANGUAGES = ["English", "Spanish", "Portuguese", "French", "Italian", "German", "Chinese", "Japanese", "Korean", "Arabic"];

interface AddStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

export function AddStudentModal({ open, onOpenChange, onAdded }: AddStudentModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [nativeLanguage, setNativeLanguage] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setEmail("");
    setName("");
    setLevel("");
    setNativeLanguage("");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !email.trim()) return;

    setLoading(true);
    const { error } = await supabase
      .from("teacher_students" as any)
      .insert({
        teacher_id: user.id,
        student_email: email.trim().toLowerCase(),
        student_name: name.trim() || null,
        level: level || null,
        native_language: nativeLanguage || null,
        notes: notes.trim() || null,
      } as any);

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Student already exists", description: "This email is already in your student list.", variant: "destructive" });
      } else {
        toast({ title: "Error adding student", description: error.message, variant: "destructive" });
      }
      return;
    }

    trackEvent("teacher_student_added", { level: level || "unset" });
    toast({ title: "Student added!", description: "Now assign them lessons." });
    resetForm();
    onOpenChange(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Student</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student-email">Email *</Label>
            <Input id="student-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@email.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="student-name">Name</Label>
            <Input id="student-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Student name" />
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
            <Label htmlFor="student-notes">Notes</Label>
            <Textarea id="student-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes about this student..." rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || !email.trim()}>
              {loading ? "Adding..." : "Add Student"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
