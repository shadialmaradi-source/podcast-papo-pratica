import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Bell, CheckCheck, CheckCircle2 } from "lucide-react";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  student_email: string | null;
  video_id: string | null;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const PAGE_SIZE = 20;

export default function TeacherNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "completed">("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("teacher_notifications" as any)
      .select("*")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    if (filter === "unread") query = query.eq("read", false);
    if (filter === "completed") query = query.eq("type", "assignment_completed");

    const { data } = await query;
    const items = (data ?? []) as unknown as Notification[];
    setNotifications(items.slice(0, PAGE_SIZE));
    setHasMore(items.length > PAGE_SIZE);
    setLoading(false);
  }, [user, filter, page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    await supabase
      .from("teacher_notifications" as any)
      .update({ read: true } as any)
      .eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("teacher_notifications" as any)
      .update({ read: true } as any)
      .eq("teacher_id", user.id)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClick = async (n: Notification) => {
    if (!n.read) await markAsRead(n.id);
    // Navigate to students page (could go to student detail if we resolve student_email to ID)
    navigate("/teacher/students");
  };

  const typeIcon = (type: string) => {
    if (type === "assignment_completed") return <CheckCircle2 className="h-4 w-4 text-primary" />;
    return <Bell className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/teacher")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Bell className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Notifications</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <Tabs value={filter} onValueChange={(v) => { setFilter(v as any); setPage(0); }}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="ghost" size="sm" className="text-xs" onClick={markAllRead}>
            <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {filter === "unread"
                ? "No unread notifications"
                : "No notifications yet. When students complete assignments, you'll see them here."}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
                  !n.read && "bg-primary/5"
                )}
                onClick={() => handleClick(n)}
              >
                <div className="mt-0.5 shrink-0">{typeIcon(n.type)}</div>
                <div className={cn(
                  "mt-0.5 h-2 w-2 rounded-full shrink-0",
                  n.read ? "bg-transparent" : "bg-primary"
                )} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm", !n.read && "font-medium")}>{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {(page > 0 || hasMore) && (
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </main>
      <TeacherNav />
    </div>
  );
}
