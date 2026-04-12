import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");
    const providedCronSecret = req.headers.get("x-cron-secret");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const isServiceRole =
      !!serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`;
    const isCronSecret = !!cronSecret && providedCronSecret === cronSecret;

    if (!isServiceRole && !isCronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized: missing valid service-role bearer token or x-cron-secret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = Date.now();
    const anonymousCutoff = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
    const activityCutoff = new Date(now - 180 * 24 * 60 * 60 * 1000).toISOString();

    const results: Record<string, unknown> = {};

    const { error: anonError } = await supabase
      .from("anonymous_speech_attempts")
      .delete()
      .lt("updated_at", anonymousCutoff);
    if (anonError) throw anonError;
    results.anonymous_speech_attempts = `deleted records older than ${anonymousCutoff}`;

    const { error: userActivityError } = await supabase
      .from("user_activity_history")
      .delete()
      .lt("created_at", activityCutoff);
    if (userActivityError) throw userActivityError;
    results.user_activity_history = `deleted records older than ${activityCutoff}`;

    const { error: ytAnalyticsError } = await supabase
      .from("youtube_video_analytics")
      .delete()
      .lt("created_at", activityCutoff);
    if (ytAnalyticsError) throw ytAnalyticsError;
    results.youtube_video_analytics = `deleted records older than ${activityCutoff}`;

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("cleanup-retention error", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
