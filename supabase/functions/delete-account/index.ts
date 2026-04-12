import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { confirmation } = await req.json().catch(() => ({}));
    if (confirmation !== "DELETE") {
      return new Response(JSON.stringify({ error: "Confirmation required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRow } = await admin
      .from("user_roles" as any)
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const role = ((roleRow as any)?.role || "student") as string;

    if (role === "teacher") {
      await admin
        .from("teacher_profiles" as any)
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("teacher_id", user.id);

      await admin
        .from("teacher_students" as any)
        .update({ status: "inactive", last_active: new Date().toISOString() } as any)
        .eq("teacher_id", user.id);

      await admin
        .from("teacher_subscriptions" as any)
        .update({ status: "cancelled", plan: "free", current_period_end: null } as any)
        .eq("teacher_id", user.id);

      await admin
        .from("account_deletion_queue" as any)
        .insert({ user_id: user.id, role: "teacher", status: "pending" } as any);

      await admin.auth.admin.updateUserById(user.id, {
        ban_duration: "876000h",
      });

      return new Response(JSON.stringify({ success: true, mode: "teacher_soft_deleted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = user.email || "";
    const tombstoneEmail = `deleted-${user.id.slice(0, 12)}@deleted.local`;

    await admin.from("lesson_responses" as any).delete().eq("user_id", user.id);
    await admin.from("speaking_responses" as any).delete().eq("student_id", user.id);
    await admin.from("user_activity_history" as any).delete().eq("user_id", user.id);
    await admin.from("user_video_progress" as any).delete().eq("user_id", user.id);
    await admin.from("user_week_progress" as any).delete().eq("user_id", user.id);
    await admin.from("user_vocabulary_progress" as any).delete().eq("user_id", user.id);
    await admin.from("spaced_repetition_reviews" as any).delete().eq("user_id", user.id);
    await admin.from("youtube_video_analytics" as any).delete().eq("user_id", user.id);
    await admin.from("user_viewed_flashcards" as any).delete().eq("user_id", user.id);
    await admin.from("user_created_flashcards" as any).delete().eq("user_id", user.id);

    if (email) {
      await admin
        .from("teacher_students" as any)
        .update({
          status: "inactive",
          student_name: null,
          notes: null,
          level: null,
          native_language: null,
          student_email: tombstoneEmail,
          last_active: new Date().toISOString(),
        } as any)
        .eq("student_email", email);

      await admin
        .from("teacher_lessons" as any)
        .update({ student_email: null } as any)
        .eq("student_email", email);

      await admin
        .from("video_assignments" as any)
        .delete()
        .eq("student_email", email);

      await admin
        .from("speaking_assignments" as any)
        .delete()
        .eq("student_email", email);
    }

    await admin.from("profiles").delete().eq("user_id", user.id);
    await admin.auth.admin.deleteUser(user.id);

    return new Response(JSON.stringify({ success: true, mode: "student_deleted" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("delete-account error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
