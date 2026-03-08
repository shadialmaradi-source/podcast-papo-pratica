import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { trackEvent } from "@/lib/analytics";
import AssignmentVideoCard, { type AssignmentWithVideo } from "./AssignmentVideoCard";

export default function AssignedVideosSection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<AssignmentWithVideo[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.email) fetchAssignments();
  }, [user?.email]);

  const fetchAssignments = async () => {
    if (!user?.email) return;
    try {
      // Fetch non-completed video assignments
      const { data: rawAssignments, count } = await supabase
        .from("video_assignments" as any)
        .select("id, video_id, video_title, due_date, note, status, created_at", { count: "exact" })
        .eq("student_email", user.email)
        .eq("assignment_type", "video")
        .neq("status", "completed")
        .order("due_date", { ascending: true, nullsFirst: false });

      if (!rawAssignments || rawAssignments.length === 0) {
        setAssignments([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      setTotalCount(count || rawAssignments.length);

      // Enrich with youtube_videos metadata
      const videoIds = (rawAssignments as any[]).map((a: any) => a.video_id).filter(Boolean);
      let videoMap: Record<string, any> = {};

      if (videoIds.length > 0) {
        // video_id in video_assignments is the youtube video_id string
        const { data: videos } = await supabase
          .from("youtube_videos")
          .select("id, video_id, thumbnail_url, difficulty_level, duration")
          .in("video_id", videoIds);

        if (videos) {
          for (const v of videos) {
            videoMap[v.video_id] = v;
          }
        }
      }

      const enriched: AssignmentWithVideo[] = (rawAssignments as any[]).map((a: any) => {
        const vid = videoMap[a.video_id];
        return {
          ...a,
          db_video_id: vid?.id || undefined,
          thumbnail_url: vid?.thumbnail_url || undefined,
          difficulty_level: vid?.difficulty_level || undefined,
          duration: vid?.duration || undefined,
          youtube_video_id: a.video_id,
        };
      });

      // Sort: overdue first, then by due date, then no due date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      enriched.sort((a, b) => {
        const aDate = a.due_date ? new Date(a.due_date + "T00:00:00") : null;
        const bDate = b.due_date ? new Date(b.due_date + "T00:00:00") : null;
        const aOverdue = aDate && aDate < today ? 0 : aDate ? 1 : 2;
        const bOverdue = bDate && bDate < today ? 0 : bDate ? 1 : 2;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        if (aDate && bDate) return aDate.getTime() - bDate.getTime();
        if (aDate) return -1;
        if (bDate) return 1;
        return 0;
      });

      setAssignments(enriched);
      trackEvent("assignment_viewed", { count: enriched.length });
    } catch (err) {
      console.error("Error fetching assignments:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || assignments.length === 0) return null;

  const displayed = assignments.slice(0, 3);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Assigned by Your Teacher ({totalCount})
          </h3>
        </div>
        {totalCount > 3 && (
          <Button
            variant="link"
            size="sm"
            onClick={() => navigate("/my-assignments")}
            className="text-xs text-primary p-0 h-auto gap-1"
          >
            See All <ChevronRight className="w-3 h-3" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {displayed.map((a) => (
          <AssignmentVideoCard key={a.id} assignment={a} />
        ))}
      </div>

      {totalCount > 0 && totalCount <= 3 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/my-assignments")}
          className="w-full text-xs text-muted-foreground"
        >
          View all assignments
        </Button>
      )}
    </div>
  );
}
