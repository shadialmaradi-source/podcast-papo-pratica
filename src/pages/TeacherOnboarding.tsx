import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { trackPageView } from "@/lib/analytics";
import { QuickStartOnboarding } from "@/components/teacher/QuickStartOnboarding";

export default function TeacherOnboarding() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Check if already completed onboarding
  useEffect(() => {
    if (authLoading || !user) return;
    supabase
      .from("teacher_profiles" as any)
      .select("onboarding_completed")
      .eq("teacher_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && (data as any).onboarding_completed) {
          navigate("/teacher", { replace: true });
        }
      });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    trackPageView("teacher_onboarding", "teacher");
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return <QuickStartOnboarding />;
}
