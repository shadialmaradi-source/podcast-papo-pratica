import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Pencil, Mail, Globe, BookOpen, GraduationCap, Plus, Video, MessageSquare, CheckCircle, ExternalLink, CopyPlus } from "lucide-react";
import { EditStudentModal } from "@/components/teacher/EditStudentModal";
import { VideoBrowserModal } from "@/components/teacher/VideoBrowserModal";
import { AssignSpeakingModal } from "@/components/teacher/AssignSpeakingModal";
import { formatDistanceToNow, format } from "date-fns";
import { trackEvent, trackPageView } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";

interface StudentRow {
  id: string;
  student_email: string;
  student_name: string | null;
  level: string | null;
  native_language: string | null;
  notes: string | null;
  status: string;
  invited_at: string;
  last_active: string | null;
}

interface LessonRow {
  id: string;
  title: string;
  status: string;
  cefr_level: string;
  created_at: string;
  lesson_type: string;
}

interface AssignmentRow {
  id: string;
  assignment_type: string;
  video_id: string | null;
  video_title: string | null;
  due_date: string | null;
  note: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface SpeakingAssignmentRow {
  id: string;
  topic_title: string;
  cefr_level: string;
  custom_instructions: string | null;
  due_date: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface SpeakingLessonQuestion {
  id: string;
  question_text: string;
  difficulty: number;
  order_index: number;
}

interface InsertedSpeakingQuestion {
  id: string;
  order_index: number;
}

interface SpeakingVocabularyRow {
  question_id: string;
  target_word: string;
  translation: string;
  teacher_note: string | null;
}

export default function TeacherStudentDetail() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [student, setStudent] = useState<StudentRow | null>(null);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [speakingAssignments, setSpeakingAssignments] = useState<SpeakingAssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [videoBrowserOpen, setVideoBrowserOpen] = useState(false);
  const [speakingModalOpen, setSpeakingModalOpen] = useState(false);
  const [studentsForReuse, setStudentsForReuse] = useState<StudentRow[]>([]);
  const [reuseSourceLesson, setReuseSourceLesson] = useState<LessonRow | null>(null);
  const [reuseTargetEmail, setReuseTargetEmail] = useState<string>("live");
  const [reusing, setReusing] = useState(false);

  const fetchData = async () => {
    if (!user || !studentId) return;
    setLoading(true);

    const { data: sData } = await supabase
      .from("teacher_students")
      .select("*")
      .eq("id", studentId)
      .eq("teacher_id", user.id)
      .maybeSingle();

    const s = sData as unknown as StudentRow | null;
    setStudent(s);

    if (s) {
      // Fetch lessons
      const { data: lData } = await supabase
        .from("teacher_lessons")
        .select("id, title, status, cefr_level, created_at, lesson_type")
        .eq("teacher_id", user.id)
        .eq("student_email", s.student_email)
        .order("created_at", { ascending: false });
      setLessons((lData || []) as LessonRow[]);

      // Fetch video assignments
      const { data: aData } = await supabase
        .from("video_assignments")
        .select("id, assignment_type, video_id, video_title, due_date, note, status, created_at, completed_at")
        .eq("teacher_id", user.id)
        .eq("student_email", s.student_email)
        .eq("assignment_type", "video")
        .order("created_at", { ascending: false });
      setAssignments((aData || []) as unknown as AssignmentRow[]);

      // Fetch speaking assignments
      const { data: saData } = await supabase
        .from("speaking_assignments")
        .select("id, topic_title, cefr_level, custom_instructions, due_date, status, created_at, completed_at")
        .eq("teacher_id", user.id)
        .eq("student_email", s.student_email)
        .order("created_at", { ascending: false });
      setSpeakingAssignments((saData || []) as unknown as SpeakingAssignmentRow[]);

      const { data: rosterData } = await supabase
        .from("teacher_students")
        .select("id, student_email, student_name, level, native_language, notes, status, invited_at, last_active")
        .eq("teacher_id", user.id)
        .eq("status", "active")
        .order("student_name", { ascending: true });

      setStudentsForReuse((rosterData || []) as unknown as StudentRow[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    trackPageView("teacher_student_detail", "teacher");
    if (studentId) trackEvent("teacher_student_detail_viewed", { student_id: studentId });
    fetchData();
  }, [user, studentId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!student) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Student not found.</p>
        <Button variant="outline" onClick={() => navigate("/teacher/students")}>Back to Students</Button>
      </div>
    );
  }

  const totalAssignments = assignments.length + speakingAssignments.length;

  const handleReuseLesson = async () => {
    if (!user || !reuseSourceLesson || reusing) return;

    setReusing(true);
    try {
      const { data: sourceLesson, error: sourceError } = await supabase
        .from("teacher_lessons")
        .select("title, cefr_level, topic, lesson_type, language, translation_language, youtube_url, transcript, paragraph_prompt, paragraph_content, exercise_types, speaking_topic, speaking_description")
        .eq("id", reuseSourceLesson.id)
        .eq("teacher_id", user.id)
        .single();

      if (sourceError || !sourceLesson) throw sourceError || new Error("Source lesson not found");

      const targetEmail = reuseTargetEmail === "live" ? null : reuseTargetEmail;
      const shareToken = crypto.randomUUID();

      const { data: newLesson, error: newLessonError } = await supabase
        .from("teacher_lessons")
        .insert({
          teacher_id: user.id,
          title: sourceLesson.title,
          student_email: targetEmail,
          cefr_level: sourceLesson.cefr_level,
          topic: sourceLesson.topic,
          status: "ready",
          youtube_url: sourceLesson.youtube_url,
          transcript: sourceLesson.transcript,
          paragraph_content: sourceLesson.paragraph_content,
          paragraph_prompt: sourceLesson.paragraph_prompt,
          exercise_types: sourceLesson.exercise_types,
          language: sourceLesson.language,
          translation_language: sourceLesson.translation_language,
          lesson_type: sourceLesson.lesson_type,
          speaking_topic: sourceLesson.speaking_topic,
          speaking_description: sourceLesson.speaking_description,
          share_token: shareToken,
        })
        .select("id")
        .single();

      if (newLessonError || !newLesson) throw newLessonError || new Error("Failed to create lesson copy");

      const { data: sourceExercises } = await supabase
        .from("lesson_exercises")
        .select("exercise_type, content, order_index")
        .eq("lesson_id", reuseSourceLesson.id)
        .order("order_index");

      if (sourceExercises && sourceExercises.length > 0) {
        const inserts = sourceExercises.map((ex) => ({
          lesson_id: newLesson.id,
          exercise_type: ex.exercise_type,
          content: ex.content,
          order_index: ex.order_index,
        }));
        const { error: exInsertError } = await supabase
          .from("lesson_exercises")
          .insert(inserts);
        if (exInsertError) throw exInsertError;
      }

      if (sourceLesson.lesson_type === "speaking") {
        const { data: sourceQuestions } = await supabase
          .from("speaking_lesson_questions")
          .select("id, question_text, difficulty, order_index")
          .eq("lesson_id", reuseSourceLesson.id)
          .order("order_index");

        if (sourceQuestions && sourceQuestions.length > 0) {
          const typedSourceQuestions = sourceQuestions as SpeakingLessonQuestion[];
          const { data: insertedQuestions, error: qInsertError } = await supabase
            .from("speaking_lesson_questions")
            .insert(
              typedSourceQuestions.map((q) => ({
                lesson_id: newLesson.id,
                question_text: q.question_text,
                difficulty: q.difficulty,
                order_index: q.order_index,
              }))
            )
            .select("id, order_index");

          if (qInsertError) throw qInsertError;

          const oldIds = typedSourceQuestions.map((q) => q.id);
          const { data: sourceVocab } = await supabase
            .from("speaking_vocabulary")
            .select("question_id, target_word, translation, teacher_note")
            .in("question_id", oldIds);

          if (sourceVocab && sourceVocab.length > 0 && insertedQuestions) {
            const typedInsertedQuestions = insertedQuestions as InsertedSpeakingQuestion[];
            const typedSourceVocab = sourceVocab as SpeakingVocabularyRow[];
            const newIdByOrder = new Map(typedInsertedQuestions.map((q) => [q.order_index, q.id]));
            const oldOrderByQuestionId = new Map(typedSourceQuestions.map((q) => [q.id, q.order_index]));

            const vocabInserts = typedSourceVocab
              .map((v) => {
                const orderIndex = oldOrderByQuestionId.get(v.question_id);
                const newQuestionId = orderIndex !== undefined ? newIdByOrder.get(orderIndex) : undefined;
                if (!newQuestionId) return null;
                return {
                  question_id: newQuestionId,
                  target_word: v.target_word,
                  translation: v.translation,
                  teacher_note: v.teacher_note,
                };
              })
              .filter(Boolean);

            if (vocabInserts.length > 0) {
              const { error: vocabInsertError } = await supabase
                .from("speaking_vocabulary")
                .insert(vocabInserts);
              if (vocabInsertError) throw vocabInsertError;
            }
          }
        }
      }

      toast({
        title: "Lesson reused",
        description: targetEmail ? `Assigned copy to ${targetEmail}.` : "Created a live-teaching copy.",
      });

      setReuseSourceLesson(null);
      setReuseTargetEmail("live");
      fetchData();
      navigate(`/teacher/lesson/${newLesson.id}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Please try again.";
      toast({
        title: "Could not reuse lesson",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setReusing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/teacher/students")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">
              {student.student_name || student.student_email}
            </h1>
          </div>
          {/* Assign dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Assign
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setVideoBrowserOpen(true)}>
                <Video className="mr-2 h-4 w-4" />
                Assign Library Video
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSpeakingModalOpen(true)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Assign Speaking Topic
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        {/* Info Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Student Info</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-3 w-3" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{student.student_email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <span>{student.level || "No level set"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span>{student.native_language || "Not set"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant={student.status === "archived" ? "outline" : "default"}>{student.status}</Badge>
            </div>
            {student.notes && (
              <div className="col-span-full">
                <p className="text-sm text-muted-foreground italic">"{student.notes}"</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{lessons.length}</p>
              <p className="text-xs text-muted-foreground">Lessons</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{totalAssignments}</p>
              <p className="text-xs text-muted-foreground">Assignments</p>
            </CardContent>
          </Card>
        </div>

        {/* Video Assignments */}
        {assignments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="h-5 w-5" />
                Video Assignments
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Video</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <p className="text-sm font-medium truncate max-w-[200px]">{a.video_title}</p>
                      {a.note && <p className="text-xs text-muted-foreground truncate">{a.note}</p>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.due_date ? format(new Date(a.due_date), "MMM d") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.status === "completed" ? "default" : "secondary"}>{a.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => a.video_id && navigate(`/lesson/${a.video_id}`)}
                        disabled={!a.video_id}
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Open Video
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Speaking Assignments */}
        {speakingAssignments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Speaking Assignments
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Topic</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {speakingAssignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <p className="text-sm font-medium truncate max-w-[200px]">{a.topic_title}</p>
                      {a.custom_instructions && <p className="text-xs text-muted-foreground truncate">{a.custom_instructions}</p>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{a.cefr_level}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.due_date ? format(new Date(a.due_date), "MMM d") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.status === "completed" ? "default" : a.status === "reviewed" ? "outline" : "secondary"}>
                        {a.status === "reviewed" ? "Prepared" : a.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Lessons Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Assigned Lessons
            </CardTitle>
          </CardHeader>
          {lessons.length === 0 ? (
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-6">No lessons assigned yet.</p>
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lessons.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.title}</TableCell>
                    <TableCell><Badge variant="outline">{l.cefr_level}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">{l.lesson_type.replace("_", " ")}</TableCell>
                    <TableCell><Badge variant={l.status === "completed" ? "default" : "secondary"}>{l.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(l.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/teacher/lesson/${l.id}`)}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          Open
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReuseSourceLesson(l);
                            setReuseTargetEmail("live");
                          }}
                        >
                          <CopyPlus className="h-3.5 w-3.5 mr-1" />
                          Reuse
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </main>

      <EditStudentModal open={editOpen} onOpenChange={setEditOpen} student={student} onUpdated={fetchData} />
      <VideoBrowserModal
        open={videoBrowserOpen}
        onOpenChange={setVideoBrowserOpen}
        studentEmail={student.student_email}
        onAssigned={fetchData}
      />
      <AssignSpeakingModal
        open={speakingModalOpen}
        onOpenChange={setSpeakingModalOpen}
        studentEmail={student.student_email}
        studentName={student.student_name}
        studentLevel={student.level}
        onAssigned={fetchData}
      />

      <Dialog
        open={!!reuseSourceLesson}
        onOpenChange={(open) => {
          if (!open) {
            setReuseSourceLesson(null);
            setReuseTargetEmail("live");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reuse lesson</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create a reusable copy of <span className="font-medium text-foreground">{reuseSourceLesson?.title}</span>.
            </p>
            <div className="space-y-2">
              <p className="text-sm font-medium">Assign copy to</p>
              <Select value={reuseTargetEmail} onValueChange={setReuseTargetEmail}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose student" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">Live lesson (no student)</SelectItem>
                  {studentsForReuse.map((s) => (
                    <SelectItem key={s.id} value={s.student_email}>
                      {s.student_name ? `${s.student_name} (${s.student_email})` : s.student_email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleReuseLesson} disabled={reusing} className="w-full">
              {reusing ? "Creating copy..." : "Create lesson copy"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
