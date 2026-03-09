import { supabase } from "@/integrations/supabase/client";

export interface TeacherQuota {
  lessonsUsed: number;
  lessonsLimit: number;
  maxVideoMinutes: number;
  canCreateLesson: boolean;
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
}

const PLAN_LIMITS: Record<string, { lessons: number; videoMinutes: number }> = {
  free: { lessons: 10, videoMinutes: 5 },
  trial: { lessons: 60, videoMinutes: 10 },
  pro: { lessons: 60, videoMinutes: 10 },
  premium: { lessons: 160, videoMinutes: 15 },
};

export async function fetchTeacherQuota(teacherId: string): Promise<TeacherQuota> {
  // Get subscription plan and status
  const { data: sub } = await supabase
    .from("teacher_subscriptions" as any)
    .select("plan, status, current_period_end")
    .eq("teacher_id", teacherId)
    .maybeSingle();

  const plan = (sub as any)?.plan || "free";
  const status = (sub as any)?.status || "active";
  const currentPeriodEnd = (sub as any)?.current_period_end || null;
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  // Count lessons created this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count } = await supabase
    .from("teacher_lessons")
    .select("*", { count: "exact", head: true })
    .eq("teacher_id", teacherId)
    .gte("created_at", startOfMonth);

  const lessonsUsed = count ?? 0;

  // Block lesson creation if past_due
  const canCreateLesson = status !== "past_due" && lessonsUsed < limits.lessons;

  return {
    lessonsUsed,
    lessonsLimit: limits.lessons,
    maxVideoMinutes: limits.videoMinutes,
    canCreateLesson,
    plan,
    status,
    currentPeriodEnd,
  };
}

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}
