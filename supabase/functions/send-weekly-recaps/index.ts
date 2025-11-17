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
    console.log('Starting weekly recaps generation...');

    // Get all active users with email preferences
    const { data: profiles, error: usersError } = await supabase
      .from('profiles')
      .select(`
        user_id, 
        display_name,
        user_notification_preferences!inner(email_weekly_recaps)
      `)
      .eq('user_notification_preferences.email_weekly_recaps', true);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    // Get emails from auth.users for these profiles
    const { data: authUsersData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      throw authError;
    }

    // Map user_id to email
    const emailMap = new Map(authUsersData.users.map(u => [u.id, u.email]));
    
    // Combine profile and email data
    const users = profiles
      ?.map(p => ({
        user_id: p.user_id,
        email: emailMap.get(p.user_id),
        display_name: p.display_name
      }))
      .filter(u => u.email); // Only include users with email

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    console.log(`Found ${users?.length || 0} users for weekly recap`);

    for (const user of users || []) {
      try {
        // Get weekly recap data using existing function
        const { data: weeklyData, error: dataError } = await supabase
          .rpc('get_weekly_recap_data', { user_id_param: user.user_id });

        if (dataError) {
          console.error(`Error getting weekly data for ${user.user_id}:`, dataError);
          continue;
        }

        const recap = weeklyData?.[0];
        if (!recap) continue;

        const title = "Your Weekly Learning Summary 📊";
        const content = `This week you earned ${recap.total_xp} XP, completed ${recap.episodes_completed} episodes, and unlocked ${recap.new_badges} badges!`;

        // Create in-app notification
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: user.user_id,
            type: 'weekly_recap',
            title,
            content,
            data: {
              total_xp: recap.total_xp,
              episodes_completed: recap.episodes_completed,
              new_badges: recap.new_badges,
              exercises_completed: recap.exercises_completed,
              streak_days: recap.streak_days
            }
          });

        if (notificationError) {
          console.error(`Error creating notification for user ${user.user_id}:`, notificationError);
          continue;
        }

        // Send email
        const emailResponse = await resend.emails.send({
          from: "Lovable Language Learning <onboarding@resend.dev>",
          to: [user.email],
          subject: title,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333; margin-bottom: 20px;">${title}</h2>
              <p style="font-size: 16px; line-height: 1.6; color: #555;">
                Hi ${user.display_name || 'there'}! Here's your weekly learning summary:
              </p>
              
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; margin: 30px 0; color: white;">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; text-align: center;">
                  <div>
                    <h3 style="margin: 0 0 5px 0; font-size: 32px;">${recap.total_xp}</h3>
                    <p style="margin: 0; opacity: 0.9;">XP Earned</p>
                  </div>
                  <div>
                    <h3 style="margin: 0 0 5px 0; font-size: 32px;">${recap.episodes_completed}</h3>
                    <p style="margin: 0; opacity: 0.9;">Episodes Completed</p>
                  </div>
                  <div>
                    <h3 style="margin: 0 0 5px 0; font-size: 32px;">${recap.new_badges}</h3>
                    <p style="margin: 0; opacity: 0.9;">New Badges</p>
                  </div>
                  <div>
                    <h3 style="margin: 0 0 5px 0; font-size: 32px;">${recap.streak_days}</h3>
                    <p style="margin: 0; opacity: 0.9;">Day Streak</p>
                  </div>
                </div>
              </div>

              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #555;">
                  🎯 You completed ${recap.exercises_completed} exercises this week! 
                  ${recap.total_xp > 0 ? "Keep up the amazing progress!" : "Ready to start earning XP next week?"}
                </p>
              </div>

              <p style="color: #777; font-size: 14px; margin-top: 30px;">
                Keep up the excellent work! Consistency is key to mastering a new language.
              </p>
            </div>
          `,
        });

        if (emailResponse.error) {
          console.error(`Error sending weekly recap to ${user.email}:`, emailResponse.error);
        } else {
          console.log(`Weekly recap sent successfully to ${user.email}`);
          
          // Update notification as sent
          await supabase
            .from('notifications')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('user_id', user.user_id)
            .eq('type', 'weekly_recap')
            .eq('status', 'pending');
        }

        console.log(`Processed weekly recap for user ${user.user_id}`);
      } catch (userError) {
        console.error(`Error processing weekly recap for user ${user.user_id}:`, userError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: users?.length || 0,
        message: 'Weekly recaps sent successfully' 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error) {
    console.error('Error in send-weekly-recaps:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
});