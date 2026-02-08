import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  PlayCircle,
  Lock,
  Clock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchWeekById,
  fetchWeekVideos,
  formatDuration,
  type LearningWeek,
  type WeekVideoWithProgress,
} from "@/services/learningPathService";

export default function WeekDetail() {
  const { weekId } = useParams<{ weekId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [week, setWeek] = useState<LearningWeek | null>(null);
  const [videos, setVideos] = useState<WeekVideoWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!weekId) return;
    loadData();
  }, [weekId, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [weekData, videosData] = await Promise.all([
        fetchWeekById(weekId!),
        fetchWeekVideos(weekId!, user?.id),
      ]);
      setWeek(weekData);
      setVideos(videosData);
    } catch (error) {
      console.error("Error loading week detail:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!week) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Week not found.</p>
        <Button variant="outline" onClick={() => navigate("/library")}>
          Back to Library
        </Button>
      </div>
    );
  }

  const completedCount = videos.filter(
    (v) => v.progress?.status === "completed"
  ).length;
  const totalXp = videos.reduce(
    (sum, v) => sum + (v.progress?.xp_earned || 0),
    0
  );
  const progressPercent =
    videos.length > 0 ? Math.round((completedCount / videos.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/library")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Week {week.week_number}
            </h1>
            <p className="text-xs text-muted-foreground">Back to Library</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Week Info */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div>
            <h2 className="text-xl font-bold text-foreground">{week.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {week.description}
            </p>
          </div>

          {/* Progress Summary */}
          <div className="rounded-xl bg-card border p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {completedCount}/{videos.length} videos • {totalXp} XP
              </span>
              <span className="font-medium text-primary">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </motion.div>

        {/* Video List */}
        <div className="space-y-3">
          {videos.map((video, index) => {
            const isCompleted = video.progress?.status === "completed";
            const isLocked = !video.is_unlocked;
            const isCurrent = !isCompleted && video.is_unlocked;

            return (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <Card
                  onClick={() => {
                    if (isLocked) return;
                    navigate(`/learn/video/${video.id}`);
                  }}
                  className={cn(
                    "transition-all duration-200",
                    isLocked
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer hover:shadow-md hover:border-primary/30",
                    isCurrent && "border-primary/40 shadow-sm"
                  )}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    {/* Status Icon */}
                    <div
                      className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mt-0.5",
                        isCompleted && "bg-primary/10 text-primary",
                        isCurrent && "bg-primary text-primary-foreground",
                        isLocked && "bg-muted text-muted-foreground"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isLocked ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <PlayCircle className="w-4 h-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <h3
                        className={cn(
                          "font-medium text-sm",
                          isLocked
                            ? "text-muted-foreground"
                            : "text-foreground"
                        )}
                      >
                        {video.order_in_week}. {video.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{video.source}</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {formatDuration(video.duration_seconds)}
                        </span>
                      </div>

                      {video.grammar_focus && !isLocked && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {video.grammar_focus}
                        </Badge>
                      )}

                      {isCompleted && (
                        <p className="text-xs text-primary font-medium">
                          Completed • {video.progress?.xp_earned || video.xp_reward} XP earned
                        </p>
                      )}

                      {isLocked && (
                        <p className="text-xs text-muted-foreground">
                          Complete previous video to unlock
                        </p>
                      )}
                    </div>

                    {/* Action */}
                    {!isLocked && (
                      <span className="text-xs font-medium text-primary flex-shrink-0 mt-1">
                        {isCompleted ? "Watch Again" : "Start →"}
                      </span>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
