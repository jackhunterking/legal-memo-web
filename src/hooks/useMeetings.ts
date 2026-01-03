'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { 
  Meeting, 
  MeetingWithContact, 
  MeetingWithDetails,
  Transcript, 
  TranscriptSegment,
  MeetingType 
} from '@/types';

export function useMeetings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Optimistically update a meeting in the cache
  const optimisticallyUpdateMeeting = useCallback((
    meetingId: string,
    updates: Partial<MeetingWithContact>
  ) => {
    queryClient.setQueryData<MeetingWithContact[]>(
      ['meetings', user?.id],
      (old) => {
        if (!old) return old;
        return old.map((m) =>
          m.id === meetingId ? { ...m, ...updates } : m
        );
      }
    );
  }, [queryClient, user?.id]);

  // Optimistically add a new meeting to the cache (for immediate display after recording)
  const optimisticallyAddMeeting = useCallback((meeting: MeetingWithContact) => {
    queryClient.setQueryData<MeetingWithContact[]>(
      ['meetings', user?.id],
      (old) => {
        if (!old) return [meeting];
        // Add to beginning of list (most recent first)
        // Replace if already exists
        const filtered = old.filter((m) => m.id !== meeting.id);
        return [meeting, ...filtered];
      }
    );
  }, [queryClient, user?.id]);

  // Prefetch meeting details for faster navigation
  const prefetchMeetingDetails = useCallback(async (meetingId: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['meeting', meetingId],
      queryFn: async () => {
        const { data: meeting } = await supabase
          .from('meetings')
          .select(`
            *,
            meeting_type:meeting_types(*),
            contact:contacts(
              *,
              category:contact_categories(*)
            )
          `)
          .eq('id', meetingId)
          .single();
        return meeting;
      },
      staleTime: 30 * 1000, // 30 seconds
    });
  }, [queryClient]);

  // Fetch all meetings
  const { 
    data: meetings = [], 
    isLoading, 
    isRefetching,
    refetch 
  } = useQuery({
    queryKey: ['meetings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          contact:contacts(
            id,
            first_name,
            last_name,
            category_id,
            category:contact_categories(id, name, color)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as MeetingWithContact[];
    },
    enabled: !!user?.id,
  });

  // Fetch meeting types
  const { 
    data: meetingTypes = [],
    isLoading: isMeetingTypesLoading,
    refetch: refetchMeetingTypes,
  } = useQuery({
    queryKey: ['meetingTypes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('meeting_types')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as MeetingType[];
    },
    enabled: !!user?.id,
  });

  // Create meeting
  const { mutateAsync: createMeeting, isPending: isCreating } = useMutation({
    mutationFn: async (expectedSpeakers: number = 2) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('meetings')
        .insert({
          user_id: user.id,
          title: `Meeting - ${new Date().toLocaleDateString()}`,
          status: 'uploading',
          duration_seconds: 0,
          expected_speakers: expectedSpeakers,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });

  // Update meeting
  const { mutateAsync: updateMeeting, isPending: isUpdating } = useMutation({
    mutationFn: async ({ meetingId, updates }: { meetingId: string; updates: Partial<Meeting> }) => {
      const { data, error } = await supabase
        .from('meetings')
        .update(updates)
        .eq('id', meetingId)
        .select()
        .single();
      
      if (error) throw error;
      return data as Meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });

  // Delete meeting
  const { mutateAsync: deleteMeeting, isPending: isDeleting } = useMutation({
    mutationFn: async (meetingId: string) => {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });

  // Create meeting type
  const { mutateAsync: createMeetingType, isPending: isCreatingType } = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('meeting_types')
        .insert({
          user_id: user.id,
          name,
          color,
          display_order: meetingTypes.length,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as MeetingType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetingTypes'] });
    },
  });

  // Update meeting type
  const { mutateAsync: updateMeetingType, isPending: isUpdatingType } = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MeetingType> }) => {
      const { data, error } = await supabase
        .from('meeting_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as MeetingType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetingTypes'] });
    },
  });

  // Delete meeting type
  const { mutateAsync: deleteMeetingType, isPending: isDeletingType } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('meeting_types')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetingTypes'] });
    },
  });

  return {
    meetings,
    meetingTypes,
    isLoading,
    isRefetching,
    isMeetingTypesLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isCreatingType,
    isUpdatingType,
    isDeletingType,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    createMeetingType,
    updateMeetingType,
    deleteMeetingType,
    refetchMeetings: refetch,
    refetchMeetingTypes,
    // Optimistic update helpers for better UX
    optimisticallyUpdateMeeting,
    optimisticallyAddMeeting,
    prefetchMeetingDetails,
  };
}

// Hook for fetching a single meeting with full details
export function useMeetingDetails(meetingId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: async () => {
      if (!meetingId || !user?.id) return null;
      
      // Fetch meeting with related data
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select(`
          *,
          meeting_type:meeting_types(*),
          contact:contacts(
            *,
            category:contact_categories(*)
          )
        `)
        .eq('id', meetingId)
        .eq('user_id', user.id)
        .single();
      
      if (meetingError) throw meetingError;
      if (!meeting) throw new Error('Meeting not found');
      
      // Fetch transcript
      const { data: transcript } = await supabase
        .from('transcripts')
        .select('*')
        .eq('meeting_id', meetingId)
        .single();
      
      // Fetch segments
      const { data: segments } = await supabase
        .from('transcript_segments')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('start_ms', { ascending: true });
      
      return {
        ...meeting,
        transcript,
        segments: segments ?? [],
      } as MeetingWithDetails;
    },
    enabled: !!meetingId && !!user?.id,
  });
}

