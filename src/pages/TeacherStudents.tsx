import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Users, BookOpen, TrendingUp, Eye, Pencil, Archive, Crown, ChevronLeft, ChevronRight, Video } from "lucide-react";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { AddStudentModal } from "@/components/teacher/AddStudentModal";
import { EditStudentModal } from "@/components/teacher/EditStudentModal";
import { VideoBrowserModal } from "@/components/teacher/VideoBrowserModal";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
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

interface LessonStats {
  student_email: string;
  assigned: number;
  completed: number;
}

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const PAGE_SIZE = 20;

export default function TeacherStudents() {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [lessonStats, setLessonStats] = useState<LessonStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<StudentRow | null>(null);
  const [assignStudentEmail, setAssignStudentEmail] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [teacherPlan, setTeacherPlan] = useState("free");

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [sortBy, setSortBy] = useState("last_active");

  useEffect(() => {
    if (roleLoading) return;
    if (role !== "teacher") { navigate("/app"); return; }
    trackPageView("teacher_students", "teacher");
    trackEvent("teacher_students_viewed");
  }, [role, roleLoading, navigate]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch teacher plan
    const { data: subData } = await supabase
      .from("teacher_subscriptions" as any)
      .select("plan")
      .eq("teacher_id", user.id)
      .maybeSingle();
    setTeacherPlan((subData as any)?.plan || "free");

    // Fetch students with server-side pagination
    let query = supabase
      .from("teacher_students" as any)
      .select("*", { count: "exact" })
      .eq("teacher_id", user.id)
      .order("invited_at", { ascending: false });

    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (levelFilter !== "all") query = query.eq("level", levelFilter);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const { data: studentsData, count } = await query;
    const rows = (studentsData || []) as unknown as StudentRow[];
    setStudents(rows);
    setTotalCount(count || 0);

    // Fetch lesson stats per student email
    const { data: lessons } = await supabase
      .from("teacher_lessons")
      .select("id, student_email, status")
      .eq("teacher_id", user.id);

    if (lessons) {
      const emailMap: Record<string, { assigned: number; completed: number }> = {};
      for (const l of lessons) {
        if (!l.student_email) continue;
        if (!emailMap[l.student_email]) emailMap[l.student_email] = { assigned: 0, completed: 0 };
        emailMap[l.student_email].assigned++;
        if (l.status === "completed") emailMap[l.student_email].completed++;
      }
      setLessonStats(
        Object.entries(emailMap).map(([student_email, s]) => ({ student_email, ...s }))
      );
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user, page, statusFilter, levelFilter]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [statusFilter, levelFilter]);

  const getStats = (email: string) => lessonStats.find((s) => s.student_email === email) || { assigned: 0, completed: 0 };

  const sorted = useMemo(() => {
    let list = [...students];
    list.sort((a, b) => {
      if (sortBy === "name") return (a.student_name || a.student_email).localeCompare(b.student_name || b.student_email);
      if (sortBy === "completion") {
        const aS = getStats(a.student_email);
        const bS = getStats(b.student_email);
        const aR = aS.assigned ? aS.completed / aS.assigned : 0;
        const bR = bS.assigned ? bS.completed / bS.assigned : 0;
        return bR - aR;
      }
      // last_active default
      const aD = a.last_active || a.invited_at;
      const bD = b.last_active || b.invited_at;
      return new Date(bD).getTime() - new Date(aD).getTime();
    });
    return list;
  }, [students, sortBy, lessonStats]);

  const handleArchive = async (student: StudentRow) => {
    const { error } = await supabase
      .from("teacher_students" as any)
      .update({ status: "archived" } as any)
      .eq("id", student.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      trackEvent("teacher_student_archived", { student_id: student.id });
      toast({ title: "Student archived" });
      fetchData();
    }
  };

  // Aggregate stats
  const activeCount = students.filter((s) => s.status === "active" || s.status === "invited").length;
  const totalAssigned = lessonStats.reduce((a, s) => a + s.assigned, 0);
  const totalCompleted = lessonStats.reduce((a, s) => a + s.completed, 0);
  const avgCompletion = totalAssigned ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "invited": return "secondary";
      case "archived": return "outline";
      default: return "secondary";
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (roleLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/teacher")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold text-foreground">
                My Students ({totalCount})
              </h1>
            </div>
          </div>
          <Button onClick={() => {
            const nonArchived = totalCount;
            if (teacherPlan === "free" && nonArchived >= 3) {
              setUpgradeOpen(true);
            } else {
              setAddOpen(true);
            }
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
        {/* Free tier banner */}
        {teacherPlan === "free" && (
          <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-sm text-foreground">
              You're using <strong>{totalCount}</strong> of <strong>3</strong> free student slots.
            </p>
            <Button size="sm" variant="outline" onClick={() => navigate("/teacher/pricing")}>
              <Crown className="mr-1.5 h-3.5 w-3.5" />
              Upgrade
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Active Students</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{avgCompletion}%</p>
                <p className="text-sm text-muted-foreground">Avg Completion</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{totalAssigned}</p>
                <p className="text-sm text-muted-foreground">Total Lessons</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="invited">Invited</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {CEFR_LEVELS.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="last_active">Last Active</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="completion">Completion Rate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name / Email</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-center">Lessons</TableHead>
                  <TableHead className="text-center">Completed</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : sorted.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-lg font-medium text-foreground">No students yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add your first student to get started.</p>
              <Button className="mt-4" onClick={() => setAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name / Email</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead className="text-center">Lessons</TableHead>
                    <TableHead className="text-center">Completed</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((s) => {
                    const stats = getStats(s.student_email);
                    const pct = stats.assigned ? Math.round((stats.completed / stats.assigned) * 100) : 0;
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div>
                            {s.student_name && <p className="font-medium text-foreground">{s.student_name}</p>}
                            <p className="text-sm text-muted-foreground">{s.student_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {s.level ? <Badge variant="outline">{s.level}</Badge> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center">{stats.assigned}</TableCell>
                        <TableCell className="text-center">
                          {stats.assigned ? `${stats.completed} (${pct}%)` : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {s.last_active ? formatDistanceToNow(new Date(s.last_active), { addSuffix: true }) : "Never"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusColor(s.status)}>{s.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/teacher/student/${s.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setEditStudent(s)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {s.status !== "archived" && (
                              <Button variant="ghost" size="icon" onClick={() => handleArchive(s)}>
                                <Archive className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <AddStudentModal open={addOpen} onOpenChange={setAddOpen} onAdded={fetchData} />
      <EditStudentModal open={!!editStudent} onOpenChange={(o) => !o && setEditStudent(null)} student={editStudent} onUpdated={fetchData} />

      {/* Upgrade prompt modal */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Upgrade to Pro
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            You've reached the free tier limit of 3 students. Upgrade to Pro for unlimited students and advanced features.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" onClick={() => setUpgradeOpen(false)}>Cancel</Button>
            <Button onClick={() => navigate("/teacher/pricing")}>
              <Crown className="mr-2 h-4 w-4" />
              Upgrade Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <TeacherNav />
    </div>
  );
}
