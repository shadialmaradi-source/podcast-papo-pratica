import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Resend } from "npm:resend@2.0.0";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate cron secret for scheduled function security
    const cronSecret = Deno.env.get('CRON_SECRET');
    const providedSecret = req.headers.get('X-Cron-Secret');
    
    if (!cronSecret || providedSecret !== cronSecret) {
      console.error('Unauthorized access attempt to send-daily-reminders');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Starting daily reminders check...');

    // Get users needing daily reminders using existing function
    const { data: users, error: usersError } = await supabase
      .rpc('get_users_needing_daily_reminders');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    console.log(`Found ${users?.length || 0} users needing reminders`);

    for (const user of users || []) {
      try {
        const streakText = user.current_streak > 0 
          ? `Don't lose your ${user.current_streak}-day streak! 🔥`
          : "Start building your learning streak today! 📚";

        const title = user.current_streak > 0 
          ? `Protect your ${user.current_streak}-day streak!`
          : "Time for your daily practice!";

        const content = `${streakText} Complete one exercise to keep your progress going.`;

        // Create in-app notification
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: user.user_id,
            type: 'daily_reminder',
            title,
            content,
            data: { 
              current_streak: user.current_streak,
              last_activity_date: user.last_activity_date 
            }
          });

        if (notificationError) {
          console.error(`Error creating notification for user ${user.user_id}:`, notificationError);
          continue;
        }

        // Send email if enabled
        if (user.email_enabled && user.email) {
          const emailResponse = await resend.emails.send({
            from: "Lovable Language Learning <onboarding@resend.dev>",
            to: [user.email],
            subject: title,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333; margin-bottom: 20px;">${title}</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #555;">
                  ${content}
                </p>
                <div style="margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                  ${user.current_streak > 0 
                    ? `<p style="margin: 0; font-weight: bold; color: #e74c3c;">🔥 Current Streak: ${user.current_streak} days</p>`
                    : `<p style="margin: 0; color: #3498db;">💪 Ready to start your first day?</p>`
                  }
                </div>
                <p style="color: #777; font-size: 14px;">
                  Keep up the great work! Every day counts towards your language learning journey.
                </p>
              </div>
            `,
          });

          if (emailResponse.error) {
            console.error(`Error sending email to ${user.email}:`, emailResponse.error);
          } else {
            console.log(`Email sent successfully to ${user.email}`);
            
            // Update notification as sent
            await supabase
              .from('notifications')
              .update({ status: 'sent', sent_at: new Date().toISOString() })
              .eq('user_id', user.user_id)
              .eq('type', 'daily_reminder')
              .eq('status', 'pending');
          }
        }

        console.log(`Processed reminder for user ${user.user_id}`);
      } catch (userError) {
        console.error(`Error processing user ${user.user_id}:`, userError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: users?.length || 0,
        message: 'Daily reminders processed successfully' 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error) {
    console.error('Error in send-daily-reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
});