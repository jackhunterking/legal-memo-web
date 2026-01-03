'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { 
  isSubscriptionActive,
  isCanceledButStillActive,
  getAccessEndDate,
  getDaysUntilAccessEnds,
  type Subscription,
  type UsageCredits,
  type CanRecordResult,
  type UsageState,
} from '@/types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Freshness threshold - status older than this should be verified
const FRESHNESS_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export interface VerificationResult {
  verified: boolean;
  status: string;
  previousStatus?: string;
  statusChanged: boolean;
  canRecord: boolean;
  canAccessFeatures: boolean;
  currentPeriodEnd: string | null;
  message: string;
  fromCache?: boolean;
}

export function useUsage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [lastVerifiedAt, setLastVerifiedAt] = useState<Date | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Fetch subscription
  const { 
    data: subscription, 
    isLoading: isSubLoading, 
    refetch: refetchSubscription 
  } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as Subscription | null;
    },
    enabled: !!user?.id,
  });

  // Fetch can_user_record status from database function
  const { 
    data: canRecordResult, 
    refetch: refreshCanRecord 
  } = useQuery({
    queryKey: ['canRecord', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .rpc('can_user_record', { p_user_id: user.id });
      
      if (error) throw error;
      return data as CanRecordResult;
    },
    enabled: !!user?.id,
  });

  // Fetch usage credits
  const { data: usageCredits } = useQuery({
    queryKey: ['usageCredits', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('usage_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as UsageCredits | null;
    },
    enabled: !!user?.id,
  });

  // Computed values
  const hasActiveSubscription = subscription 
    ? isSubscriptionActive(subscription.status) 
    : false;
  
  const canceledButStillActive = subscription 
    ? isCanceledButStillActive(subscription) 
    : false;
  
  const accessEndsAt = subscription 
    ? getAccessEndDate(subscription) 
    : null;
  
  const daysUntilAccessEnds = subscription 
    ? getDaysUntilAccessEnds(subscription) 
    : 0;
  
  const hasActiveTrial = canRecordResult?.has_active_trial ?? false;
  const trialDaysRemaining = canRecordResult?.trial_days_remaining ?? 0;
  const isTrialExpired = !hasActiveSubscription && !hasActiveTrial && !canceledButStillActive;
  const canRecord = canRecordResult?.can_record ?? false;
  const canAccessFeatures = hasActiveSubscription || hasActiveTrial || canceledButStillActive;

  // Refresh all usage data
  const refreshUsage = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['subscription'] }),
      queryClient.invalidateQueries({ queryKey: ['canRecord'] }),
      queryClient.invalidateQueries({ queryKey: ['usageCredits'] }),
    ]);
  };

  // Verify subscription with Polar API
  const verifySubscription = useCallback(async (forceRefresh = false): Promise<VerificationResult> => {
    if (!user?.id) {
      return {
        verified: false,
        status: 'no_user',
        statusChanged: false,
        canRecord: false,
        canAccessFeatures: false,
        currentPeriodEnd: null,
        message: 'No authenticated user',
      };
    }

    setIsVerifying(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/verify-subscription`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ forceRefresh }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Verification failed');
      }

      const result: VerificationResult = await response.json();
      
      // Update last verified timestamp
      setLastVerifiedAt(new Date());
      
      // If status changed, invalidate queries to refresh UI
      if (result.statusChanged) {
        console.log('[useUsage] Status changed, refreshing queries');
        await refreshUsage();
      }

      return result;
    } catch (error) {
      console.error('[useUsage] Verification error:', error);
      return {
        verified: false,
        status: subscription?.status || 'unknown',
        statusChanged: false,
        canRecord: canRecord,
        canAccessFeatures: canAccessFeatures,
        currentPeriodEnd: subscription?.current_period_end || null,
        message: error instanceof Error ? error.message : 'Verification failed',
      };
    } finally {
      setIsVerifying(false);
    }
  }, [user?.id, subscription, canRecord, canAccessFeatures, refreshUsage]);

  // Check if subscription status is fresh (verified recently)
  const subscriptionFreshness = useCallback((): 'fresh' | 'stale' | 'unknown' => {
    if (!subscription) return 'unknown';
    
    // Check last_verified_at from subscription record
    const lastVerified = (subscription as Subscription & { last_verified_at?: string }).last_verified_at;
    const verifiedAt = lastVerified ? new Date(lastVerified) : lastVerifiedAt;
    
    if (!verifiedAt) return 'stale';
    
    const age = Date.now() - verifiedAt.getTime();
    return age < FRESHNESS_THRESHOLD_MS ? 'fresh' : 'stale';
  }, [subscription, lastVerifiedAt]);

  // Verify before critical action (recording)
  const verifyBeforeAction = useCallback(async (): Promise<{ allowed: boolean; reason: string }> => {
    const freshness = subscriptionFreshness();
    
    // If status is fresh and can record, allow immediately
    if (freshness === 'fresh' && canRecord) {
      return { allowed: true, reason: 'active_subscription' };
    }
    
    // Otherwise, verify with Polar API
    console.log('[useUsage] Status stale or uncertain, verifying with Polar...');
    const result = await verifySubscription(true);
    
    if (result.canRecord) {
      return { allowed: true, reason: result.status };
    }
    
    return { 
      allowed: false, 
      reason: result.status === 'expired' ? 'subscription_expired' : 'no_subscription' 
    };
  }, [subscriptionFreshness, canRecord, verifySubscription]);

  // Build usage state object
  const usageState: UsageState = {
    hasActiveSubscription,
    subscription: subscription ?? null,
    hasActiveTrial,
    trialStartedAt: profile?.trial_started_at ? new Date(profile.trial_started_at) : null,
    trialExpiresAt: canRecordResult?.trial_expires_at ? new Date(canRecordResult.trial_expires_at) : null,
    trialDaysRemaining,
    isTrialExpired,
    isCanceling: canRecordResult?.is_canceling ?? false,
    canceledButStillActive,
    canceledAt: canRecordResult?.canceled_at ? new Date(canRecordResult.canceled_at) : null,
    cancellationReason: canRecordResult?.cancellation_reason ?? null,
    accessEndsAt,
    daysUntilAccessEnds,
    lifetimeMinutesUsed: usageCredits?.lifetime_minutes_used ?? 0,
    periodStart: usageCredits?.period_start ? new Date(usageCredits.period_start) : null,
    periodEnd: usageCredits?.period_end ? new Date(usageCredits.period_end) : null,
    daysRemainingInPeriod: 0,
    canRecord,
    canAccessFeatures,
    accessReason: canRecordResult?.reason ?? 'trial_expired',
  };

  return {
    subscription,
    usageCredits,
    usageState,
    hasActiveSubscription,
    hasActiveTrial,
    trialDaysRemaining,
    isTrialExpired,
    canRecord,
    canAccessFeatures,
    canceledButStillActive,
    accessEndsAt,
    daysUntilAccessEnds,
    isLoading: isSubLoading,
    refreshUsage,
    refreshCanRecord,
    refetchSubscription,
    lifetimeMinutesUsed: usageCredits?.lifetime_minutes_used ?? 0,
    // New verification capabilities
    verifySubscription,
    verifyBeforeAction,
    isVerifying,
    lastVerifiedAt,
    subscriptionFreshness: subscriptionFreshness(),
  };
}

