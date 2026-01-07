'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  Sparkles,
  Mic,
  FileText,
  Share2,
  Clock,
  Shield,
  ExternalLink,
  Loader2,
  RefreshCw,
  AlertTriangle,
  XCircle,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useUsage } from '@/hooks/useUsage';
import { supabase } from '@/lib/supabase';
import { SUBSCRIPTION_PLAN } from '@/types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
}

interface PainPoint {
  icon: React.ElementType;
  title: string;
  description: string;
}

const PAIN_POINTS: PainPoint[] = [
  {
    icon: Clock,
    title: 'Hours Lost to Note-Taking',
    description: 'Manually transcribing meetings steals time from billable work',
  },
  {
    icon: AlertTriangle,
    title: 'Inaccurate Billing',
    description: 'Forgotten billable time means lost revenue every month',
  },
  {
    icon: XCircle,
    title: 'Missed Critical Details',
    description: 'Reconstructing conversations leads to errors and omissions',
  },
];

const FEATURES: Feature[] = [
  {
    icon: Mic,
    title: 'Unlimited Recordings',
    description: 'No per-minute fees ever — record every meeting',
  },
  {
    icon: FileText,
    title: 'AI Transcription',
    description: 'Speaker identification — know exactly who said what',
  },
  {
    icon: Sparkles,
    title: 'Smart Summaries',
    description: 'Action items extracted — never miss a follow-up',
  },
  {
    icon: Share2,
    title: 'Secure Sharing',
    description: 'Send transcripts to clients with one click',
  },
  {
    icon: Clock,
    title: 'Auto Time Tracking',
    description: 'Capture every billable minute automatically',
  },
  {
    icon: Shield,
    title: 'Bank-Level Security',
    description: 'Client confidentiality protected with encryption',
  },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const {
    hasActiveSubscription,
    hasActiveTrial,
    trialDaysRemaining,
    subscription,
    canceledButStillActive,
    accessEndsAt,
    verifySubscription,
    isVerifying,
    subscriptionFreshness,
  } = useUsage();

  const cancelAtPeriodEnd = canceledButStillActive;
  const currentPeriodEnd = accessEndsAt?.toISOString();

  const [isLoading, setIsLoading] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [priceAmount, setPriceAmount] = useState<number | null>(null);
  const [priceInterval, setPriceInterval] = useState<string>('month');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [initialSyncDone, setInitialSyncDone] = useState(false);

  // Force sync with Polar on page load
  useEffect(() => {
    if (!initialSyncDone && subscription !== undefined) {
      setInitialSyncDone(true);
      handleSyncSubscription(true); // Silent initial sync
    }
  }, [subscription, initialSyncDone]);

  // Sync subscription status with Polar API
  const handleSyncSubscription = useCallback(async (silent = false) => {
    if (!silent) {
      setIsSyncing(true);
      setSyncMessage(null);
    }
    
    try {
      const result = await verifySubscription(true); // Force refresh
      
      if (!silent) {
        if (result.statusChanged) {
          setSyncMessage(`Status updated: ${result.status}`);
        } else if (result.verified) {
          setSyncMessage('Subscription is up to date');
        } else {
          setSyncMessage(result.message || 'Could not sync');
        }
        
        // Clear message after 3 seconds
        setTimeout(() => setSyncMessage(null), 3000);
      }
    } catch (error) {
      console.error('[Subscription] Sync error:', error);
      if (!silent) {
        setSyncMessage('Failed to sync. Please try again.');
        setTimeout(() => setSyncMessage(null), 3000);
      }
    } finally {
      if (!silent) {
        setIsSyncing(false);
      }
    }
  }, [verifySubscription]);

  // Set pricing from SUBSCRIPTION_PLAN constant
  useEffect(() => {
    setPriceAmount(SUBSCRIPTION_PLAN.priceMonthly);
    setPriceInterval('month');
  }, []);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated. Please sign in again.');
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/polar-checkout`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to start checkout');
      }

      // Parse JSON response with checkout URL
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('[Subscription] Checkout error:', error);
      alert(error.message || 'Failed to start subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsManaging(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated. Please sign in again.');
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/polar-customer-portal`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to open portal');
      }

      // Parse JSON response with portal URL
      const data = await response.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No portal URL received');
      }
    } catch (error: any) {
      console.error('[Subscription] Portal error:', error);
      alert(error.message || 'Failed to open subscription portal');
    } finally {
      setIsManaging(false);
    }
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <div className="flex items-center px-4 py-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-surface rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-text" />
          </button>
          <h1 className="text-lg font-semibold text-text flex-1 text-center">
            {hasActiveSubscription ? 'Your Subscription' : 'Subscribe'}
          </h1>
          {/* Sync Button */}
          <button
            onClick={() => handleSyncSubscription(false)}
            disabled={isSyncing || isVerifying}
            className="p-2 hover:bg-surface rounded-lg transition-colors disabled:opacity-50"
            title="Sync subscription status"
          >
            <RefreshCw 
              size={20} 
              className={`text-text-muted ${(isSyncing || isVerifying) ? 'animate-spin' : ''}`} 
            />
          </button>
        </div>
        
        {/* Sync Status Message */}
        {syncMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-2"
          >
            <p className="text-center text-sm text-accent-light">{syncMessage}</p>
          </motion.div>
        )}
      </div>

      <div className="px-4 pt-6">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-light to-accent flex items-center justify-center mx-auto mb-4"
          >
            <Sparkles size={40} className="text-white" />
          </motion.div>

          {hasActiveSubscription ? (
            <>
              <h2 className="text-2xl font-bold text-text mb-2">
                You&apos;re Subscribed!
              </h2>
              <p className="text-text-secondary">
                Thank you for supporting Legal Memo
              </p>
            </>
          ) : hasActiveTrial ? (
            <>
              <h2 className="text-2xl font-bold text-text mb-2">
                {trialDaysRemaining === 0
                  ? 'Trial Ends Today!'
                  : trialDaysRemaining === 1
                    ? 'Trial Ends Tomorrow!'
                    : `${trialDaysRemaining} Days Left`}
              </h2>
              <p className="text-text-secondary">
                Subscribe now to keep using Legal Memo
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-text mb-2">
                Unlock Full Access
              </h2>
              <p className="text-text-secondary">
                Professional meeting intelligence for legal professionals
              </p>
            </>
          )}
        </div>

        {/* Pain Points Section (for non-subscribers) */}
        {!hasActiveSubscription && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h3 className="text-lg font-semibold text-text mb-4">
              Sound Familiar?
            </h3>
            <div className="space-y-3">
              {PAIN_POINTS.map((point, index) => (
                <motion.div
                  key={point.title}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.15 + index * 0.1 }}
                  className="bg-surface rounded-xl p-4 border border-warning/30 flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center flex-shrink-0">
                    <point.icon size={20} className="text-warning" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-text mb-0.5">
                      {point.title}
                    </h4>
                    <p className="text-xs text-text-muted">
                      {point.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Active Subscription Info */}
        {hasActiveSubscription && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-surface rounded-2xl p-5 border border-border mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-text-secondary">Status</span>
              <div className="flex items-center gap-2">
                {/* Freshness indicator */}
                {subscriptionFreshness === 'stale' && (
                  <span className="text-xs text-warning">(Syncing...)</span>
                )}
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-semibold ${
                  cancelAtPeriodEnd
                    ? 'bg-warning/20 text-warning'
                    : 'bg-success/20 text-success'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    cancelAtPeriodEnd ? 'bg-warning' : 'bg-success'
                  }`} />
                  {cancelAtPeriodEnd ? 'Canceling' : 'Active'}
                </span>
              </div>
            </div>

            {currentPeriodEnd && (
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">
                  {cancelAtPeriodEnd ? 'Access Until' : 'Renews On'}
                </span>
                <span className="text-text font-medium">
                  {new Date(currentPeriodEnd).toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}

            <button
              onClick={handleManageSubscription}
              disabled={isManaging}
              className="w-full mt-4 btn-secondary flex items-center justify-center gap-2"
            >
              {isManaging ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <ExternalLink size={18} />
              )}
              Manage Subscription
            </button>
          </motion.div>
        )}

        {/* Features Grid */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-text mb-4">
            {hasActiveSubscription ? 'Your Benefits' : 'Everything You Need to Win'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-surface rounded-xl p-4 border border-border"
              >
                <div className="w-10 h-10 rounded-lg bg-accent-light/20 flex items-center justify-center mb-3">
                  <feature.icon size={20} className="text-accent-light" />
                </div>
                <h4 className="text-sm font-semibold text-text mb-1">
                  {feature.title}
                </h4>
                <p className="text-xs text-text-muted">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Pricing Card (for non-subscribers) */}
        {!hasActiveSubscription && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-gradient-to-br from-accent-light to-accent rounded-2xl p-6 mb-6 relative overflow-hidden"
          >
            {/* Unlimited Badge */}
            <div className="absolute top-0 right-0">
              <div className="bg-success text-white text-xs font-bold px-3 py-1.5 rounded-bl-xl flex items-center gap-1">
                <Zap size={12} />
                UNLIMITED
              </div>
            </div>

            <div className="text-center">
              <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
                {SUBSCRIPTION_PLAN.name}
              </span>
              <div className="flex items-baseline justify-center gap-1 mt-1 mb-2">
                <span className="text-4xl font-bold text-white">
                  ${priceAmount || '—'}
                </span>
                <span className="text-white/80">
                  /{priceInterval}
                </span>
              </div>
              
              {/* ROI Statement */}
              <p className="text-white/90 text-sm mb-5">
                Pays for itself with just 1 hour saved per week
              </p>

              {/* Feature highlights */}
              <div className="space-y-2.5 mb-6 text-left bg-white/10 rounded-xl p-4">
                {[
                  'Unlimited recordings — no usage caps',
                  'AI transcription with speaker ID',
                  'Auto billable time tracking',
                  'Secure sharing with clients',
                  'Bank-level encryption',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-success/30 flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-white" />
                    </div>
                    <span className="text-white text-sm">{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSubscribe}
                disabled={isLoading}
                className="w-full py-4 bg-white text-accent font-bold rounded-xl hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg"
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Sparkles size={20} />
                )}
                {hasActiveTrial ? 'Unlock Unlimited Access' : 'Start 7-Day Free Trial'}
              </button>
              
              {!hasActiveTrial && (
                <p className="text-white/70 text-xs mt-3">
                  No credit card required • Cancel anytime
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Trial Info (for trial users) */}
        {hasActiveTrial && !hasActiveSubscription && (
          <div className="text-center">
            <p className="text-text-muted text-sm">
              Your trial ends on{' '}
              <span className="text-text">
                {/* Calculate trial end date - assuming 7 day trial */}
                {new Date(Date.now() + trialDaysRemaining * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </span>
            </p>
            <p className="text-text-muted text-xs mt-2">
              Subscribe before your trial ends to keep all your recordings
            </p>
          </div>
        )}

        {/* Terms */}
        <p className="text-text-muted text-xs text-center mt-6">
          By subscribing, you agree to our Terms of Service and Privacy Policy.
          You can cancel anytime from the subscription management page.
        </p>
      </div>
    </div>
  );
}

