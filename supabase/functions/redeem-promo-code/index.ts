import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RedeemRequest {
  code: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, message: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create client with user's auth to verify them
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: userData, error: userError } = await userSupabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ success: false, message: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;

    // Create admin client for database operations
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: RedeemRequest = await req.json();
    const code = body.code?.toUpperCase().trim();

    if (!code) {
      return new Response(
        JSON.stringify({ success: false, message: 'Please enter a promo code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has an active premium/promo subscription
    const { data: existingSub } = await adminSupabase
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', userId)
      .single();

    if (existingSub && (existingSub.tier === 'premium' || existingSub.tier === 'promo') && existingSub.status === 'active') {
      return new Response(
        JSON.stringify({ success: false, message: 'You already have an active premium subscription' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate promo code
    const { data: promo, error: promoError } = await adminSupabase
      .from('promo_codes')
      .select('*')
      .eq('code', code)
      .eq('active', true)
      .single();

    if (promoError || !promo) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid promo code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check max uses
    if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
      return new Response(
        JSON.stringify({ success: false, message: 'This promo code has reached its usage limit' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, message: 'This promo code has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate expiration date for user subscription
    let expiresAt: string | null = null;
    if (promo.type === 'duration' && promo.duration_months) {
      const expDate = new Date();
      expDate.setMonth(expDate.getMonth() + promo.duration_months);
      expiresAt = expDate.toISOString();
    }

    // Upsert subscription record
    const { error: updateError } = await adminSupabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        tier: 'promo',
        status: 'active',
        promo_code: code,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to apply promo code. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment usage counter
    await adminSupabase
      .from('promo_codes')
      .update({ current_uses: promo.current_uses + 1 })
      .eq('id', promo.id);

    const durationText = promo.type === 'unlimited' 
      ? 'lifetime' 
      : `${promo.duration_months} month${promo.duration_months > 1 ? 's' : ''}`;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Success! You now have Premium access for ${durationText}`,
        expiresAt 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in redeem-promo-code:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'An error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
