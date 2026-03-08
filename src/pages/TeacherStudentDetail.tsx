import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Pencil, Mail, Globe, BookOpen, GraduationCap, Plus, Video, MessageSquare, CheckCircle } from "lucide-react";
import { EditStudentModal } from "@/components/teacher/EditStudentModal";
import { VideoBrowserModal } from "@/components/teacher/VideoBrowserModal";
import { AssignSpeakingModal } from "@/components/teacher/AssignSpeakingModal";
import { formatDistanceToNow, format } from "date-fns";
import { trackEvent, trackPageView } from "@/lib/analytics";

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

export default function TeacherStudentDetail() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [student, setStudent] = useState<StudentRow | null>(null);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [speakingAssignments, setSpeakingAssignments] = useState<SpeakingAssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [videoBrowserOpen, setVideoBrowserOpen] = useState(false);
  const [speakingModalOpen, setSpeakingModalOpen] = useState(false);

  const fetchData = async () => {
    if (!user || !studentId) return;
    setLoading(true);

    const { data: sData } = await supabase
      .from("teacher_students" as any)
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
        .from("video_assignments" as any)
        .select("id, assignment_type, video_title, due_date, note, status, created_at, completed_at")
        .eq("teacher_id", user.id)
        .eq("student_email", s.student_email)
        .eq("assignment_type", "video")
        .order("created_at", { ascending: false });
      setAssignments((aData || []) as unknown as AssignmentRow[]);

      // Fetch speaking assignments
      const { data: saData } = await supabase
        .from("speaking_assignments" as any)
        .select("id, topic_title, cefr_level, custom_instructions, due_date, status, created_at, completed_at")
        .eq("teacher_id", user.id)
        .eq("student_email", s.student_email)
        .order("created_at", { ascending: false });
      setSpeakingAssignments((saData || []) as unknown as SpeakingAssignmentRow[]);
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user, studentId]);

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {lessons.map((l) => (
                  <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/teacher/lesson/${l.id}`)}>
                    <TableCell className="font-medium">{l.title}</TableCell>
                    <TableCell><Badge variant="outline">{l.cefr_level}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">{l.lesson_type.replace("_", " ")}</TableCell>
                    <TableCell><Badge variant={l.status === "completed" ? "default" : "secondary"}>{l.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(l.created_at), "MMM d, yyyy")}</TableCell>
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
    </div>
  );
}
