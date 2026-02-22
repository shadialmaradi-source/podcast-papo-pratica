import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { WeekCard } from "./WeekCard";
import {
  fetchWeeksForLevel,
  getEffectiveWeekState,
  type WeekWithProgress,
} from "@/services/learningPathService";
import { useAuth } from "@/hooks/useAuth";

interface LearningPathProps {
  level: "beginner" | "intermediate" | "advanced";
  language: string;
}

const levelConfig = {
  beginner: { label: "Beginner Path", cefr: "A1-A2", icon: "📚" },
  intermediate: { label: "Intermediate Path", cefr: "B1", icon: "📖" },
  advanced: { label: "Advanced Path", cefr: "B2", icon: "🎓" },
};

export function LearningPath({ level, language }: LearningPathProps) {
  const { user } = useAuth();
  const [weeks, setWeeks] = useState<WeekWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const config = levelConfig[level];

  useEffect(() => {
    loadWeeks();
  }, [level, language, user]);

  const loadWeeks = async () => {
    setLoading(true);
    try {
      const data = await fetchWeeksForLevel(level, language, user?.id);
      setWeeks(data);
    } catch (error) {
      console.error("Error loading learning path:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate overall progress
  const totalVideos = weeks.reduce((sum, w) => sum + w.total_videos, 0);
  const completedVideos = weeks.reduce(
    (sum, w) => sum + (w.progress?.videos_completed || 0),
    0
  );
  const progressPercent = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (weeks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground font-medium">
          Coming soon!
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          The {config.label} is being prepared. Check back later.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Path Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-card border p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{config.icon}</span>
            <div>
              <h2 className="font-semibold text-foreground">
                {config.label} ({config.cefr})
              </h2>
              <p className="text-sm text-muted-foreground">
                {completedVideos}/{totalVideos} videos completed
              </p>
            </div>
          </div>
          <span className="text-sm font-medium text-primary">
            {progressPercent}%
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </motion.div>

      {/* Week Cards */}
      <div className="space-y-3">
        {weeks.map((week, index) => {
          const state = getEffectiveWeekState(week, weeks);
          return (
            <motion.div
              key={week.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <WeekCard week={week} state={state} />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
