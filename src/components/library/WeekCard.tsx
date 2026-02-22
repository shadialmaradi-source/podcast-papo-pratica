import { useNavigate } from "react-router-dom";
import { CheckCircle2, PlayCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { WeekWithProgress } from "@/services/learningPathService";

interface WeekCardProps {
  week: WeekWithProgress;
  state: "completed" | "in_progress";
  previousWeekNumber?: number;
}

export function WeekCard({ week, state }: WeekCardProps) {
  const navigate = useNavigate();

  const videosCompleted = week.progress?.videos_completed || 0;
  const progressPercent =
    week.total_videos > 0
      ? Math.round((videosCompleted / week.total_videos) * 100)
      : 0;

  const handleClick = () => {
    navigate(`/learn/week/${week.id}`);
  };

  return (
    <Card
      onClick={handleClick}
      className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200"
    >
      <CardContent className="p-4 flex items-center gap-4">
        {/* Status Icon */}
        <div
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 text-primary",
          )}
        >
          {state === "completed" ? <CheckCircle2 className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Week {week.week_number}
            </span>
          </div>
          <h3 className="font-semibold text-foreground truncate">
            {week.title}
          </h3>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {videosCompleted}/{week.total_videos} videos
                {week.xp_earned > 0 && ` • ${week.xp_earned} XP`}
              </span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        </div>

        {/* Action hint */}
        <span className="text-xs font-medium text-primary flex-shrink-0">
          {state === "completed" ? "View" : "Continue"} →
        </span>
      </CardContent>
    </Card>
  );
}
