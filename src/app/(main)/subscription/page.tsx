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
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useUsage } from '@/hooks/useUsage';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: Mic,
    title: 'Unlimited Recordings',
    description: 'Record as many meetings as you need',
  },
  {
    icon: FileText,
    title: 'AI Transcription',
    description: 'Automatic speaker identification & timestamps',
  },
  {
    icon: Sparkles,
    title: 'Smart Summaries',
    description: 'AI-generated summaries with key action items',
  },
  {
    icon: Share2,
    title: 'Easy Sharing',
    description: 'Share transcripts with secure links',
  },
  {
    icon: Clock,
    title: 'Time Tracking',
    description: 'Automatic billable time calculations',
  },
  {
    icon: Shield,
    title: 'Secure Storage',
    description: 'Your recordings are encrypted and private',
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

  // Fetch pricing info
  useEffect(() => {
    const fetchPricing = async () => {
      // You can fetch from Polar API or hardcode the price
      // For now, using a common price point
      setPriceAmount(19.99);
      setPriceInterval('month');
    };
    fetchPricing();
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
          redirect: 'follow',
        }
      );

      // Check if redirected to Polar checkout
      if (response.url && response.url.includes('polar.sh')) {
        window.location.href = response.url;
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to start checkout');
      }

      // Try to parse JSON response
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
          redirect: 'follow',
        }
      );

      // Check if redirected to Polar portal
      if (response.url && response.url.includes('polar.sh')) {
        window.open(response.url, '_blank');
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to open portal');
      }

      alert('Unable to open subscription management. Please try again.');
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
            {hasActiveSubscription ? 'Your Benefits' : 'What You Get'}
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
            className="bg-gradient-to-br from-accent-light to-accent rounded-2xl p-6 mb-6"
          >
            <div className="text-center">
              <span className="text-white/80 text-sm">
                {priceInterval === 'month' ? 'Monthly' : 'Yearly'}
              </span>
              <div className="flex items-baseline justify-center gap-1 mt-1 mb-4">
                <span className="text-4xl font-bold text-white">
                  ${priceAmount || '—'}
                </span>
                <span className="text-white/80">
                  /{priceInterval}
                </span>
              </div>

              {/* Feature highlights */}
              <div className="space-y-2 mb-6">
                {['Unlimited recordings', 'AI transcription', 'Smart summaries'].map((item) => (
                  <div key={item} className="flex items-center justify-center gap-2">
                    <Check size={16} className="text-white" />
                    <span className="text-white text-sm">{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSubscribe}
                disabled={isLoading}
                className="w-full py-4 bg-white text-accent font-bold rounded-xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Sparkles size={20} />
                )}
                {hasActiveTrial ? 'Subscribe Now' : 'Start Free Trial'}
              </button>
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

