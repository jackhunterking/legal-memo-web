'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { MeetingShare, MeetingShareLink } from '@/types';
import { generateShareToken } from '@/types';

// Share viewer URL - external viewer hosted on Vercel
const SHARE_VIEWER_URL = process.env.NEXT_PUBLIC_SHARE_VIEWER_URL || 'https://share-viewer.vercel.app';

/**
 * Hash password using Web Crypto API (SHA-256 with salt)
 * Format: "salt:hash" - same format as mobile app
 */
async function hashPassword(password: string): Promise<string> {
  // Generate a random salt (16 hex characters)
  const saltArray = new Uint8Array(8);
  crypto.getRandomValues(saltArray);
  const salt = Array.from(saltArray, byte => byte.toString(16).padStart(2, '0')).join('');
  
  // Hash the salt + password using SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  
  return `${salt}:${hash}`;
}

/**
 * Hook to get all share links for a meeting
 */
export function useMeetingShares(meetingId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['meetingShares', meetingId, user?.id],
    queryFn: async (): Promise<MeetingShareLink[]> => {
      if (!meetingId || !user?.id) return [];
      console.log('[useMeetingShares] Fetching share links for meeting:', meetingId);
      
      const { data, error } = await supabase
        .from('meeting_shares')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[useMeetingShares] Error fetching share links:', error.message);
        return [];
      }
      
      // Build share URLs using the external viewer
      const shares: MeetingShareLink[] = (data || []).map((share: MeetingShare) => ({
        id: share.id,
        shareUrl: `${SHARE_VIEWER_URL}?token=${share.share_token}`,
        hasPassword: !!share.password_hash,
        isActive: share.is_active,
        viewCount: share.view_count,
        lastViewedAt: share.last_viewed_at,
        expiresAt: share.expires_at,
        createdAt: share.created_at,
      }));
      
      console.log('[useMeetingShares] Fetched', shares.length, 'share links');
      return shares;
    },
    enabled: !!meetingId && !!user?.id,
  });
}

/**
 * Hook to create a new share link for a meeting
 */
export function useCreateShare() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      meetingId,
      password,
      expiresAt,
    }: {
      meetingId: string;
      password?: string;
      expiresAt?: string;
    }): Promise<MeetingShareLink> => {
      if (!user?.id) throw new Error('Not authenticated');
      console.log('[useCreateShare] Creating share link for meeting:', meetingId);
      
      // Generate a secure random token
      const shareToken = generateShareToken();
      
      // Hash password if provided using Web Crypto API
      let passwordHash: string | null = null;
      if (password) {
        passwordHash = await hashPassword(password);
      }
      
      const { data, error } = await supabase
        .from('meeting_shares')
        .insert({
          meeting_id: meetingId,
          share_token: shareToken,
          password_hash: passwordHash,
          expires_at: expiresAt || null,
          is_active: true,
          view_count: 0,
        })
        .select()
        .single();
      
      if (error) {
        console.error('[useCreateShare] Error creating share link:', error.message);
        throw new Error(error.message || 'Failed to create share link');
      }
      
      // Build the share URL
      const shareUrl = `${SHARE_VIEWER_URL}?token=${shareToken}`;
      
      console.log('[useCreateShare] Created share link:', data.id);
      
      return {
        id: data.id,
        shareUrl,
        hasPassword: !!passwordHash,
        isActive: data.is_active,
        viewCount: data.view_count,
        lastViewedAt: data.last_viewed_at,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meetingShares', variables.meetingId] });
    },
  });
}

/**
 * Hook to toggle share link active status (deactivate/reactivate)
 */
export function useToggleShare() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      shareId,
      isActive,
    }: {
      shareId: string;
      isActive: boolean;
    }): Promise<void> => {
      console.log('[useToggleShare] Toggling share link:', shareId, 'to', isActive);
      
      const { error } = await supabase
        .from('meeting_shares')
        .update({ is_active: isActive })
        .eq('id', shareId);
      
      if (error) {
        console.error('[useToggleShare] Error toggling share link:', error.message);
        throw new Error(error.message || 'Failed to update share link');
      }
      
      console.log('[useToggleShare] Share link toggled');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetingShares'] });
    },
  });
}

/**
 * Hook to delete a share link
 */
export function useDeleteShare() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (shareId: string): Promise<void> => {
      console.log('[useDeleteShare] Deleting share link:', shareId);
      
      const { error } = await supabase
        .from('meeting_shares')
        .delete()
        .eq('id', shareId);
      
      if (error) {
        console.error('[useDeleteShare] Error deleting share link:', error.message);
        throw new Error(error.message || 'Failed to delete share link');
      }
      
      console.log('[useDeleteShare] Share link deleted');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetingShares'] });
    },
  });
}

