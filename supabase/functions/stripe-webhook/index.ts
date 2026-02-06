import Stripe from "https://esm.sh/stripe@14.21.0";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  // Handle CORS preflight
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

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

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
        
        if (!userId) {
          console.error('No user ID in session metadata');
          break;
        }

        // Upsert subscription record
        const { error } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            tier: 'premium',
            status: 'active',
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('Error updating subscription:', error);
        } else {
          console.log('User upgraded to premium:', userId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        
        if (!userId) {
          // Try to find user by stripe subscription ID
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscription.id)
            .single();
          
          if (sub) {
            await supabase
              .from('subscriptions')
              .update({
                tier: 'free',
                status: 'cancelled',
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', sub.user_id);
            
            console.log('User downgraded to free (by subscription ID):', sub.user_id);
          }
        } else {
          await supabase
            .from('subscriptions')
            .update({
              tier: 'free',
              status: 'cancelled',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
          
          console.log('User downgraded to free:', userId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        
        if (userId) {
          const status = subscription.status === 'active' ? 'active' : 
                        subscription.status === 'canceled' ? 'cancelled' : 'expired';
          
          await supabase
            .from('subscriptions')
            .update({
              status,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
          
          console.log('Subscription updated for user:', userId, 'status:', status);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        
        if (subscriptionId) {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single();
          
          if (sub) {
            console.log('Payment failed for user:', sub.user_id);
            // Could send notification or update status here
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
