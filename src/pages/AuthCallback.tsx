import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent, trackTeacherFunnelStep } from "@/lib/analytics";
import { ensureTeacherTrialSubscription } from "@/services/teacherSubscriptionService";
import { Loader2 } from "lucide-react";
import { clearPendingLessonRedirect, getPendingLessonRedirect } from "@/utils/authRedirect";
import { getPostOnboardingStudentDestination, requiresStudentOnboarding } from "@/utils/studentOnboarding";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Check for error in URL hash/query
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParams = new URLSearchParams(window.location.search);

      const errorCode = hashParams.get("error_code") || queryParams.get("error_code");
      const errorDescription = hashParams.get("error_description") || queryParams.get("error_description");

      if (errorCode) {
        setError(errorDescription?.replace(/\+/g, " ") || "Authentication failed");
        setTimeout(() => navigate("/auth"), 3000);
        return;
      }

      // Check for recovery flow
      if (hashParams.get("type") === "recovery") {
        navigate("/reset-password" + window.location.hash, { replace: true });
        return;
      }

      // Handle OAuth token flow
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setError(error.message);
          setTimeout(() => navigate("/auth"), 3000);
          return;
        }
        await redirectBasedOnRole();
        return;
      }

      // Handle PKCE flow
      const code = queryParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError(error.message);
          setTimeout(() => navigate("/auth"), 3000);
          return;
        }
        await redirectBasedOnRole();
        return;
      }

      // Check existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await redirectBasedOnRole();
        return;
      }

      navigate("/auth", { replace: true });
    };

    const redirectBasedOnRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth", { replace: true }); return; }

      // Get role from query param (OAuth redirect) or user metadata
      const roleParam = searchParams.get("role");
      const metadataRole = user.user_metadata?.role;

      // Determine the user's actual role from DB
      const { data: roleData } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const dbRole = (roleData as any)?.role || null;

      // For new OAuth signups: if role param says teacher but DB says student (default), upgrade
      const isNewUser = new Date(user.created_at).getTime() > Date.now() - 30000;
      const intendedRole = roleParam || metadataRole || dbRole || "student";

      if (isNewUser && intendedRole === "teacher" && dbRole !== "teacher") {
        // Update role to teacher
        await supabase
          .from("user_roles" as any)
          .update({ role: "teacher" } as any)
          .eq("user_id", user.id);

        // Update user metadata
        await supabase.auth.updateUser({ data: { role: "teacher" } });

        const { error: trialError } = await ensureTeacherTrialSubscription(user.id);
        if (!trialError) {
          trackEvent("trial_started", {
            teacher_id: user.id,
            plan_selected: "trial",
            signup_method: "oauth",
          });
        }

        trackEvent("user_signup", { method: "oauth", role: "teacher" });
        trackTeacherFunnelStep("signup_completed", {
          method: "oauth",
          source: "auth_callback",
        });
        navigate("/teacher/onboarding", { replace: true });
        return;
      }

      if (isNewUser && intendedRole === "student") {
        trackEvent("user_signup", { method: "oauth", role: "student" });
      }

      // Determine actual role for redirect.
      // Existing users should follow DB role, not URL role param from the login entry point.
      const actualRole = dbRole || intendedRole;

      // Check for pending lesson token
      const lessonRedirect = getPendingLessonRedirect();

      if (actualRole === "teacher") {
        const { data: tp } = await supabase
          .from("teacher_profiles" as any)
          .select("onboarding_completed")
          .eq("teacher_id", user.id)
          .maybeSingle();

        navigate((!tp || !(tp as any).onboarding_completed) ? "/teacher/onboarding" : "/teacher", { replace: true });
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("native_language, selected_language, current_level, total_xp, current_streak, longest_streak")
          .eq("user_id", user.id)
          .single();

        if (requiresStudentOnboarding(profile)) {
          navigate(lessonRedirect ? `/onboarding?return=${encodeURIComponent(lessonRedirect)}` : "/onboarding", { replace: true });
        } else if (lessonRedirect) {
          navigate(lessonRedirect, { replace: true });
        } else if (getPostOnboardingStudentDestination(profile, localStorage.getItem('first_lesson_completed')) === "/lesson/first") {
          clearPendingLessonRedirect();
          navigate("/lesson/first", { replace: true });
        } else {
          clearPendingLessonRedirect();
          navigate("/app", { replace: true });
        }
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <div className="text-destructive text-center">
          <p className="text-lg font-medium">Authentication Error</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
          <p className="text-xs text-muted-foreground mt-4">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Completing authentication...</p>
    </div>
  );
}
