import { supabase } from "@/integrations/supabase/client";

// Subscription limits configuration
export const SUBSCRIPTION_LIMITS = {
  free: {
    uploadsPerMonth: 2,
    maxVideoLengthSeconds: 600, // 10 minutes
    totalDurationPerMonthSeconds: 1200, // 20 minutes
    vocalExercisesPerMonth: 5,
  },
  premium: {
    uploadsPerMonth: 10,
    maxVideoLengthSeconds: 900, // 15 minutes
    totalDurationPerMonthSeconds: 9000, // 150 minutes
    vocalExercisesPerMonth: -1, // Unlimited
  },
};

export type SubscriptionTier = 'free' | 'premium' | 'promo';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired';

export interface UserSubscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  expiresAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export interface UploadQuotaResult {
  allowed: boolean;
  reason?: string;
  uploadsUsed: number;
  uploadsLimit: number;
  totalDurationUsed: number;
  totalDurationLimit: number;
}

export interface VocalQuotaResult {
  allowed: boolean;
  count: number;
  limit: number;
}

function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

export function getNextMonthResetDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
}

export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('tier, status, expires_at, stripe_customer_id, stripe_subscription_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching subscription:', error);
  }

  // If no subscription record exists, user is on free tier
  if (!data) {
    return {
      tier: 'free',
      status: 'active',
      expiresAt: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    };
  }

  // Check if promo subscription has expired
  if (data.tier === 'promo' && data.expires_at) {
    if (new Date(data.expires_at) < new Date()) {
      return {
        tier: 'free',
        status: 'expired',
        expiresAt: data.expires_at,
        stripeCustomerId: data.stripe_customer_id,
        stripeSubscriptionId: data.stripe_subscription_id,
      };
    }
  }

  return {
    tier: data.tier as SubscriptionTier,
    status: data.status as SubscriptionStatus,
    expiresAt: data.expires_at,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
  };
}

export function isPremiumTier(tier: SubscriptionTier): boolean {
  return tier === 'premium' || tier === 'promo';
}

export async function canUserUploadVideo(
  userId: string, 
  videoDurationSeconds: number
): Promise<UploadQuotaResult> {
  const subscription = await getUserSubscription(userId);
  const isPremium = isPremiumTier(subscription.tier);
  const limits = isPremium ? SUBSCRIPTION_LIMITS.premium : SUBSCRIPTION_LIMITS.free;

  // Check individual video length first
  if (videoDurationSeconds > limits.maxVideoLengthSeconds) {
    const maxMinutes = Math.floor(limits.maxVideoLengthSeconds / 60);
    const videoMinutes = Math.floor(videoDurationSeconds / 60);
    return {
      allowed: false,
      reason: `Video is too long (${videoMinutes} min). ${isPremium ? 'Premium' : 'Free'} users can upload videos up to ${maxMinutes} minutes.`,
      uploadsUsed: 0,
      uploadsLimit: limits.uploadsPerMonth,
      totalDurationUsed: 0,
      totalDurationLimit: limits.totalDurationPerMonthSeconds,
    };
  }

  // Get current month's uploads
  const startOfMonth = getStartOfMonth();
  const { data: uploads, error } = await supabase
    .from('user_video_uploads')
    .select('duration_seconds')
    .eq('user_id', userId)
    .gte('uploaded_at', startOfMonth.toISOString());

  if (error) {
    console.error('Error fetching uploads:', error);
    return {
      allowed: false,
      reason: 'Unable to check upload quota. Please try again.',
      uploadsUsed: 0,
      uploadsLimit: limits.uploadsPerMonth,
      totalDurationUsed: 0,
      totalDurationLimit: limits.totalDurationPerMonthSeconds,
    };
  }

  const uploadCount = uploads?.length || 0;
  const totalDuration = uploads?.reduce((sum, u) => sum + (u.duration_seconds || 0), 0) || 0;

  // Check count limit
  if (uploadCount >= limits.uploadsPerMonth) {
    return {
      allowed: false,
      reason: `You've reached your monthly limit of ${limits.uploadsPerMonth} video uploads.${!isPremium ? ' Upgrade to Premium for more uploads.' : ''}`,
      uploadsUsed: uploadCount,
      uploadsLimit: limits.uploadsPerMonth,
      totalDurationUsed: totalDuration,
      totalDurationLimit: limits.totalDurationPerMonthSeconds,
    };
  }

  // Check total duration limit
  if (totalDuration + videoDurationSeconds > limits.totalDurationPerMonthSeconds) {
    return {
      allowed: false,
      reason: `Your uploads this month have reached the capacity limit.${!isPremium ? ' Upgrade to Premium for more capacity.' : ' Try again next month.'}`,
      uploadsUsed: uploadCount,
      uploadsLimit: limits.uploadsPerMonth,
      totalDurationUsed: totalDuration,
      totalDurationLimit: limits.totalDurationPerMonthSeconds,
    };
  }

  return {
    allowed: true,
    uploadsUsed: uploadCount,
    uploadsLimit: limits.uploadsPerMonth,
    totalDurationUsed: totalDuration,
    totalDurationLimit: limits.totalDurationPerMonthSeconds,
  };
}

export async function canUserDoVocalExercise(userId: string): Promise<VocalQuotaResult> {
  const subscription = await getUserSubscription(userId);
  const isPremium = isPremiumTier(subscription.tier);

  // Premium users have unlimited vocal exercises
  if (isPremium) {
    return { allowed: true, count: 0, limit: -1 };
  }

  // For free users, check monthly limit
  const startOfMonth = getStartOfMonth();
  const { data: completions, error } = await supabase
    .from('vocal_exercise_completions')
    .select('id')
    .eq('user_id', userId)
    .gte('completed_at', startOfMonth.toISOString());

  if (error) {
    console.error('Error fetching vocal completions:', error);
    return { allowed: true, count: 0, limit: SUBSCRIPTION_LIMITS.free.vocalExercisesPerMonth };
  }

  const count = completions?.length || 0;
  const limit = SUBSCRIPTION_LIMITS.free.vocalExercisesPerMonth;

  return {
    allowed: count < limit,
    count,
    limit,
  };
}

export async function recordVocalExerciseCompletion(
  userId: string, 
  videoId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('vocal_exercise_completions')
    .insert({
      user_id: userId,
      video_id: videoId,
    });

  if (error) {
    console.error('Error recording vocal completion:', error);
    return false;
  }

  return true;
}

export async function getUploadQuotaStatus(userId: string): Promise<{
  uploadsUsed: number;
  uploadsLimit: number;
  totalDurationUsed: number;
  totalDurationLimit: number;
  isPremium: boolean;
}> {
  const subscription = await getUserSubscription(userId);
  const isPremium = isPremiumTier(subscription.tier);
  const limits = isPremium ? SUBSCRIPTION_LIMITS.premium : SUBSCRIPTION_LIMITS.free;

  const startOfMonth = getStartOfMonth();
  const { data: uploads } = await supabase
    .from('user_video_uploads')
    .select('duration_seconds')
    .eq('user_id', userId)
    .gte('uploaded_at', startOfMonth.toISOString());

  const uploadCount = uploads?.length || 0;
  const totalDuration = uploads?.reduce((sum, u) => sum + (u.duration_seconds || 0), 0) || 0;

  return {
    uploadsUsed: uploadCount,
    uploadsLimit: limits.uploadsPerMonth,
    totalDurationUsed: totalDuration,
    totalDurationLimit: limits.totalDurationPerMonthSeconds,
    isPremium,
  };
}

export async function getVocalQuotaStatus(userId: string): Promise<{
  count: number;
  limit: number;
  isPremium: boolean;
}> {
  const subscription = await getUserSubscription(userId);
  const isPremium = isPremiumTier(subscription.tier);

  if (isPremium) {
    return { count: 0, limit: -1, isPremium: true };
  }

  const startOfMonth = getStartOfMonth();
  const { data: completions } = await supabase
    .from('vocal_exercise_completions')
    .select('id')
    .eq('user_id', userId)
    .gte('completed_at', startOfMonth.toISOString());

  return {
    count: completions?.length || 0,
    limit: SUBSCRIPTION_LIMITS.free.vocalExercisesPerMonth,
    isPremium: false,
  };
}
