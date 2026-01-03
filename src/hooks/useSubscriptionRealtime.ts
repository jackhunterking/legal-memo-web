'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook that subscribes to real-time changes in the subscriptions table.
 * When Polar webhooks update the database, this hook automatically
 * invalidates React Query cache, causing the UI to refresh instantly.
 * 
 * This implements the "Webhooks update DB, Realtime pushes to clients" pattern.
 */
export function useSubscriptionRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribed = useRef(false);

  useEffect(() => {
    if (!user?.id) {
      // Clean up if user logs out
      if (channelRef.current) {
        console.log('[SubscriptionRealtime] Cleaning up channel (no user)');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribed.current = false;
      }
      return;
    }

    // Prevent duplicate subscriptions
    if (isSubscribed.current) {
      return;
    }

    console.log('[SubscriptionRealtime] Setting up realtime subscription for user:', user.id);

    // Subscribe to changes on the subscriptions table for this user
    const channel = supabase
      .channel(`subscription-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[SubscriptionRealtime] Change received:', payload.eventType);
          console.log('[SubscriptionRealtime] New status:', (payload.new as Record<string, unknown>)?.status);
          
          // Invalidate subscription-related queries
          // This triggers a refetch, updating the UI automatically
          queryClient.invalidateQueries({ queryKey: ['subscription'] });
          queryClient.invalidateQueries({ queryKey: ['canRecord'] });
          queryClient.invalidateQueries({ queryKey: ['usageCredits'] });
          
          // If status changed, also invalidate profile queries in case trial info needs refresh
          if (payload.eventType === 'UPDATE') {
            const oldStatus = (payload.old as Record<string, unknown>)?.status;
            const newStatus = (payload.new as Record<string, unknown>)?.status;
            
            if (oldStatus !== newStatus) {
              console.log('[SubscriptionRealtime] Status changed from', oldStatus, 'to', newStatus);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[SubscriptionRealtime] Channel status:', status);
        if (status === 'SUBSCRIBED') {
          isSubscribed.current = true;
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount or user change
    return () => {
      console.log('[SubscriptionRealtime] Cleaning up channel');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribed.current = false;
      }
    };
  }, [user?.id, queryClient]);

  return {
    isSubscribed: isSubscribed.current,
  };
}

