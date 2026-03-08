import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Pencil, Mail, Globe, BookOpen, GraduationCap } from "lucide-react";
import { EditStudentModal } from "@/components/teacher/EditStudentModal";
import { formatDistanceToNow, format } from "date-fns";

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

export default function TeacherStudentDetail() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [student, setStudent] = useState<StudentRow | null>(null);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

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
      const { data: lData } = await supabase
        .from("teacher_lessons")
        .select("id, title, status, cefr_level, created_at, lesson_type")
        .eq("teacher_id", user.id)
        .eq("student_email", s.student_email)
        .order("created_at", { ascending: false });

      setLessons((lData || []) as LessonRow[]);
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

  const completedCount = lessons.filter((l) => l.status === "completed").length;
  const pct = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/teacher/students")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">
            {student.student_name || student.student_email}
          </h1>
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
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{lessons.length}</p>
              <p className="text-xs text-muted-foreground">Assigned</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{pct}%</p>
              <p className="text-xs text-muted-foreground">Completion</p>
            </CardContent>
          </Card>
        </div>

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
    </div>
  );
}
