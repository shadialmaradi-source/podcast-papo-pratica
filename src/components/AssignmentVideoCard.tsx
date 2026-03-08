import { useNavigate } from "react-router-dom";
import { format, isPast, isToday, addDays, isBefore } from "date-fns";
import { CalendarDays, Play, RotateCw, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

export interface AssignmentWithVideo {
  id: string;
  video_id: string | null;
  video_title: string | null;
  due_date: string | null;
  note: string | null;
  status: string;
  created_at: string;
  // Joined from youtube_videos
  db_video_id?: string;
  thumbnail_url?: string;
  difficulty_level?: string;
  duration?: number;
  youtube_video_id?: string;
}

function getDueDateInfo(dueDate: string | null, status: string) {
  if (!dueDate || status === "completed") return null;
  const date = new Date(dueDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isPast(date) && !isToday(date)) {
    return { label: "Overdue", color: "text-destructive", bgColor: "bg-destructive/10 text-destructive border-destructive/20", isOverdue: true };
  }
  if (isToday(date)) {
    return { label: "Due Today", color: "text-orange-600", bgColor: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800", isOverdue: false };
  }
  if (isBefore(date, addDays(today, 3))) {
    return { label: `Due ${format(date, "MMM d")}`, color: "text-yellow-600", bgColor: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800", isOverdue: false };
  }
  return { label: `Due ${format(date, "MMM d")}`, color: "text-muted-foreground", bgColor: "bg-muted text-muted-foreground", isOverdue: false };
}

function getCtaInfo(status: string) {
  switch (status) {
    case "in_progress":
      return { label: "Continue", icon: Play };
    case "completed":
      return { label: "Review", icon: RotateCw };
    default:
      return { label: "Start Lesson", icon: Play };
  }
}

export default function AssignmentVideoCard({ assignment }: { assignment: AssignmentWithVideo }) {
  const navigate = useNavigate();
  const dueDateInfo = getDueDateInfo(assignment.due_date, assignment.status);
  const cta = getCtaInfo(assignment.status);
  const CtaIcon = cta.icon;

  const thumbnailUrl = assignment.thumbnail_url
    || (assignment.youtube_video_id ? `https://img.youtube.com/vi/${assignment.youtube_video_id}/mqdefault.jpg` : null);

  const handleClick = () => {
    const targetId = assignment.db_video_id || assignment.video_id;
    if (!targetId) return;
    trackEvent("assignment_started", {
      assignment_id: assignment.id,
      video_id: targetId,
      is_overdue: dueDateInfo?.isOverdue || false,
    });
    navigate(`/lesson/${targetId}?assignment=true`);
  };

  return (
    <Card className={`overflow-hidden border transition-colors hover:border-primary/50 ${dueDateInfo?.isOverdue ? "border-destructive/50 bg-destructive/5" : "border-border"}`}>
      <CardContent className="p-0">
        {/* Thumbnail */}
        {thumbnailUrl && (
          <div className="relative aspect-video w-full bg-muted">
            <img
              src={thumbnailUrl}
              alt={assignment.video_title || "Video thumbnail"}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {assignment.difficulty_level && (
              <Badge className="absolute top-2 left-2 text-[10px]" variant="secondary">
                {assignment.difficulty_level}
              </Badge>
            )}
            {assignment.status === "completed" && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                <Badge variant="outline" className="bg-background">✅ Completed</Badge>
              </div>
            )}
          </div>
        )}

        <div className="p-3 space-y-2">
          <p className="font-medium text-sm text-foreground line-clamp-2">{assignment.video_title || "Untitled Video"}</p>

          {/* Due date badge */}
          {dueDateInfo && (
            <Badge variant="outline" className={`text-[10px] ${dueDateInfo.bgColor}`}>
              {dueDateInfo.isOverdue && <AlertTriangle className="w-3 h-3 mr-1" />}
              <CalendarDays className="w-3 h-3 mr-1" />
              {dueDateInfo.label}
            </Badge>
          )}

          {/* Teacher note */}
          {assignment.note && (
            <p className="text-xs text-muted-foreground line-clamp-2 italic">"{assignment.note}"</p>
          )}

          <Button size="sm" className="w-full text-xs" onClick={handleClick} variant={assignment.status === "completed" ? "outline" : "default"}>
            <CtaIcon className="w-3.5 h-3.5 mr-1.5" />
            {cta.label}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
