import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  FileEdit,
  Users,
  ClipboardCheck,
  ArrowRight,
  CheckCircle2,
  Zap,
} from "lucide-react";
import type { TeacherQuota } from "@/services/teacherQuotaService";

interface Action {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
}

interface NextBestActionProps {
  teacherId: string;
  quota: TeacherQuota | null;
  onNavigate: (path: string) => void;
  onCreateLesson: () => void;
}

export function NextBestAction({
  teacherId,
  quota,
  onNavigate,
  onCreateLesson,
}: NextBestActionProps) {
  const [action, setAction] = useState<Action | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    resolveAction();
  }, [teacherId, quota]);

  async function resolveAction() {
    try {
      setLoading(true);

      // 1. Quota blocking → upgrade
      if (quota && !quota.canCreateLesson && quota.emailVerified) {
        setAction({
          id: "upgrade",
          icon: <Zap className="h-5 w-5" />,
          title: "Upgrade to keep creating",
          description: "You've reached your lesson limit this month.",
          cta: "View Plans",
          onClick: () => onNavigate("/teacher/pricing"),
        });
        return;
      }

      // 2. Draft lessons
      const { count: draftCount } = await supabase
        .from("teacher_lessons")
        .select("*", { count: "exact", head: true })
        .eq("teacher_id", teacherId)
        .eq("status", "draft");

      if (draftCount && draftCount > 0) {
        setAction({
          id: "draft",
          icon: <FileEdit className="h-5 w-5" />,
          title: "Finish your draft lesson",
          description: `You have ${draftCount} draft${draftCount > 1 ? "s" : ""} waiting to be completed.`,
          cta: "View Lessons",
          onClick: () => onNavigate("/teacher#teacher-lessons-section"),
        });
        return;
      }

      // 3. Pending assignments to review
      const { count: pendingCount } = await supabase
        .from("speaking_assignments")
        .select("*", { count: "exact", head: true })
        .eq("teacher_id", teacherId)
        .eq("status", "submitted");

      if (pendingCount && pendingCount > 0) {
        setAction({
          id: "review",
          icon: <ClipboardCheck className="h-5 w-5" />,
          title: "Review student submissions",
          description: `${pendingCount} speaking assignment${pendingCount > 1 ? "s" : ""} need${pendingCount === 1 ? "s" : ""} your review.`,
          cta: "Review Now",
          onClick: () => onNavigate("/teacher/students"),
        });
        return;
      }

      // 4. Inactive students (no activity in 7+ days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { count: inactiveCount } = await supabase
        .from("teacher_students")
        .select("*", { count: "exact", head: true })
        .eq("teacher_id", teacherId)
        .eq("status", "active")
        .lt("last_active", weekAgo.toISOString());

      if (inactiveCount && inactiveCount > 0) {
        setAction({
          id: "inactive",
          icon: <Users className="h-5 w-5" />,
          title: "Check on inactive students",
          description: `${inactiveCount} student${inactiveCount > 1 ? "s" : ""} haven't been active this week.`,
          cta: "View Students",
          onClick: () => onNavigate("/teacher/students"),
        });
        return;
      }

      // 5. No lessons yet → create first
      const { count: lessonCount } = await supabase
        .from("teacher_lessons")
        .select("*", { count: "exact", head: true })
        .eq("teacher_id", teacherId);

      if (!lessonCount || lessonCount === 0) {
        setAction({
          id: "first_lesson",
          icon: <Sparkles className="h-5 w-5" />,
          title: "Create your first lesson",
          description: "Get started by building a lesson for your students.",
          cta: "Create Lesson",
          onClick: onCreateLesson,
        });
        return;
      }

      // 6. All good — empty state
      setAction(null);
    } catch (err) {
      console.error("NextBestAction: error resolving action", err);
      setAction(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card className="mb-6 border-border/60">
        <CardContent className="py-4">
          <div className="flex items-center gap-3 animate-pulse">
            <div className="h-9 w-9 rounded-lg bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-muted rounded" />
              <div className="h-3 w-56 bg-muted rounded" />
            </div>
            <div className="h-8 w-24 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!action) {
    return (
      <Card className="mb-6 border-border/40 bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">You're all caught up</p>
              <p className="text-xs text-muted-foreground">
                No urgent actions right now. Keep up the great work!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-primary/20 bg-primary/[0.03] transition-all hover:border-primary/30">
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary shrink-0">
            {action.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{action.title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {action.description}
            </p>
          </div>
          <Button size="sm" onClick={action.onClick} className="shrink-0 gap-1">
            {action.cta}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
