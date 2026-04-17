import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
    const resend = new Resend(RESEND_API_KEY);

    const { teacher_id, student_email, student_name, assignment_title, assignment_type } = await req.json();

    if (!teacher_id) throw new Error("teacher_id is required");

    // Get teacher email from auth.users
    const { data: teacherAuth } = await supabase.auth.admin.getUserById(teacher_id);
    const teacherEmail = teacherAuth?.user?.email;
    if (!teacherEmail) {
      console.log("[notify-teacher-email] No email found for teacher:", teacher_id);
      return new Response(JSON.stringify({ success: false, reason: "no_teacher_email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check teacher notification preferences
    const { data: profile } = await supabase
      .from("teacher_profiles")
      .select("notification_preferences, full_name")
      .eq("teacher_id", teacher_id)
      .maybeSingle();

    const prefs = (profile?.notification_preferences as any) || {};
    if (prefs.email_enabled === false || prefs.email_on_completed === false) {
      console.log("[notify-teacher-email] Email notifications disabled for teacher:", teacher_id);
      return new Response(JSON.stringify({ success: false, reason: "notifications_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const displayName = student_name || student_email || "A student";
    const title = assignment_title || "an assignment";
    const type = assignment_type === "speaking" ? "speaking assignment" : "lesson";
    const teacherName = profile?.full_name || "Teacher";

    const subject = `✅ ${displayName} completed "${title}"`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:#10b981;color:white;width:48px;height:48px;border-radius:50%;line-height:48px;font-size:24px;">✓</div>
    </div>
    <h1 style="font-size:22px;color:#111827;text-align:center;margin:0 0 8px;">Assignment Completed!</h1>
    <p style="font-size:16px;color:#6b7280;text-align:center;margin:0 0 32px;">Hi ${teacherName},</p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:32px;">
      <p style="margin:0 0 12px;font-size:15px;color:#374151;">
        <strong>${displayName}</strong> has completed the ${type}:
      </p>
      <p style="margin:0;font-size:18px;font-weight:600;color:#111827;">"${title}"</p>
    </div>
    <div style="text-align:center;">
      <a href="https://listenflow.lovable.app/teacher/students" 
         style="display:inline-block;background:#6366f1;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
        View Student Progress
      </a>
    </div>
    <p style="font-size:13px;color:#9ca3af;text-align:center;margin-top:32px;">
      You can manage notification preferences in your teacher settings.
    </p>
  </div>
</body>
</html>`;

    const emailResult = await resend.emails.send({
      from: "ListenFlow <onboarding@resend.dev>",
      to: [teacherEmail],
      subject,
      html,
    });

    console.log("[notify-teacher-email] Email sent:", emailResult);

    return new Response(JSON.stringify({ success: true, emailId: emailResult?.data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[notify-teacher-email] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
