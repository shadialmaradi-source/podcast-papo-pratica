import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  Loader2,
  Trophy,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  completeVideo,
  formatDuration,
  type WeekVideoRow,
  type VideoProgress,
  type LearningWeek,
} from "@/services/learningPathService";

interface WeekVideoData extends WeekVideoRow {
  learning_weeks: LearningWeek;
}

export default function WeekVideo() {
  const { weekVideoId } = useParams<{ weekVideoId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [video, setVideo] = useState<WeekVideoData | null>(null);
  const [progress, setProgress] = useState<VideoProgress | null>(null);
  const [totalInWeek, setTotalInWeek] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    if (!weekVideoId) return;
    loadData();
  }, [weekVideoId, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch video with its week info
      const { data: videoData, error: videoError } = await supabase
        .from("week_videos")
        .select("*, learning_weeks(*)")
        .eq("id", weekVideoId!)
        .single();

      if (videoError || !videoData) throw videoError || new Error("Video not found");

      setVideo(videoData as unknown as WeekVideoData);

      // Fetch total videos in week
      const { count } = await supabase
        .from("week_videos")
        .select("id", { count: "exact", head: true })
        .eq("week_id", videoData.week_id);

      setTotalInWeek(count || 0);

      // Fetch user progress
      if (user) {
        const { data: prog } = await supabase
          .from("user_video_progress")
          .select("*")
          .eq("user_id", user.id)
          .eq("week_video_id", weekVideoId!)
          .maybeSingle();

        setProgress(prog as VideoProgress | null);
      }
    } catch (error) {
      console.error("Error loading video:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!user || !weekVideoId || !video) return;

    setCompleting(true);
    try {
      const result = await completeVideo(user.id, weekVideoId);

      setJustCompleted(true);
      setProgress({
        id: "",
        user_id: user.id,
        week_video_id: weekVideoId,
        status: "completed",
        completed_at: new Date().toISOString(),
        xp_earned: result.xpEarned,
      });

      toast({
        title: `+${result.xpEarned} XP earned! 🎉`,
        description: result.weekCompleted
          ? `Week completed! Next week is now unlocked! 🔓`
          : `Video marked as complete.`,
      });

      // If week completed, navigate back after a moment
      if (result.weekCompleted) {
        setTimeout(() => {
          navigate(`/learn/week/${video.week_id}`);
        }, 2500);
      }
    } catch (error) {
      console.error("Error completing video:", error);
      toast({
        title: "Error",
        description: "Failed to mark video as complete. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Video not found.</p>
        <Button variant="outline" onClick={() => navigate("/library")}>
          Back to Library
        </Button>
      </div>
    );
  }

  const week = video.learning_weeks;
  const isCompleted = progress?.status === "completed";
  const vocabTags = video.vocabulary_tags || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/learn/week/${video.week_id}`)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">
              Week {week.week_number}: {week.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              Video {video.order_in_week} of {totalInWeek}
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-2xl">
        {/* Video Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xl font-bold text-foreground">{video.title}</h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>{video.source}</span>
            <span>•</span>
            <span>{formatDuration(video.duration_seconds)}</span>
          </div>
          {video.grammar_focus && (
            <Badge variant="secondary" className="mt-2">
              <BookOpen className="w-3 h-3 mr-1" />
              {video.grammar_focus}
            </Badge>
          )}
        </motion.div>

        {/* YouTube Embed */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative aspect-video rounded-xl overflow-hidden bg-muted border shadow-sm"
        >
          <iframe
            src={`https://www.youtube.com/embed/${video.youtube_id}?rel=0&modestbranding=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </motion.div>

        {/* Key Vocabulary */}
        {vocabTags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  📝 Key Vocabulary
                </h3>
                <div className="flex flex-wrap gap-2">
                  {vocabTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs font-normal"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Completion Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="pb-8"
        >
          {isCompleted || justCompleted ? (
            <Card className={cn("border-primary/30", justCompleted && "celebration")}>
              <CardContent className="p-5 text-center space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                  {justCompleted ? (
                    <Sparkles className="w-6 h-6 text-primary" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {justCompleted ? "Well done!" : "Already completed"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {progress?.xp_earned || video.xp_reward} XP earned
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/learn/week/${video.week_id}`)}
                >
                  Back to Week {week.week_number}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Button
              className="w-full h-14 text-base font-semibold gap-2"
              variant="learning"
              onClick={handleComplete}
              disabled={completing || !user}
            >
              {completing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <Trophy className="w-5 h-5" />
                  Mark as Complete • {video.xp_reward} XP
                </>
              )}
            </Button>
          )}
        </motion.div>
      </main>
    </div>
  );
}
