import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { BookOpen, LogOut, Plus, X } from "lucide-react";
import { CreateLessonForm } from "@/components/teacher/CreateLessonForm";
import { LessonList } from "@/components/teacher/LessonList";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

export default function TeacherDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [showForm, setShowForm] = useState(false);
  const [refresh, setRefresh] = useState(0);

  // Auto-correct: if user is on teacher dashboard but has student role,
  // they selected teacher during signup but the insert failed silently
  useEffect(() => {
    if (!roleLoading && role === "student" && user?.id) {
      supabase
        .from("user_roles" as any)
        .upsert({ user_id: user.id, role: "teacher" } as any, { onConflict: "user_id" })
        .then(() => {
          // Role corrected — reload to pick up new role
          window.location.reload();
        });
    }
  }, [role, roleLoading, user?.id]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleCreated = () => {
    setShowForm(false);
    setRefresh((r) => r + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Teacher Dashboard</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            Welcome, {user?.email?.split("@")[0]}!
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage your interactive lessons from here.
          </p>
        </div>

        {/* Create Lesson Card */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {showForm ? "New Lesson" : "Your Lessons"}
              </CardTitle>
              {!showForm ? (
                <Button size="sm" onClick={() => setShowForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Lesson
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>

          {showForm && (
            <>
              <Separator />
              <CardContent className="pt-5">
                <CreateLessonForm
                  onCreated={handleCreated}
                  onCancel={() => setShowForm(false)}
                />
              </CardContent>
            </>
          )}
        </Card>

        {/* Lesson List */}
        {!showForm && <LessonList refresh={refresh} />}
      </main>
    </div>
  );
}
