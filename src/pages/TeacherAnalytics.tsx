import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Users, BookOpen, TrendingUp, BarChart3, ArrowUpRight, ArrowDownRight, ArrowRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, isAfter, differenceInWeeks, differenceInDays } from "date-fns";
import { RetentionMetrics } from "@/components/teacher/analytics/RetentionMetrics";
import { ChurnPrediction, type ChurnStudent } from "@/components/teacher/analytics/ChurnPrediction";
import { EngagementMetrics } from "@/components/teacher/analytics/EngagementMetrics";
import { ContentPerformance, type ContentItem } from "@/components/teacher/analytics/ContentPerformance";
import { CohortAnalysis, type CohortRow } from "@/components/teacher/analytics/CohortAnalysis";

type StudentWithStats = {
  id: string;
  student_email: string;
  student_name: string | null;
  level: string | null;
  status: string;
  last_active: string | null;
  invited_at: string;
  assigned: number;
  completed: number;
  in_progress: number;
  not_started: number;
  completionRate: number;
  trend: "improving" | "declining" | "steady";
};

type TimeRange = "7d" | "30d" | "all";
type StatusFilter = "all" | "active" | "at_risk" | "inactive";

export default function TeacherAnalytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [students, setStudents] = useState<StudentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [completionOverTime, setCompletionOverTime] = useState<{ date: string; completed: number }[]>([]);
  const [lessonsByLevel, setLessonsByLevel] = useState<{ level: string; count: number }[]>([]);
  const [allResponses, setAllResponses] = useState<{ lesson_id: string; submitted_at: string }[]>([]);
  const [allLessons, setAllLessons] = useState<{ id: string; student_email: string | null; status: string; cefr_level: string; created_at: string; title: string }[]>([]);

  useEffect(() => {
    if (roleLoading) return;
    if (role !== "teacher") { navigate("/app"); return; }
  }, [role, roleLoading, navigate]);

  useEffect(() => {
    trackEvent("analytics_viewed");
    trackEvent("retention_viewed");
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchAnalytics();
  }, [user, timeRange]);

  const fetchAnalytics = async () => {
    if (!user) return;
    setLoading(true);

    const { data: studentsData } = await supabase
      .from("teacher_students" as any)
      .select("*")
      .eq("teacher_id", user.id)
      .neq("status", "archived");

    const { data: lessonsData } = await supabase
      .from("teacher_lessons")
      .select("id, student_email, status, cefr_level, created_at, title")
      .eq("teacher_id", user.id);

    const { data: responsesData } = await supabase
      .from("lesson_responses")
      .select("lesson_id, submitted_at")
      .in("lesson_id", (lessonsData || []).map(l => l.id));

    const typedStudents = (studentsData || []) as any[];
    const lessons = lessonsData || [];
    const responses = responsesData || [];
    setAllResponses(responses);
    setAllLessons(lessons);

    const midpoint = subDays(new Date(), 15);
    const studentStats: StudentWithStats[] = typedStudents.map((s: any) => {
      const studentLessons = lessons.filter(l => l.student_email === s.student_email);
      const assigned = studentLessons.length;
      const completed = studentLessons.filter(l => l.status === "completed").length;
      const inProgress = studentLessons.filter(l => l.status === "in_progress").length;
      const notStarted = assigned - completed - inProgress;
      const completionRate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

      const studentLessonIds = new Set(studentLessons.map(l => l.id));
      const studentResponses = responses.filter(r => studentLessonIds.has(r.lesson_id));
      const lastActive = studentResponses.length > 0
        ? studentResponses.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0].submitted_at
        : s.last_active;

      const recentLessons = studentLessons.filter(l => l.created_at && isAfter(new Date(l.created_at), midpoint));
      const olderLessons = studentLessons.filter(l => l.created_at && !isAfter(new Date(l.created_at), midpoint));
      const recentRate = recentLessons.length > 0 ? recentLessons.filter(l => l.status === "completed").length / recentLessons.length : 0;
      const olderRate = olderLessons.length > 0 ? olderLessons.filter(l => l.status === "completed").length / olderLessons.length : 0;
      const trend: "improving" | "declining" | "steady" = recentRate > olderRate + 0.1 ? "improving" : recentRate < olderRate - 0.1 ? "declining" : "steady";

      return {
        id: s.id, student_email: s.student_email, student_name: s.student_name,
        level: s.level, status: s.status, last_active: lastActive,
        invited_at: s.invited_at || s.created_at || new Date().toISOString(),
        assigned, completed, in_progress: inProgress, not_started: notStarted, completionRate, trend,
      };
    });

    setStudents(studentStats);

    // Completion over time
    const dateMap = new Map<string, number>();
    responses.forEach(r => {
      const day = format(new Date(r.submitted_at), "MMM dd");
      dateMap.set(day, (dateMap.get(day) || 0) + 1);
    });
    setCompletionOverTime(
      [...dateMap.entries()]
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .slice(-30)
        .map(([date, completed]) => ({ date, completed }))
    );

    // Lessons by level
    const levelMap = new Map<string, number>();
    lessons.forEach(l => levelMap.set(l.cefr_level, (levelMap.get(l.cefr_level) || 0) + 1));
    setLessonsByLevel(["A1", "A2", "B1", "B2", "C1", "C2"].map(level => ({ level, count: levelMap.get(level) || 0 })).filter(l => l.count > 0));

    setLoading(false);
  };

  // Overview stats
  const totalStudents = students.length;
  const activeThisWeek = students.filter(s => s.last_active && isAfter(new Date(s.last_active), subDays(new Date(), 7))).length;
  const totalAssigned = students.reduce((sum, s) => sum + s.assigned, 0);
  const avgCompletion = totalStudents > 0 ? Math.round(students.reduce((sum, s) => sum + s.completionRate, 0) / totalStudents) : 0;

  // Retention metrics
  const retentionData = useMemo(() => {
    const now = new Date();
    const total = students.length;
    if (total === 0) return { week1: { active: 0, total: 0, rate: 0 }, week2: { active: 0, total: 0, rate: 0 }, week4: { active: 0, total: 0, rate: 0 }, month1: { active: 0, total: 0, rate: 0 }, curve: [] };

    const calcActive = (days: number) => students.filter(s => s.last_active && isAfter(new Date(s.last_active), subDays(now, days))).length;
    const w1 = calcActive(7), w2 = calcActive(14), w4 = calcActive(28), m1 = calcActive(30);
    const rate = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

    const curve = [
      { week: "Week 0", retention: 100 },
      { week: "Week 1", retention: rate(w1) },
      { week: "Week 2", retention: rate(w2) },
      { week: "Week 4", retention: rate(w4) },
    ];

    return {
      week1: { active: w1, total, rate: rate(w1) },
      week2: { active: w2, total, rate: rate(w2) },
      week4: { active: w4, total, rate: rate(w4) },
      month1: { active: m1, total, rate: rate(m1) },
      curve,
    };
  }, [students]);

  // Churn prediction
  const churnStudents = useMemo<ChurnStudent[]>(() => {
    return students.map(s => {
      const daysInactive = s.last_active ? differenceInDays(new Date(), new Date(s.last_active)) : 30;
      const inactiveScore = Math.min(daysInactive * 5, 50);
      const completionScore = Math.min((100 - s.completionRate) * 0.5, 50);
      const riskScore = Math.round(inactiveScore + completionScore);
      const riskLevel = riskScore >= 80 ? "high" as const : riskScore >= 50 ? "medium" as const : "low" as const;
      return { id: s.id, student_name: s.student_name, student_email: s.student_email, riskScore, riskLevel, lastActive: s.last_active, completionRate: s.completionRate };
    }).filter(s => s.riskLevel !== "low");
  }, [students]);

  // Engagement metrics
  const engagementData = useMemo(() => {
    const responses = allResponses;
    if (responses.length === 0) return { avgLessonsPerWeek: 0, mostActiveDay: "N/A", weeklyActivity: [] };

    // Most active day
    const dayCount = [0, 0, 0, 0, 0, 0, 0];
    const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    responses.forEach(r => dayCount[new Date(r.submitted_at).getDay()]++);
    const maxDay = dayCount.indexOf(Math.max(...dayCount));

    // Weekly activity
    const weekMap = new Map<string, number>();
    responses.forEach(r => {
      const wk = format(new Date(r.submitted_at), "MMM dd");
      weekMap.set(wk, (weekMap.get(wk) || 0) + 1);
    });
    const weeklyActivity = [...weekMap.entries()].sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()).slice(-14).map(([week, responses]) => ({ week, responses }));

    // Avg completions per week
    const firstResponse = responses.reduce((min, r) => r.submitted_at < min ? r.submitted_at : min, responses[0].submitted_at);
    const weeksSinceFirst = Math.max(1, differenceInWeeks(new Date(), new Date(firstResponse)));
    const avgLessonsPerWeek = totalStudents > 0 ? responses.length / weeksSinceFirst : 0;

    return { avgLessonsPerWeek, mostActiveDay: DAYS[maxDay], weeklyActivity };
  }, [allResponses, totalStudents]);

  // Content performance
  const contentItems = useMemo<ContentItem[]>(() => {
    const titleMap = new Map<string, { assigned: number; completed: number }>();
    allLessons.forEach(l => {
      const entry = titleMap.get(l.title) || { assigned: 0, completed: 0 };
      entry.assigned++;
      if (l.status === "completed") entry.completed++;
      titleMap.set(l.title, entry);
    });
    return [...titleMap.entries()].map(([title, { assigned, completed }]) => ({
      title, assigned, completed, completionRate: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
    }));
  }, [allLessons]);

  // Cohort analysis
  const cohortByMonth = useMemo<CohortRow[]>(() => {
    const monthMap = new Map<string, StudentWithStats[]>();
    students.forEach(s => {
      const month = format(new Date(s.invited_at), "MMM yyyy");
      monthMap.set(month, [...(monthMap.get(month) || []), s]);
    });
    return [...monthMap.entries()].map(([label, group]) => {
      const active = group.filter(s => s.last_active && isAfter(new Date(s.last_active), subDays(new Date(), 14))).length;
      return { label, totalStudents: group.length, activeStudents: active, retentionRate: group.length > 0 ? Math.round((active / group.length) * 100) : 0 };
    });
  }, [students]);

  const cohortByLevel = useMemo<CohortRow[]>(() => {
    const levelMap = new Map<string, StudentWithStats[]>();
    students.forEach(s => {
      const lvl = s.level || "Unknown";
      levelMap.set(lvl, [...(levelMap.get(lvl) || []), s]);
    });
    return [...levelMap.entries()].map(([label, group]) => {
      const active = group.filter(s => s.last_active && isAfter(new Date(s.last_active), subDays(new Date(), 14))).length;
      return { label, totalStudents: group.length, activeStudents: active, retentionRate: group.length > 0 ? Math.round((active / group.length) * 100) : 0 };
    });
  }, [students]);

  // Filtered students for activity table
  const atRiskIds = useMemo(() => new Set(churnStudents.map(s => s.id)), [churnStudents]);
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (statusFilter === "active") return s.last_active && isAfter(new Date(s.last_active), subDays(new Date(), 7));
      if (statusFilter === "at_risk") return atRiskIds.has(s.id);
      if (statusFilter === "inactive") return !s.last_active || !isAfter(new Date(s.last_active), subDays(new Date(), 7));
      return true;
    });
  }, [students, statusFilter, atRiskIds]);

  const formatLastActive = (date: string | null) => {
    if (!date) return "Never";
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Today";
    if (diff === 1) return "1 day ago";
    return `${diff} days ago`;
  };

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === "improving") return <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><ArrowUpRight className="h-4 w-4" /> Improving</span>;
    if (trend === "declining") return <span className="flex items-center gap-1 text-destructive"><ArrowDownRight className="h-4 w-4" /> Declining</span>;
    return <span className="flex items-center gap-1 text-muted-foreground"><ArrowRight className="h-4 w-4" /> Steady</span>;
  };

  if (loading && students.length === 0) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading analytics...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/teacher")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Analytics</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{totalStudents}</p>
              <p className="text-sm text-muted-foreground">Total Students</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{activeThisWeek} <span className="text-sm font-normal text-muted-foreground">({totalStudents > 0 ? Math.round((activeThisWeek / totalStudents) * 100) : 0}%)</span></p>
              <p className="text-sm text-muted-foreground">Active This Week</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <BookOpen className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{totalAssigned}</p>
              <p className="text-sm text-muted-foreground">Lessons Assigned</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <BarChart3 className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{avgCompletion}%</p>
              <p className="text-sm text-muted-foreground">Avg Completion</p>
            </CardContent>
          </Card>
        </div>

        {/* Retention Metrics */}
        <RetentionMetrics data={retentionData} />

        {/* Churn Prediction */}
        <ChurnPrediction students={churnStudents} />

        {/* Engagement + Content side by side on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EngagementMetrics data={engagementData} />
          <ContentPerformance items={contentItems} />
        </div>

        {/* Cohort Analysis */}
        <CohortAnalysis byMonth={cohortByMonth} byLevel={cohortByLevel} />

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="at_risk">At Risk</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Student Activity Table */}
        <Card>
          <CardHeader><CardTitle>Student Activity</CardTitle></CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No students match filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead className="text-center">Assigned</TableHead>
                      <TableHead className="text-center">Completed</TableHead>
                      <TableHead className="text-center">In Progress</TableHead>
                      <TableHead className="text-center">Not Started</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map(s => (
                      <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/teacher/student/${s.id}`)}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{s.student_name || s.student_email}</p>
                            {s.student_name && <p className="text-xs text-muted-foreground">{s.student_email}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{s.assigned}</TableCell>
                        <TableCell className="text-center">{s.completed} ({s.completionRate}%)</TableCell>
                        <TableCell className="text-center">{s.in_progress}</TableCell>
                        <TableCell className="text-center">{s.not_started}</TableCell>
                        <TableCell>{formatLastActive(s.last_active)}</TableCell>
                        <TableCell><TrendIcon trend={s.trend} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Completions Over Time</CardTitle></CardHeader>
            <CardContent>
              {completionOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={completionOverTime}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <Tooltip />
                    <Line type="monotone" dataKey="completed" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-12">No completion data yet.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Lessons by Level</CardTitle></CardHeader>
            <CardContent>
              {lessonsByLevel.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={lessonsByLevel}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="level" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-12">No lesson data yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
