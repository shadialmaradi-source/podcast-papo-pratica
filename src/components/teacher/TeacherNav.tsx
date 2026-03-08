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
                "flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
