import { supabase } from "@/integrations/supabase/client";

export interface TeacherQuota {
  lessonsUsed: number;
  lessonsLimit: number;
  maxVideoMinutes: number;
  canCreateLesson: boolean;
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  isTrialing: boolean;
  trialDaysRemaining: number;
  trialExpired: boolean;
  emailVerified: boolean;
}

const PLAN_LIMITS: Record<string, { lessons: number; videoMinutes: number }> = {
  free: { lessons: 10, videoMinutes: 5 },
  trial: { lessons: 30, videoMinutes: 10 },
  pro: { lessons: 30, videoMinutes: 10 },
  premium: { lessons: 100, videoMinutes: 15 },
};

export async function fetchTeacherQuota(teacherId: string): Promise<TeacherQuota> {
  // Get subscription plan, status, and trial fields
  const { data: sub } = await supabase
    .from("teacher_subscriptions" as any)
    .select("plan, status, current_period_end, trial_started_at, trial_ends_at, trial_used")
    .eq("teacher_id", teacherId)
    .maybeSingle();

  const plan = (sub as any)?.plan || "free";
  const status = (sub as any)?.status || "active";
  const currentPeriodEnd = (sub as any)?.current_period_end || null;
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  // Calculate trial status
  const isTrialing = plan === "trial" && status === "trialing";
  let trialDaysRemaining = 0;
  let trialExpired = false;

  if (isTrialing && (sub as any)?.trial_ends_at) {
    const trialEnd = new Date((sub as any).trial_ends_at);
    const now = new Date();
    trialDaysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (trialDaysRemaining <= 0) {
      trialDaysRemaining = 0;
      trialExpired = true;
    }
  } else if (plan === "trial") {
    trialExpired = true;
  }

  // Check email verification
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const emailVerified = !!authUser?.email_confirmed_at;

  // Count lessons created this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count } = await supabase
    .from("teacher_lessons")
    .select("*", { count: "exact", head: true })
    .eq("teacher_id", teacherId)
    .gte("created_at", startOfMonth);

  const lessonsUsed = count ?? 0;

  // Block lesson creation if past_due, trial expired, email not verified, or limit reached
  const canCreateLesson = emailVerified && status !== "past_due" && !trialExpired && lessonsUsed < limits.lessons;

  return {
    lessonsUsed,
    lessonsLimit: limits.lessons,
    maxVideoMinutes: limits.videoMinutes,
    canCreateLesson,
    plan,
    status,
    currentPeriodEnd,
    isTrialing,
    trialDaysRemaining,
    trialExpired,
    emailVerified,
  };
}

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}
