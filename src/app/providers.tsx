'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { useSubscriptionRealtime } from '@/hooks/useSubscriptionRealtime';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Background verification interval (verify subscription on app open)
const BACKGROUND_VERIFY_ENABLED = true;

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const setUser = useAuthStore((state) => state.setUser);
  const setSession = useAuthStore((state) => state.setSession);
  const setProfile = useAuthStore((state) => state.setProfile);
  const setLoading = useAuthStore((state) => state.setLoading);
  const initialized = useRef(false);
  const loadingSetToFalse = useRef(false);
  const backgroundVerifyDone = useRef(false);
  const passwordRecoveryHandled = useRef(false);

  // Initialize auth on mount
  useEffect(() => {
    // Prevent double initialization in React strict mode
    if (initialized.current) return;
    initialized.current = true;

    let isActive = true;

    // Helper to set loading to false only once
    const setLoadingFalseOnce = () => {
      if (!loadingSetToFalse.current && isActive) {
        loadingSetToFalse.current = true;
        console.log('[Providers] Setting isLoading to false');
        setLoading(false);
      }
    };

    console.log('[Providers] Starting auth initialization...');
    
    // Safety timeout - if onAuthStateChange doesn't fire within 3s, clear loading
    const loadingTimeout = setTimeout(() => {
      console.warn('[Providers] Auth initialization timeout - forcing loading to false');
      setLoadingFalseOnce();
    }, 3000);

    // Listen for auth changes - this fires IMMEDIATELY with cached session
    // This is the primary source of truth for auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Providers] Auth state changed:', event);
        
        if (!isActive) return;
        
        // Clear the timeout since we got an auth response
        clearTimeout(loadingTimeout);
        
        // Handle PASSWORD_RECOVERY event - redirect to reset password page
        // This handles the case where user clicks reset link and gets redirected here
        if (event === 'PASSWORD_RECOVERY' && !passwordRecoveryHandled.current) {
          console.log('[Providers] PASSWORD_RECOVERY event detected, redirecting to /reset-password');
          passwordRecoveryHandled.current = true;
          // Set the session first so the reset password page can use it
          if (session) {
            setUser(session.user);
            setSession(session);
          }
          setLoadingFalseOnce();
          router.replace('/reset-password');
          return;
        }
        
        if (session) {
          setUser(session.user);
          setSession(session);
          
          // Fetch profile on any session event
          supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            .then(({ data: profile, error: profileError }) => {
              if (!isActive) return;
              if (profileError) {
                console.error('[Providers] Profile fetch error:', profileError);
              }
              if (profile) {
                console.log('[Providers] Profile loaded:', profile.email);
                setProfile(profile);
              }
            });
          
          // Background verify subscription after sign in (not INITIAL_SESSION)
          if (event === 'SIGNED_IN' && BACKGROUND_VERIFY_ENABLED && !backgroundVerifyDone.current) {
            backgroundVerifyDone.current = true;
            backgroundVerifySubscription(session.access_token);
          }
        } else {
          setUser(null);
          setSession(null);
          setProfile(null);
          backgroundVerifyDone.current = false;
        }
        
        // Set loading false after processing auth state
        setLoadingFalseOnce();
      }
    );

    return () => {
      isActive = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [setUser, setSession, setProfile, setLoading, router]);

  // Background subscription verification (runs silently on app open)
  const backgroundVerifySubscription = useCallback(async (accessToken: string) => {
    try {
      console.log('[Providers] Background subscription verification starting...');
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/verify-subscription`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ forceRefresh: false }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log('[Providers] Background verification result:', result.status, result.statusChanged ? '(CHANGED)' : '');
        
        // If status changed, invalidate queries to refresh UI
        if (result.statusChanged) {
          console.log('[Providers] Status changed, invalidating queries...');
          queryClient.invalidateQueries({ queryKey: ['subscription'] });
          queryClient.invalidateQueries({ queryKey: ['canRecord'] });
        }
      } else {
        console.warn('[Providers] Background verification failed:', response.status);
      }
    } catch (error) {
      // Silently fail - this is background verification
      console.warn('[Providers] Background verification error:', error);
    }
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeSubscriptionProvider>
        {children}
      </RealtimeSubscriptionProvider>
    </QueryClientProvider>
  );
}

/**
 * Inner component that initializes the realtime subscription.
 * Must be inside QueryClientProvider to use the hook.
 */
function RealtimeSubscriptionProvider({ children }: { children: React.ReactNode }) {
  // Initialize realtime subscription for subscription table changes
  useSubscriptionRealtime();
  
  return <>{children}</>;
}
