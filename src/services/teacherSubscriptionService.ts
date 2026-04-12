import { supabase } from "@/integrations/supabase/client";

export async function ensureTeacherTrialSubscription(teacherId: string) {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const { error } = await supabase
    .from("teacher_subscriptions" as any)
    .upsert({
      teacher_id: teacherId,
      plan: "trial",
      status: "trialing",
      trial_started_at: new Date().toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      trial_used: true,
    } as any, { onConflict: "teacher_id", ignoreDuplicates: true });

  return { error };
}
