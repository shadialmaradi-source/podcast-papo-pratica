import Stripe from "https://esm.sh/stripe@14.21.0";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

async function sendPaymentFailureEmail(email: string, name: string) {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    console.warn('RESEND_API_KEY not set, skipping payment failure email');
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ListenFlow <notifications@listenflow.app>',
        to: [email],
        subject: '⚠️ Payment failed — your ListenFlow access is at risk',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
            <h2 style="color: #1a1a1a; margin-bottom: 16px;">Hi ${name},</h2>
            <p style="color: #444; line-height: 1.6;">We were unable to process your latest payment for your ListenFlow teacher subscription.</p>
            <p style="color: #444; line-height: 1.6;"><strong>Lesson creation has been paused</strong> until this is resolved. Your existing lessons and students are not affected.</p>
            <p style="color: #444; line-height: 1.6;">Please update your payment method to restore full access:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="https://listenflow.lovable.app/teacher/pricing" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Update Payment Method</a>
            </div>
            <p style="color: #888; font-size: 14px; line-height: 1.5;">If you believe this is an error, please contact us at support@listenflow.app.</p>
            <p style="color: #888; font-size: 14px;">— The ListenFlow Team</p>
          </div>
        `,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('Resend email failed:', res.status, body);
    } else {
      console.log('Payment failure email sent to:', email);
    }
  } catch (err) {
    console.error('Failed to send payment failure email:', err);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!stripeSecretKey || !webhookSecret) {
      console.error('Stripe keys not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Processing webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const teacherPlan = session.metadata?.teacher_plan;

        if (!userId) {
          console.error('No user ID in session metadata');
          break;
        }

        // Fetch subscription to get current_period_end
        let periodEnd: string | null = null;
        if (session.subscription) {
          try {
            const sub = await stripe.subscriptions.retrieve(session.subscription as string);
            periodEnd = new Date(sub.current_period_end * 1000).toISOString();
          } catch (e) {
            console.error('Failed to fetch subscription details:', e);
          }
        }

        if (teacherPlan) {
          const upsertData: Record<string, unknown> = {
            teacher_id: userId,
            plan: teacherPlan,
            status: 'active',
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            updated_at: new Date().toISOString(),
          };
          if (periodEnd) upsertData.current_period_end = periodEnd;

          const { error } = await supabase
            .from('teacher_subscriptions')
            .upsert(upsertData, { onConflict: 'teacher_id' });

          if (error) {
            console.error('Error updating teacher subscription:', error);
          } else {
            console.log('Teacher upgraded to', teacherPlan, ':', userId);
          }
        } else {
          const { error } = await supabase
            .from('subscriptions')
            .upsert({
              user_id: userId,
              tier: 'premium',
              status: 'active',
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

          if (error) {
            console.error('Error updating subscription:', error);
          } else {
            console.log('User upgraded to premium:', userId);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        const teacherPlan = subscription.metadata?.teacher_plan;

        if (teacherPlan || !userId) {
          const { data: teacherSub } = await supabase
            .from('teacher_subscriptions')
            .select('teacher_id')
            .eq('stripe_subscription_id', subscription.id)
            .single();

          if (teacherSub) {
            await supabase
              .from('teacher_subscriptions')
              .update({ plan: 'free', status: 'cancelled', updated_at: new Date().toISOString(), current_period_end: null })
              .eq('teacher_id', teacherSub.teacher_id);
            console.log('Teacher downgraded to free:', teacherSub.teacher_id);
            break;
          }
        }

        if (userId) {
          await supabase
            .from('subscriptions')
            .update({ tier: 'free', status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('user_id', userId);
          console.log('User downgraded to free:', userId);
        } else {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscription.id)
            .single();

          if (sub) {
            await supabase
              .from('subscriptions')
              .update({ tier: 'free', status: 'cancelled', updated_at: new Date().toISOString() })
              .eq('user_id', sub.user_id);
            console.log('User downgraded to free (by subscription ID):', sub.user_id);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        const teacherPlan = subscription.metadata?.teacher_plan;
        const status = subscription.status === 'active' ? 'active' :
                      subscription.status === 'canceled' ? 'cancelled' :
                      subscription.status === 'past_due' ? 'past_due' : 'expired';
        const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

        if (teacherPlan && userId) {
          const updateData: Record<string, unknown> = {
            status,
            plan: teacherPlan,
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          };
          await supabase
            .from('teacher_subscriptions')
            .update(updateData)
            .eq('teacher_id', userId);
          console.log('Teacher subscription updated:', userId, 'plan:', teacherPlan, 'status:', status);
        } else if (userId) {
          await supabase
            .from('subscriptions')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('user_id', userId);
          console.log('Subscription updated for user:', userId, 'status:', status);
        } else {
          // Fallback: try to find by stripe_subscription_id
          const { data: teacherSub } = await supabase
            .from('teacher_subscriptions')
            .select('teacher_id')
            .eq('stripe_subscription_id', subscription.id)
            .single();

          if (teacherSub) {
            await supabase
              .from('teacher_subscriptions')
              .update({ status, current_period_end: periodEnd, updated_at: new Date().toISOString() })
              .eq('teacher_id', teacherSub.teacher_id);
            console.log('Teacher subscription updated by sub ID:', teacherSub.teacher_id, 'status:', status);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          // Check teacher_subscriptions first
          const { data: teacherSub } = await supabase
            .from('teacher_subscriptions')
            .select('teacher_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single();

          if (teacherSub) {
            await supabase
              .from('teacher_subscriptions')
              .update({ status: 'past_due', updated_at: new Date().toISOString() })
              .eq('teacher_id', teacherSub.teacher_id);
            console.log('Teacher set to past_due:', teacherSub.teacher_id);

            // Send payment failure email
            const { data: teacherUser } = await supabase.auth.admin.getUserById(teacherSub.teacher_id);
            if (teacherUser?.user?.email) {
              await sendPaymentFailureEmail(teacherUser.user.email, teacherUser.user.user_metadata?.full_name || 'Teacher');
            }
            break;
          }

          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single();

          if (sub) {
            await supabase
              .from('subscriptions')
              .update({ status: 'past_due', updated_at: new Date().toISOString() })
              .eq('user_id', sub.user_id);
            console.log('User set to past_due:', sub.user_id);
          }
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in stripe-webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
