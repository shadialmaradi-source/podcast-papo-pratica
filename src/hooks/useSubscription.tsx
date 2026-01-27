import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getUserSubscription,
  getUploadQuotaStatus,
  getVocalQuotaStatus,
  canUserDoVocalExercise,
  canUserUploadVideo,
  getNextMonthResetDate,
  type UserSubscription,
  type VocalQuotaResult,
  type UploadQuotaResult,
} from "@/services/subscriptionService";

export interface SubscriptionState {
  subscription: UserSubscription | null;
  uploadQuota: {
    uploadsUsed: number;
    uploadsLimit: number;
    totalDurationUsed: number;
    totalDurationLimit: number;
    isPremium: boolean;
  } | null;
  vocalQuota: {
    count: number;
    limit: number;
    isPremium: boolean;
  } | null;
  loading: boolean;
  resetDate: Date;
}

export function useSubscription() {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscription: null,
    uploadQuota: null,
    vocalQuota: null,
    loading: true,
    resetDate: getNextMonthResetDate(),
  });

  const fetchSubscriptionData = useCallback(async () => {
    if (!user?.id) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      const [subscription, uploadQuota, vocalQuota] = await Promise.all([
        getUserSubscription(user.id),
        getUploadQuotaStatus(user.id),
        getVocalQuotaStatus(user.id),
      ]);

      setState({
        subscription,
        uploadQuota,
        vocalQuota,
        loading: false,
        resetDate: getNextMonthResetDate(),
      });
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  const checkVocalQuota = useCallback(async (): Promise<VocalQuotaResult> => {
    if (!user?.id) {
      return { allowed: false, count: 0, limit: 5 };
    }
    return canUserDoVocalExercise(user.id);
  }, [user?.id]);

  const checkUploadQuota = useCallback(async (videoDurationSeconds: number): Promise<UploadQuotaResult> => {
    if (!user?.id) {
      return {
        allowed: false,
        reason: 'Please sign in to upload videos.',
        uploadsUsed: 0,
        uploadsLimit: 2,
        totalDurationUsed: 0,
        totalDurationLimit: 1200,
      };
    }
    return canUserUploadVideo(user.id, videoDurationSeconds);
  }, [user?.id]);

  const refresh = useCallback(() => {
    setState(prev => ({ ...prev, loading: true }));
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  const isPremium = state.subscription?.tier === 'premium' || state.subscription?.tier === 'promo';

  return {
    ...state,
    isPremium,
    checkVocalQuota,
    checkUploadQuota,
    refresh,
  };
}
