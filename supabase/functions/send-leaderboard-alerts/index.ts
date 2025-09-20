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
    console.log('Starting leaderboard alerts check...');

    // Get users who are close to passing someone using existing function
    const { data: alerts, error: alertsError } = await supabase
      .rpc('get_leaderboard_position_alerts');

    if (alertsError) {
      console.error('Error fetching leaderboard alerts:', alertsError);
      throw alertsError;
    }

    console.log(`Found ${alerts?.length || 0} leaderboard position alerts`);

    for (const alert of alerts || []) {
      try {
        const title = `You're close to passing ${alert.target_user_email?.split('@')[0] || 'someone'}!`;
        const content = `You're only ${alert.xp_gap} XP away from climbing to rank #${alert.target_rank}. Keep going! 🚀`;

        // Create in-app notification
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: alert.user_id,
            type: 'leaderboard_alert',
            title,
            content,
            data: {
              current_rank: alert.current_rank,
              target_rank: alert.target_rank,
              xp_gap: alert.xp_gap,
              current_xp: alert.current_xp,
              target_xp: alert.target_xp,
              target_user_email: alert.target_user_email
            }
          });

        if (notificationError) {
          console.error(`Error creating notification for user ${alert.user_id}:`, notificationError);
          continue;
        }

        // Send email if the user has an email
        if (alert.email) {
          const emailResponse = await resend.emails.send({
            from: "Lovable Language Learning <onboarding@resend.dev>",
            to: [alert.email],
            subject: title,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333; margin-bottom: 20px;">${title}</h2>
                
                <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 25px; border-radius: 12px; margin: 30px 0; color: white; text-align: center;">
                  <h3 style="margin: 0 0 15px 0; font-size: 24px;">🎯 Almost There!</h3>
                  <p style="margin: 0; font-size: 18px; opacity: 0.95;">
                    Only <strong>${alert.xp_gap} XP</strong> to rank <strong>#${alert.target_rank}</strong>
                  </p>
                </div>

                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; text-align: center;">
                    <div>
                      <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">Your Rank</p>
                      <p style="margin: 0; font-size: 24px; font-weight: bold; color: #333;">#${alert.current_rank}</p>
                    </div>
                    <div>
                      <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">Target Rank</p>
                      <p style="margin: 0; font-size: 24px; font-weight: bold; color: #e74c3c;">#${alert.target_rank}</p>
                    </div>
                  </div>
                </div>

                <p style="font-size: 16px; line-height: 1.6; color: #555; text-align: center;">
                  Complete a few more exercises and you'll climb the leaderboard! 💪
                </p>

                <p style="color: #777; font-size: 14px; margin-top: 30px;">
                  Every XP point brings you closer to the top. Keep up the momentum!
                </p>
              </div>
            `,
          });

          if (emailResponse.error) {
            console.error(`Error sending leaderboard alert to ${alert.email}:`, emailResponse.error);
          } else {
            console.log(`Leaderboard alert sent successfully to ${alert.email}`);
            
            // Update notification as sent
            await supabase
              .from('notifications')
              .update({ status: 'sent', sent_at: new Date().toISOString() })
              .eq('user_id', alert.user_id)
              .eq('type', 'leaderboard_alert')
              .eq('status', 'pending');
          }
        }

        console.log(`Processed leaderboard alert for user ${alert.user_id}`);
      } catch (userError) {
        console.error(`Error processing leaderboard alert for user ${alert.user_id}:`, userError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: alerts?.length || 0,
        message: 'Leaderboard alerts processed successfully' 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error) {
    console.error('Error in send-leaderboard-alerts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
});