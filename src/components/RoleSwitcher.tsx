import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Users, ArrowRight, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export function RoleSwitcher() {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);

  const handleUpgradeToTeacher = async () => {
    if (!user) return;
    setSwitching(true);
    try {
      const { error } = await supabase
        .from("user_roles" as any)
        .update({ role: "teacher" } as any)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("You're now a teacher! Redirecting to your dashboard...");
      setTimeout(() => navigate("/teacher"), 1500);
    } catch (err) {
      toast.error("Failed to switch role. Please try again.");
    } finally {
      setSwitching(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="flex items-center gap-3 py-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading role...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        {role === "teacher" ? (
          <Users className="h-4 w-4 text-primary" />
        ) : (
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
        )}
        <span>Role</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={role === "teacher" ? "default" : "secondary"}>
          {role === "teacher" ? "Teacher" : "Student"}
        </Badge>
        {role === "student" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1" disabled={switching}>
                {switching ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
                Upgrade to Teacher
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Upgrade to Teacher</AlertDialogTitle>
                <AlertDialogDescription>
                  Switching to teacher will give you access to create lessons and manage students. 
                  All your student data (flashcards, progress, streak) will be preserved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleUpgradeToTeacher} disabled={switching}>
                  {switching ? "Switching..." : "Confirm Upgrade"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
