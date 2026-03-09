import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TeacherTrialStatus {
  isTrialing: boolean;
  daysRemaining: number;
  trialExpired: boolean;
  emailVerified: boolean;
  canCreateLessons: boolean;
  plan: string;
}

export function useTeacherTrial() {
  const { user } = useAuth();
  const [trialStatus, setTrialStatus] = useState<TeacherTrialStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get fresh user data for email_confirmed_at
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      const emailVerified = !!freshUser?.email_confirmed_at;

      // Get subscription
      const { data: sub } = await supabase
        .from("teacher_subscriptions" as any)
        .select("plan, status, trial_started_at, trial_ends_at, trial_used")
        .eq("teacher_id", user.id)
        .maybeSingle();

      const plan = (sub as any)?.plan || "free";
      const isTrialing = plan === "trial" && (sub as any)?.status === "trialing";

      let daysRemaining = 0;
      let trialExpired = false;

      if (isTrialing && (sub as any)?.trial_ends_at) {
        const trialEnd = new Date((sub as any).trial_ends_at);
        const now = new Date();
        daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 0) {
          daysRemaining = 0;
          trialExpired = true;
        }
      } else if (plan === "trial") {
        trialExpired = true;
      }

      const canCreateLessons = emailVerified && !trialExpired && (
        isTrialing || ["pro", "premium"].includes(plan)
      );

      setTrialStatus({
        isTrialing,
        daysRemaining,
        trialExpired,
        emailVerified,
        canCreateLessons,
        plan,
      });
    } catch (err) {
      console.error("Failed to fetch trial status:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { trialStatus, loading, refresh };
}
