import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { trackPageView } from "@/lib/analytics";
import AssignmentVideoCard, { type AssignmentWithVideo } from "@/components/AssignmentVideoCard";

export default function MyAssignments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<AssignmentWithVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("active");

  useEffect(() => {
    trackPageView("my_assignments", "student");
    if (user?.email) fetchAll();
  }, [user?.email]);

  const fetchAll = async () => {
    if (!user?.email) return;
    try {
      const { data: raw } = await supabase
        .from("video_assignments" as any)
        .select("id, video_id, video_title, due_date, note, status, created_at")
        .eq("student_email", user.email)
        .eq("assignment_type", "video")
        .order("created_at", { ascending: false });

      if (!raw || raw.length === 0) { setAssignments([]); setLoading(false); return; }

      const videoIds = (raw as any[]).map((a: any) => a.video_id).filter(Boolean);
      let videoMap: Record<string, any> = {};
      if (videoIds.length > 0) {
        const { data: videos } = await supabase
          .from("youtube_videos")
          .select("id, video_id, thumbnail_url, difficulty_level, duration")
          .in("video_id", videoIds);
        if (videos) for (const v of videos) videoMap[v.video_id] = v;
      }

      setAssignments((raw as any[]).map((a: any) => {
        const vid = videoMap[a.video_id];
        return { ...a, db_video_id: vid?.id, thumbnail_url: vid?.thumbnail_url, difficulty_level: vid?.difficulty_level, duration: vid?.duration, youtube_video_id: a.video_id };
      }));
    } catch (err) {
      console.error("Error fetching assignments:", err);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const active = assignments.filter((a) => a.status !== "completed");
  const overdue = active.filter((a) => a.due_date && new Date(a.due_date + "T00:00:00") < today);
  const upcoming = active.filter((a) => a.due_date && new Date(a.due_date + "T00:00:00") >= today);
  const completed = assignments.filter((a) => a.status === "completed");

  const getFiltered = () => {
    switch (tab) {
      case "overdue": return overdue;
      case "upcoming": return upcoming;
      case "completed": return completed;
      default: return active;
    }
  };

  const filtered = getFiltered();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="My Assignments" />
      <main className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/app")} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="active">All ({active.length})</TabsTrigger>
            <TabsTrigger value="overdue">Overdue ({overdue.length})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="completed">Done ({completed.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No assignments in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((a) => (
              <AssignmentVideoCard key={a.id} assignment={a} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
