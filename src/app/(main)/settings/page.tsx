'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LogOut, 
  Trash2, 
  ChevronRight, 
  Info, 
  MessageCircleHeart, 
  Send,
  DollarSign,
  CreditCard,
  Clock,
  AlertTriangle,
  ExternalLink,
  Crown
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUsage } from '@/hooks/useUsage';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, signOut, updateProfile } = useAuth();
  const {
    usageState,
    subscription,
    hasActiveSubscription,
    hasActiveTrial,
    isTrialExpired,
    trialDaysRemaining,
    canceledButStillActive,
    accessEndsAt,
    daysUntilAccessEnds,
    lifetimeMinutesUsed,
  } = useUsage();
  
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);
  const [featureRequest, setFeatureRequest] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);

  const currencySymbol = profile?.currency_symbol || '$';
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  const handleSignOut = async () => {
    if (!confirm('Are you sure you want to sign out?')) return;
    
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace('/auth');
    } catch (err) {
      console.error('[Settings] Sign out error:', err);
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsManagingSubscription(true);

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
      
      if (response.url && response.url.includes('polar.sh')) {
        window.open(response.url, '_blank');
        return;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to open subscription portal');
      }
      
      alert('Unable to open subscription management. Please try again later.');
    } catch (error) {
      console.error('[Settings] Error opening portal:', error);
      alert(error instanceof Error ? error.message : 'Unable to open subscription management.');
    } finally {
      setIsManagingSubscription(false);
    }
  };

  const handleDeleteAccount = async () => {
    const message = 'This will permanently delete your account and all meeting data. This action cannot be undone.';
    
    if (!confirm(message + '\n\nAre you sure you want to proceed?')) return;

    setIsDeletingAccount(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Not authenticated. Please sign in again.');
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete account');
      }

      await supabase.auth.signOut();
      
      alert('Your account and all associated data have been permanently deleted.');
      router.replace('/auth');
    } catch (error) {
      console.error('[Settings] Account deletion error:', error);
      alert(error instanceof Error ? error.message : 'Unable to delete account. Please try again.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleSubmitFeatureRequest = async () => {
    if (!featureRequest.trim()) {
      alert('Please write down your idea before sending it to us.');
      return;
    }

    setIsSubmitting(true);

    // Simulate sending (in production, this would send to your backend)
    setTimeout(() => {
      console.log('[Settings] Feature request submitted:', featureRequest);
      setIsSubmitting(false);
      setFeatureRequest('');
      setShowThankYou(true);
      setTimeout(() => setShowThankYou(false), 4000);
    }, 1000);
  };

  return (
    <div className="pt-4 pb-24">
      <h1 className="text-3xl font-bold text-text mb-8">Settings</h1>

      {/* Billing Section */}
      <section className="mb-8">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Billing</h2>
        <div className="card space-y-0 divide-y divide-border">
          <button
            onClick={() => router.push('/settings/billing')}
            className="w-full flex items-center justify-between py-4 px-1 hover:bg-surface-light/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <DollarSign size={20} className="text-success" />
              <div className="text-left">
                <p className="text-text">Default Hourly Rate</p>
                {profile?.hourly_rate ? (
                  <p className="text-sm text-success font-semibold">
                    {currencySymbol}{profile.hourly_rate.toFixed(2)}/hr
                  </p>
                ) : (
                  <p className="text-sm text-text-muted">Not set</p>
                )}
              </div>
            </div>
            <ChevronRight size={20} className="text-text-muted" />
          </button>
        </div>
      </section>

      {/* Subscription Section */}
      <section className="mb-8">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Subscription & Usage</h2>
        <div className="card space-y-0 divide-y divide-border">
          {/* Subscription Status */}
          {hasActiveSubscription ? (
            canceledButStillActive ? (
              <button
                onClick={() => router.push('/subscription')}
                className="w-full flex items-center justify-between py-4 px-1"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-warning/15 flex items-center justify-center">
                    <AlertTriangle size={16} className="text-warning" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-text">Subscription Canceling</p>
                      <span className="px-2 py-0.5 bg-warning/20 text-warning text-xs font-bold rounded">
                        ENDING
                      </span>
                    </div>
                    <p className="text-sm text-warning">
                      {daysUntilAccessEnds <= 1 
                        ? daysUntilAccessEnds === 0 
                          ? 'Ends today'
                          : 'Ends tomorrow'
                        : `${daysUntilAccessEnds} days remaining`
                      }
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-text-muted" />
              </button>
            ) : (
              <div className="flex items-center gap-3 py-4 px-1">
                <div className="w-9 h-9 rounded-full bg-[#FFD700]/15 flex items-center justify-center">
                  <Crown size={16} className="text-[#FFD700]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-text">Pro Subscription</p>
                    <span className="px-2 py-0.5 bg-[#FFD700]/20 text-[#FFD700] text-xs font-bold rounded">
                      PRO
                    </span>
                  </div>
                  <p className="text-sm text-success">Unlimited Access Active</p>
                </div>
              </div>
            )
          ) : (
            <button
              onClick={() => router.push('/subscription')}
              className="w-full flex items-center justify-between py-4 px-1"
            >
              <div className="flex items-center gap-3">
                {isTrialExpired ? (
                  <AlertTriangle size={20} className="text-error" />
                ) : hasActiveTrial ? (
                  <Clock size={20} className={trialDaysRemaining <= 2 ? 'text-warning' : 'text-accent'} />
                ) : (
                  <CreditCard size={20} className="text-text-muted" />
                )}
                <div className="text-left">
                  <p className="text-text">
                    {isTrialExpired 
                      ? 'Trial Expired' 
                      : hasActiveTrial 
                        ? 'Free Trial' 
                        : 'No Subscription'}
                  </p>
                  <p className={`text-sm ${
                    isTrialExpired ? 'text-error' : 
                    hasActiveTrial && trialDaysRemaining <= 2 ? 'text-warning' : 
                    'text-text-muted'
                  }`}>
                    {isTrialExpired 
                      ? 'Subscribe to continue'
                      : trialDaysRemaining === 0
                        ? 'Trial ends today!'
                        : trialDaysRemaining === 1
                          ? 'Trial ends tomorrow!'
                          : `${trialDaysRemaining} days left in trial`}
                  </p>
                </div>
              </div>
              <ChevronRight size={20} className="text-text-muted" />
            </button>
          )}

          {/* Manage Subscription - For active subscribers */}
          {hasActiveSubscription && (
            <button
              onClick={handleManageSubscription}
              disabled={isManagingSubscription}
              className="w-full flex items-center justify-between py-4 px-1 disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <CreditCard size={20} className={canceledButStillActive ? 'text-warning' : 'text-accent'} />
                <div className="text-left">
                  <p className="text-text">
                    {canceledButStillActive ? 'Undo Cancellation' : 'Manage Subscription'}
                  </p>
                  <p className="text-sm text-text-muted">
                    {canceledButStillActive 
                      ? `Access ends ${accessEndsAt?.toLocaleDateString() || 'soon'}`
                      : subscription?.current_period_end 
                        ? `Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`
                        : 'Billing, cancel, update payment'
                    }
                  </p>
                </div>
              </div>
              {isManagingSubscription ? (
                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              ) : (
                <ExternalLink size={20} className="text-text-muted" />
              )}
            </button>
          )}

          {/* Usage Stats */}
          <div className="flex items-center justify-around py-4">
            <div className="text-center">
              <p className="text-xl font-bold text-text">{lifetimeMinutesUsed}</p>
              <p className="text-xs text-text-muted uppercase tracking-wider">Total Min</p>
            </div>
            <div className="w-px h-8 bg-border" />
            {hasActiveSubscription && !canceledButStillActive ? (
              <div className="text-center">
                <p className="text-xl font-bold text-success">∞</p>
                <p className="text-xs text-text-muted uppercase tracking-wider">Unlimited</p>
              </div>
            ) : hasActiveTrial ? (
              <div className="text-center">
                <p className={`text-xl font-bold ${trialDaysRemaining <= 2 ? 'text-warning' : 'text-text'}`}>
                  {trialDaysRemaining}
                </p>
                <p className="text-xs text-text-muted uppercase tracking-wider">Days Left</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-xl font-bold text-error">0</p>
                <p className="text-xs text-text-muted uppercase tracking-wider">Days Left</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Account Section */}
      <section className="mb-8">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Account</h2>
        <div className="card space-y-0 divide-y divide-border">
          <div className="flex items-center justify-between py-4 px-1">
            <span className="text-text">Email</span>
            <span className="text-text-muted">{user?.email || '—'}</span>
          </div>

          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full flex items-center justify-between py-4 px-1 disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <LogOut size={20} className="text-text-secondary" />
              <span className="text-text">Sign Out</span>
            </div>
            <ChevronRight size={20} className="text-text-muted" />
          </button>

          <button
            onClick={handleDeleteAccount}
            disabled={isDeletingAccount}
            className="w-full flex items-center justify-between py-4 px-1 disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              {isDeletingAccount ? (
                <div className="w-5 h-5 border-2 border-error border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 size={20} className="text-error" />
              )}
              <span className="text-error">
                {isDeletingAccount ? 'Deleting Account...' : 'Delete Account'}
              </span>
            </div>
            {!isDeletingAccount && <ChevronRight size={20} className="text-error" />}
          </button>
        </div>
      </section>

      {/* About Section */}
      <section className="mb-8">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">About</h2>
        <div className="card">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Info size={20} className="text-text-muted" />
              <span className="text-text">Version</span>
            </div>
            <span className="text-text-muted">1.0.0</span>
          </div>
        </div>
      </section>

      {/* Feature Request Section */}
      <section className="mb-8">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
          We&apos;d Love to Hear From You
        </h2>
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <MessageCircleHeart size={28} className="text-accent" />
            <span className="text-xl font-semibold text-text">Got an idea? Tell us!</span>
          </div>
          
          <p className="text-text-secondary mb-4 leading-relaxed">
            Is there something you wish this app could do? We&apos;re always looking for ways to make things easier for you.
          </p>

          {showThankYou ? (
            <div className="bg-success/15 rounded-xl p-5 text-center">
              <p className="text-lg font-semibold text-success mb-2">🎉 Thank you so much!</p>
              <p className="text-sm text-text-secondary">
                We got your idea and we really appreciate you taking the time to share it with us.
              </p>
            </div>
          ) : (
            <>
              <textarea
                placeholder="For example: I'd love a way to share recordings with my family..."
                value={featureRequest}
                onChange={(e) => setFeatureRequest(e.target.value)}
                className="input min-h-[100px] resize-none mb-4"
              />
              <button
                onClick={handleSubmitFeatureRequest}
                disabled={isSubmitting}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <Send size={18} />
                {isSubmitting ? 'Sending...' : 'Send My Idea'}
              </button>
            </>
          )}
        </div>
      </section>

      {/* Disclaimer */}
      <p className="text-sm text-text-muted text-center px-4 leading-relaxed">
        Legal Meeting Intelligence uses AI to generate summaries. AI-generated
        content may contain errors and should not be relied upon as legal
        advice. Always verify important information independently.
      </p>
    </div>
  );
}

