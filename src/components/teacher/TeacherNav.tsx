import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BookOpen, Users, Settings, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { path: "/teacher", label: "Dashboard", icon: BookOpen },
  { path: "/teacher/students", label: "Students", icon: Users },
  { path: "/teacher/notifications", label: "Alerts", icon: Bell, hasBadge: true },
  { path: "/teacher/settings", label: "Settings", icon: Settings },
];

export function TeacherNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      const { count } = await supabase
        .from("teacher_notifications" as any)
        .select("*", { count: "exact", head: true })
        .eq("teacher_id", user.id)
        .eq("read", false);
      setUnreadCount(count ?? 0);
    };
    fetchCount();

    const channel = supabase
      .channel("teacher_nav_notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teacher_notifications", filter: `teacher_id=eq.${user.id}` },
        () => { fetchCount(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto flex items-center justify-around px-4 py-2 max-w-lg">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.hasBadge && unreadCount > 0 && (
                  <Badge className="absolute -top-1.5 -right-2.5 h-4 min-w-4 px-1 text-[9px] flex items-center justify-center bg-destructive text-destructive-foreground border-0">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
