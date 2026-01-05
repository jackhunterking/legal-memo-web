'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Play,
  Pause,
  Share2,
  Trash2,
  Clock,
  DollarSign,
  User,
  Tag,
  Check,
  RefreshCw,
  AlertCircle,
  Lock,
  Mic,
  ChevronRight,
  MoreVertical,
  Pencil,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMeetings } from '@/hooks/useMeetings';
import { useUsage } from '@/hooks/useUsage';
import { useAuth } from '@/hooks/useAuth';
import { useContacts } from '@/hooks/useContacts';
import { useMeetingShares, useCreateShare, useToggleShare, useDeleteShare } from '@/hooks/useMeetingShares';
import { supabase } from '@/lib/supabase';
import Colors from '@/lib/colors';
import { formatDuration, formatCurrency, formatBillableHours, MeetingStatus, Transcript, TranscriptSegment } from '@/types';
import TranscriptSection from '@/components/ui/TranscriptSection';
import BillableEditorModal from '@/components/ui/BillableEditorModal';
import ShareMeetingModal from '@/components/ui/ShareMeetingModal';
import MeetingNameModal from '@/components/ui/MeetingNameModal';
import MeetingTypeModal from '@/components/ui/MeetingTypeModal';
import ContactSelectorModal from '@/components/ui/ContactSelectorModal';

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;
  
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const { meetings, meetingTypes, deleteMeeting, updateMeeting, isLoading: isMeetingsLoading, refetchMeetings } = useMeetings();
  const { hasActiveSubscription, hasActiveTrial } = useUsage();
  const { contacts } = useContacts();
  
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [speakerNames, setSpeakerNames] = useState<Record<string, string> | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [showBillableEditor, setShowBillableEditor] = useState(false);
  const [isSavingBilling, setIsSavingBilling] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showMeetingNameModal, setShowMeetingNameModal] = useState(false);
  const [showMeetingTypeModal, setShowMeetingTypeModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingType, setIsSavingType] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  
  // Share hooks
  const { data: shares = [], isLoading: isLoadingShares } = useMeetingShares(meetingId);
  const { mutateAsync: createShare, isPending: isCreatingShare } = useCreateShare();
  const { mutateAsync: toggleShare, isPending: isTogglingShare } = useToggleShare();
  const { mutateAsync: deleteShare } = useDeleteShare();
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const meeting = meetings?.find(m => m.id === meetingId);
  const meetingType = meeting?.meeting_type_id 
    ? meetingTypes?.find(t => t.id === meeting.meeting_type_id) 
    : null;
  
  // Check if meeting is locked (subscription lapsed)
  const isLocked = meeting?.status === 'ready' && 
    !hasActiveSubscription && 
    !hasActiveTrial;

  // Initialize speaker names from meeting data
  useEffect(() => {
    if (meeting?.speaker_names) {
      setSpeakerNames(meeting.speaker_names);
    }
  }, [meeting?.speaker_names]);
  
  // Load transcript and audio - wait for user auth to be ready
  useEffect(() => {
    // Don't attempt to load until we have auth ready and meeting exists
    if (isAuthLoading || !user) {
      return;
    }
    
    if (!meeting) {
      // If meetings have loaded but this meeting doesn't exist
      if (!isMeetingsLoading) {
        setLoadError('Meeting not found');
        setIsLoadingDetails(false);
      }
      return;
    }
    
    const loadData = async () => {
      setIsLoadingDetails(true);
      setLoadError(null);
      
      try {
        // Ensure we have a valid session before making requests
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('[MeetingDetail] No valid session:', sessionError);
          setLoadError('Authentication required. Please sign in again.');
          setIsLoadingDetails(false);
          return;
        }

        // Load transcript
        const { data: transcriptData, error: transcriptError } = await supabase
          .from('transcripts')
          .select('*')
          .eq('meeting_id', meetingId)
          .single();
        
        if (transcriptError && transcriptError.code !== 'PGRST116') {
          // PGRST116 = not found, which is okay for new meetings
          console.error('[MeetingDetail] Transcript error:', transcriptError);
        }
        
        if (transcriptData) {
          setTranscript(transcriptData);
        }

        // Load transcript segments
        const { data: segmentsData, error: segmentsError } = await supabase
          .from('transcript_segments')
          .select('*')
          .eq('meeting_id', meetingId)
          .order('start_ms', { ascending: true });
        
        if (segmentsError) {
          console.error('[MeetingDetail] Segments error:', segmentsError);
        }
        
        if (segmentsData) {
          setSegments(segmentsData);
        }
        
        // Load audio URL
        if (meeting.raw_audio_path) {
          const { data: signedUrlData, error: urlError } = await supabase.storage
            .from('meeting-audio')
            .createSignedUrl(meeting.raw_audio_path, 3600); // 1 hour expiry
          
          if (urlError) {
            console.error('[MeetingDetail] Audio URL error:', urlError);
          } else if (signedUrlData) {
            setAudioUrl(signedUrlData.signedUrl);
          }
        }
      } catch (err) {
        console.error('[MeetingDetail] Error loading data:', err);
        setLoadError('Failed to load meeting details');
      } finally {
        setIsLoadingDetails(false);
      }
    };
    
    loadData();
  }, [meeting, meetingId, user, isAuthLoading, isMeetingsLoading]);

  // Poll for meeting status updates when processing
  useEffect(() => {
    const isProcessing = meeting?.status === 'queued' || 
      meeting?.status === 'converting' || 
      meeting?.status === 'transcribing' ||
      meeting?.status === 'uploading';
    
    if (!isProcessing || !meeting) {
      return;
    }

    console.log('[MeetingDetail] Meeting is processing, starting poll interval');
    
    // Poll every 5 seconds while processing
    const pollInterval = setInterval(async () => {
      console.log('[MeetingDetail] Polling for status update...');
      
      // Refetch meetings to get updated status
      await refetchMeetings();
      
      // If status changed to ready, also reload transcript data
      const { data: currentMeeting } = await supabase
        .from('meetings')
        .select('status')
        .eq('id', meetingId)
        .single();
      
      if (currentMeeting?.status === 'ready') {
        console.log('[MeetingDetail] Meeting ready, loading transcript data');
        
        // Load transcript
        const { data: transcriptData } = await supabase
          .from('transcripts')
          .select('*')
          .eq('meeting_id', meetingId)
          .single();
        
        if (transcriptData) {
          setTranscript(transcriptData);
        }

        // Load transcript segments
        const { data: segmentsData } = await supabase
          .from('transcript_segments')
          .select('*')
          .eq('meeting_id', meetingId)
          .order('start_ms', { ascending: true });
        
        if (segmentsData) {
          setSegments(segmentsData);
        }
      }
    }, 5000);

    return () => {
      console.log('[MeetingDetail] Clearing poll interval');
      clearInterval(pollInterval);
    };
  }, [meeting?.status, meeting?.id, meetingId, refetchMeetings]);
  
  // Audio controls
  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);
  
  const handleSkip = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(
      audioRef.current.currentTime + seconds,
      duration
    ));
  }, [duration]);
  
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);
  
  // Delete meeting
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this meeting? This cannot be undone.')) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await deleteMeeting(meetingId);
      router.replace('/meetings');
    } catch (err) {
      console.error('[MeetingDetail] Delete error:', err);
      alert('Failed to delete meeting');
      setIsDeleting(false);
    }
  };

  // Update speaker names
  const handleSpeakerNamesChange = async (names: Record<string, string>) => {
    try {
      await updateMeeting({
        meetingId,
        updates: { speaker_names: names },
      });
      setSpeakerNames(names);
    } catch (err) {
      console.error('[MeetingDetail] Speaker names error:', err);
      throw err;
    }
  };

  // Handle billing save
  const handleSaveBilling = async (data: {
    isBillable: boolean;
    billableHours: number | null;
    billableAmount: number | null;
  }) => {
    setIsSavingBilling(true);
    try {
      await updateMeeting({
        meetingId,
        updates: {
          is_billable: data.isBillable,
          billable_hours: data.billableHours,
          billable_amount: data.billableAmount,
        },
      });
      setShowBillableEditor(false);
    } catch (err) {
      console.error('[MeetingDetail] Save billing error:', err);
      throw err;
    } finally {
      setIsSavingBilling(false);
    }
  };

  // Handle billable toggle
  const handleBillableToggle = async () => {
    if (meeting?.is_billable) {
      // Turning off billing - just update
      try {
        await updateMeeting({
          meetingId,
          updates: {
            is_billable: false,
            billable_hours: null,
            billable_amount: null,
          },
        });
      } catch (err) {
        console.error('[MeetingDetail] Toggle billing error:', err);
      }
    } else {
      // Turning on billing - open editor modal
      setShowBillableEditor(true);
    }
  };

  // Submit speaker feedback
  const handleSubmitFeedback = async (feedbackType?: string, notes?: string) => {
    setIsSubmittingFeedback(true);
    try {
      console.log('[MeetingDetail] Submitting speaker feedback for meeting:', meetingId);
      console.log('[MeetingDetail] Feedback type:', feedbackType || 'none (notes only)');
      
      // Build request body with only provided fields
      const requestBody: {
        meeting_id: string;
        feedback_type?: string;
        notes?: string;
      } = {
        meeting_id: meetingId,
      };
      
      if (feedbackType) {
        requestBody.feedback_type = feedbackType;
      }
      
      if (notes && notes.trim().length > 0) {
        requestBody.notes = notes;
      }
      
      const { error } = await supabase.functions.invoke('speaker-feedback', {
        body: requestBody,
      });
      
      if (error) {
        console.error('[MeetingDetail] Feedback submission error:', error);
        throw new Error(error.message || 'Failed to submit feedback');
      }
      
      console.log('[MeetingDetail] Feedback submitted successfully');
    } catch (err) {
      console.error('[MeetingDetail] Feedback error:', err);
      throw err;
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Seek audio to timestamp
  const handleSeekToTimestamp = useCallback((ms: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = ms / 1000;
    if (!isPlaying) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  // Handle meeting name save
  const handleSaveMeetingName = async (newTitle: string) => {
    setIsSavingName(true);
    try {
      await updateMeeting({
        meetingId,
        updates: { title: newTitle },
      });
      setShowMeetingNameModal(false);
    } catch (err) {
      console.error('[MeetingDetail] Save name error:', err);
      throw err;
    } finally {
      setIsSavingName(false);
    }
  };

  // Handle meeting type save
  const handleSaveMeetingType = async (typeId: string | null) => {
    setIsSavingType(true);
    try {
      await updateMeeting({
        meetingId,
        updates: { meeting_type_id: typeId },
      });
      setShowMeetingTypeModal(false);
    } catch (err) {
      console.error('[MeetingDetail] Save type error:', err);
      throw err;
    } finally {
      setIsSavingType(false);
    }
  };

  // Handle contact save
  const handleSaveContact = async (contactId: string | null) => {
    setIsSavingContact(true);
    try {
      await updateMeeting({
        meetingId,
        updates: { contact_id: contactId },
      });
      setShowContactModal(false);
    } catch (err) {
      console.error('[MeetingDetail] Save contact error:', err);
      throw err;
    } finally {
      setIsSavingContact(false);
    }
  };
  
  // Share modal handlers
  const handleOpenShareModal = () => {
    setShowShareModal(true);
  };

  const handleCreateShare = async (password?: string) => {
    return createShare({ meetingId, password });
  };

  const handleToggleShare = async (shareId: string, isActive: boolean) => {
    await toggleShare({ shareId, isActive });
  };

  const handleDeleteShare = async (shareId: string) => {
    await deleteShare(shareId);
  };
  
  
  // Format time display
  const formatTime = (seconds: number): string => {
    if (!seconds || !isFinite(seconds) || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get duration color based on length
  const getDurationColor = (seconds: number): string => {
    if (seconds < 1800) return Colors.success; // < 30 min = green
    if (seconds < 3600) return '#3B82F6'; // < 1 hr = blue
    return Colors.warning; // > 1 hr = orange
  };

  // Format compact date/time
  const formatCompactDateTime = (date: Date): string => {
    const month = date.toLocaleDateString(undefined, { month: 'short' });
    const day = date.getDate();
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${month} ${day} • ${time}`;
  };

  // Format recording timeline
  const formatRecordingTimeline = (startDate: Date, durationSeconds: number): string => {
    const endDate = new Date(startDate.getTime() + durationSeconds * 1000);
    const startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `Started ${startTime} → Ended ${endTime}`;
  };

  // Get contact initials
  const getContactInitials = (contact: { first_name: string; last_name?: string | null }): string => {
    const first = contact.first_name?.charAt(0) || '';
    const last = contact.last_name?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  };
  
  // Get status display
  const getStatusDisplay = (status: MeetingStatus) => {
    switch (status) {
      case 'transcribing':
      case 'converting':
        return { label: 'Processing', color: Colors.statusProcessing, icon: RefreshCw };
      case 'ready':
        return { label: 'Ready', color: Colors.statusReady, icon: Check };
      case 'failed':
        return { label: 'Failed', color: Colors.statusFailed, icon: AlertCircle };
      case 'uploading':
        return { label: 'Uploading', color: Colors.statusProcessing, icon: RefreshCw };
      case 'queued':
      default:
        return { label: 'Queued', color: Colors.textMuted, icon: Clock };
    }
  };
  
  // Show skeleton UI while auth or meetings are loading
  if (isAuthLoading || isMeetingsLoading) {
    return (
      <div className="min-h-screen pb-8">
        {/* Skeleton Header */}
        <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="w-10 h-10 bg-surface rounded-lg animate-pulse" />
            <div className="h-6 w-40 bg-surface rounded animate-pulse" />
            <div className="w-10 h-10 bg-surface rounded-lg animate-pulse" />
          </div>
        </div>
        
        {/* Skeleton Meeting Info */}
        <div className="px-4 py-4">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="h-6 w-24 bg-surface rounded-md animate-pulse" />
            <div className="h-6 w-20 bg-surface rounded-md animate-pulse" />
          </div>
          <div className="h-4 w-48 bg-surface rounded animate-pulse" />
        </div>
        
        {/* Skeleton Content */}
        <div className="mx-4 bg-surface rounded-2xl p-6 border border-border">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-3 border-accent-light border-t-transparent rounded-full animate-spin" />
            <div className="h-5 w-32 bg-surface-light rounded animate-pulse" />
            <div className="h-4 w-48 bg-surface-light rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="card max-w-md w-full text-center">
          <AlertCircle size={48} className="text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text mb-2">
            {loadError === 'Meeting not found' ? 'Meeting Not Found' : 'Error Loading Meeting'}
          </h2>
          <p className="text-text-secondary mb-6">{loadError}</p>
          <button
            onClick={() => router.replace('/meetings')}
            className="btn-secondary"
          >
            Go to Meetings
          </button>
        </div>
      </div>
    );
  }

  // Meeting not found after loading completes
  if (!meeting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="card max-w-md w-full text-center">
          <AlertCircle size={48} className="text-warning mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text mb-2">Meeting Not Found</h2>
          <p className="text-text-secondary mb-6">
            This meeting may have been deleted or you don&apos;t have access to it.
          </p>
          <button
            onClick={() => router.replace('/meetings')}
            className="btn-secondary"
          >
            Go to Meetings
          </button>
        </div>
      </div>
    );
  }

  // Show skeleton while details are being fetched (but meeting exists)
  // This provides a better UX by showing the meeting structure immediately
  if (isLoadingDetails && meeting) {
    return (
      <div className="min-h-screen pb-8">
        {/* Header - Show real data */}
        <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10">
          <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-surface rounded-lg transition-colors"
            >
              <ArrowLeft size={24} className="text-text" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-surface rounded-xl border border-border">
                <Share2 size={18} className="text-text-secondary" />
                <span className="text-sm font-medium text-text">Share</span>
              </div>
              <div className="p-2"><MoreVertical size={20} className="text-text-secondary" /></div>
            </div>
          </div>
        </div>
        
        {/* Meeting Details Card Skeleton */}
        <div className="mx-4 mt-4 bg-surface rounded-2xl border border-border overflow-hidden">
          <div className="p-5 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={24} className="text-success" />
              <span className="text-3xl font-bold text-success">
                {formatDuration(meeting.duration_seconds)}
              </span>
            </div>
            <p className="text-text-secondary text-sm">
              {formatCompactDateTime(new Date(meeting.created_at))}
            </p>
          </div>
          <div className="h-px bg-border mx-4" />
          <div className="p-4 space-y-3">
            <div className="h-12 bg-surface-light rounded-lg animate-pulse" />
            <div className="h-12 bg-surface-light rounded-lg animate-pulse" />
            <div className="h-12 bg-surface-light rounded-lg animate-pulse" />
          </div>
        </div>
        
        {/* Loading Content Skeleton */}
        <div className="mx-4 mt-4 space-y-4">
          <div className="bg-surface rounded-2xl p-4 border border-border">
            <div className="h-5 w-24 bg-surface-light rounded mb-3 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-surface-light rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-surface-light rounded animate-pulse" />
              <div className="h-4 w-4/6 bg-surface-light rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const statusInfo = getStatusDisplay(meeting.status);
  const StatusIcon = statusInfo.icon;
  
  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-surface rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-text" />
          </button>
          
          {/* Action Buttons - Share button + 3-dot menu */}
          <div className="flex items-center gap-2">
            {/* Share Button with text */}
            <button
              onClick={handleOpenShareModal}
              className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-light rounded-xl transition-colors border border-border"
            >
              <Share2 size={18} className="text-text-secondary" />
              <span className="text-sm font-medium text-text">Share</span>
            </button>
            
            {/* 3-dot Menu */}
            <div className="relative">
              <button
                onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                className="p-2 hover:bg-surface rounded-lg transition-colors"
              >
                <MoreVertical size={20} className="text-text-secondary" />
              </button>
              
              {/* Dropdown Menu */}
              <AnimatePresence>
                {showHeaderMenu && (
                  <>
                    {/* Backdrop to close menu */}
                    <div 
                      className="fixed inset-0 z-20" 
                      onClick={() => setShowHeaderMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-surface rounded-xl border border-border shadow-xl z-30 overflow-hidden"
                    >
                      <button
                        onClick={() => {
                          setShowHeaderMenu(false);
                          setShowMeetingNameModal(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-light transition-colors text-left"
                      >
                        <Pencil size={18} className="text-text-secondary" />
                        <span className="text-text text-sm font-medium">Edit Name</span>
                      </button>
                      <div className="h-px bg-border" />
                      <button
                        onClick={() => {
                          setShowHeaderMenu(false);
                          handleDelete();
                        }}
                        disabled={isDeleting}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-light transition-colors text-left disabled:opacity-50"
                      >
                        <Trash2 size={18} className="text-error" />
                        <span className="text-error text-sm font-medium">Delete Meeting</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      
      {/* Locked Banner */}
      {isLocked && (
        <div className="max-w-2xl mx-auto px-4 mt-4">
        <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl flex items-center gap-3">
          <Lock size={20} className="text-warning" />
          <div className="flex-1">
            <p className="text-warning font-semibold">Subscription Required</p>
            <p className="text-text-secondary text-sm">Subscribe to access this recording</p>
          </div>
          <button
            onClick={() => router.push('/subscription')}
            className="px-4 py-2 bg-warning text-black font-semibold rounded-lg"
          >
            Subscribe
          </button>
        </div>
        </div>
      )}
      
      {/* Status Banner - shown when not ready */}
      {meeting.status !== 'ready' && (
        <div className="max-w-2xl mx-auto px-4 mt-4">
          <div 
            className="px-4 py-3 rounded-xl flex items-center justify-between"
            style={{ backgroundColor: statusInfo.color + '20' }}
          >
            <span className="font-semibold" style={{ color: statusInfo.color }}>
              {statusInfo.label}
            </span>
            {meeting.status === 'failed' && (
              <button className="flex items-center gap-1.5 text-accent-light font-medium text-sm">
                <RefreshCw size={14} />
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Meeting Details Card */}
      <div className="max-w-2xl mx-auto px-4 mt-4">
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        {/* Header Section - Duration & Date */}
        <div className="p-5 flex flex-col items-center">
          {/* Duration Display */}
          <div className="flex items-center gap-2 mb-2">
            <Clock size={24} style={{ color: getDurationColor(meeting.duration_seconds) }} />
            <span 
              className="text-3xl font-bold"
              style={{ color: getDurationColor(meeting.duration_seconds) }}
            >
              {formatDuration(meeting.duration_seconds)}
            </span>
          </div>
          
          {/* Date & Time */}
          <p className="text-text-secondary text-sm">
            {formatCompactDateTime(new Date(meeting.created_at))}
          </p>
          
          {/* Recording Timeline */}
          {meeting.recorded_at && (
            <p className="text-text-muted text-xs mt-1">
              {formatRecordingTimeline(new Date(meeting.recorded_at), meeting.duration_seconds)}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border mx-4" />

        {/* Body Section - Details */}
        <div className="p-4 space-y-1">
          {/* Meeting Name Row */}
          <button
            onClick={() => setShowMeetingNameModal(true)}
            className="w-full flex items-center justify-between py-3 hover:bg-surface-light rounded-lg px-2 -mx-2 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Pencil size={18} className="text-text-muted" />
              <span className="text-text-secondary">Meeting Name</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text text-sm font-medium truncate max-w-[200px]">
                {meeting.title}
              </span>
              <ChevronRight size={18} className="text-text-muted" />
            </div>
          </button>

          {/* Meeting Type Row */}
          <button
            onClick={() => setShowMeetingTypeModal(true)}
            className="w-full flex items-center justify-between py-3 hover:bg-surface-light rounded-lg px-2 -mx-2 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Tag size={18} className="text-text-muted" />
              <span className="text-text-secondary">Meeting Type</span>
            </div>
            <div className="flex items-center gap-2">
              {meetingType ? (
                <div 
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md"
                  style={{ backgroundColor: meetingType.color + '20' }}
                >
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: meetingType.color }}
                  />
                  <span 
                    className="text-sm font-semibold"
                    style={{ color: meetingType.color }}
                  >
                    {meetingType.name}
                  </span>
                </div>
              ) : (
                <span className="text-text-muted text-sm">Not set</span>
              )}
              <ChevronRight size={18} className="text-text-muted" />
            </div>
          </button>

          {/* Contact Row */}
          <button
            onClick={() => setShowContactModal(true)}
            className="w-full flex items-center justify-between py-3 hover:bg-surface-light rounded-lg px-2 -mx-2 transition-colors"
          >
            <div className="flex items-center gap-3">
              <User size={18} className="text-text-muted" />
              <span className="text-text-secondary">Contact</span>
            </div>
            <div className="flex items-center gap-2">
              {meeting.contact ? (
                <div className="flex items-center gap-2">
                  {/* Avatar */}
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: Colors.accentLight }}
                  >
                    {getContactInitials(meeting.contact)}
                  </div>
                  <div className="text-right">
                    <p className="text-text text-sm font-medium">
                      {meeting.contact.first_name}
                      {meeting.contact.last_name && ` ${meeting.contact.last_name}`}
                    </p>
                  </div>
                </div>
              ) : (
                <span className="text-text-muted text-sm">Not set</span>
              )}
              <ChevronRight size={18} className="text-text-muted" />
            </div>
          </button>

          {/* Billable Row */}
          <div className="flex items-center justify-between py-3 px-2 -mx-2">
            <div className="flex items-center gap-3">
              <DollarSign size={18} className="text-text-muted" />
              <span className="text-text-secondary">Billable</span>
            </div>
            <div className="flex items-center gap-3">
              {meeting.is_billable && meeting.billable_amount && (
                <button
                  onClick={() => setShowBillableEditor(true)}
                  className="text-success text-sm font-semibold hover:underline"
                >
                  {formatCurrency(meeting.billable_amount, profile?.currency_symbol || '$')}
                </button>
              )}
              {/* Toggle Switch */}
              <button
                onClick={handleBillableToggle}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  meeting.is_billable ? 'bg-success' : 'bg-border'
                }`}
              >
                <div 
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    meeting.is_billable ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Billing Card - Show when billable is enabled */}
      {meeting.is_billable && (
        <div className="max-w-2xl mx-auto px-4 mt-4">
        <div className="bg-surface rounded-2xl border border-border overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-text">Billing</h3>
            <button
              onClick={() => setShowBillableEditor(true)}
              className="text-accent-light font-semibold text-sm hover:text-accent-light/80 transition-colors"
            >
              Edit
            </button>
          </div>
          {/* Content */}
          <div className="p-4 text-center">
            {meeting.billable_amount && meeting.billable_amount > 0 ? (
              <>
                <p className="text-3xl font-bold text-success">
                  {formatCurrency(meeting.billable_amount, profile?.currency_symbol || '$')}
                </p>
                <p className="text-text-secondary mt-1">
                  {formatBillableHours(meeting.billable_hours)}
                </p>
                {meeting.billable_hours && profile?.hourly_rate && (
                  <p className="text-text-muted text-sm mt-0.5">
                    {formatBillableHours(meeting.billable_hours)} × {formatCurrency(profile.hourly_rate, profile.currency_symbol || '$')}/hr
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-text-secondary">
                  {meeting.billable_hours ? formatBillableHours(meeting.billable_hours) : 'No time set'}
                </p>
                {!profile?.hourly_rate && (
                  <p className="text-text-muted text-sm mt-1">
                    Set hourly rate to calculate amount
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        </div>
      )}
      
      {/* Audio Player */}
      {audioUrl && !isLocked && (
        <div className="max-w-2xl mx-auto px-4 mt-4 mb-4">
        <div className="bg-surface rounded-2xl p-4 border border-border">
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
            onDurationChange={() => setDuration(audioRef.current?.duration || 0)}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          
          {/* Progress Bar */}
          <div className="mb-4">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-border rounded-full appearance-none cursor-pointer accent-accent-light"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-text-muted">{formatTime(currentTime)}</span>
              <span className="text-xs text-text-muted">{formatTime(duration)}</span>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => handleSkip(-30)}
              className="px-4 py-2 bg-surface-light hover:bg-border rounded-full transition-colors"
            >
              <span className="text-sm font-semibold text-text">-30s</span>
            </button>
            
            <button
              onClick={handlePlayPause}
              className="w-14 h-14 flex items-center justify-center bg-accent-light rounded-full hover:bg-accent-light/90 transition-colors"
            >
              {isPlaying ? (
                <Pause size={28} className="text-white" fill="white" />
              ) : (
                <Play size={28} className="text-white ml-1" fill="white" />
              )}
            </button>
            
            <button
              onClick={() => handleSkip(30)}
              className="px-4 py-2 bg-surface-light hover:bg-border rounded-full transition-colors"
            >
              <span className="text-sm font-semibold text-text">+30s</span>
            </button>
          </div>
        </div>
        </div>
      )}
      
      {/* Summary */}
      {transcript?.summary && !isLocked && (
        <div className="max-w-2xl mx-auto px-4 mt-4">
          <div className="bg-surface rounded-2xl p-4 border border-border">
            <h2 className="text-lg font-semibold text-text mb-3">Summary</h2>
            <p className="text-text-secondary whitespace-pre-wrap leading-relaxed">{transcript.summary}</p>
          </div>
        </div>
      )}
      
      {/* Transcript */}
      {((segments.length > 0) || transcript?.full_text) && !isLocked && (
        <div className="max-w-2xl mx-auto px-4 mt-4">
          <TranscriptSection
            segments={segments}
            fullText={transcript?.full_text}
            speakerNames={speakerNames}
            onSpeakerNamesChange={handleSpeakerNamesChange}
            onSeekToTimestamp={handleSeekToTimestamp}
            meetingId={meetingId}
            expectedSpeakers={meeting.expected_speakers || 2}
            detectedSpeakers={meeting.detected_speakers ?? null}
            onSubmitFeedback={handleSubmitFeedback}
            isSubmittingFeedback={isSubmittingFeedback}
          />
        </div>
      )}
      
      {/* Processing State - Enhanced with step indicators */}
      {(meeting.status === 'transcribing' || meeting.status === 'converting' || meeting.status === 'queued' || meeting.status === 'uploading') && (
        <div className="max-w-2xl mx-auto px-4 mt-4 text-center">
          <div className="bg-surface rounded-2xl p-8 border border-border">
            {/* Animated Processing Icon */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              {/* Outer ring */}
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-accent-light/20"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
              {/* Inner spinning ring */}
              <motion.div
                className="absolute inset-1 rounded-full border-4 border-transparent border-t-accent-light"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                {meeting.status === 'converting' && (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <RefreshCw size={28} className="text-accent-light" />
                  </motion.div>
                )}
                {(meeting.status === 'transcribing' || meeting.status === 'queued') && (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Mic size={28} className="text-accent-light" />
                  </motion.div>
                )}
                {meeting.status === 'uploading' && (
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <ArrowLeft size={28} className="text-accent-light rotate-90" />
                  </motion.div>
                )}
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-text mb-2">
              {meeting.status === 'uploading' && 'Uploading Recording...'}
              {meeting.status === 'queued' && 'Starting Processing...'}
              {meeting.status === 'converting' && 'Converting Audio...'}
              {meeting.status === 'transcribing' && 'Transcribing Audio...'}
            </h3>
            
            <p className="text-text-secondary text-sm mb-6">
              {meeting.status === 'uploading' && 'Your recording is being securely uploaded.'}
              {meeting.status === 'queued' && 'Your recording is queued for processing.'}
              {meeting.status === 'converting' && 'Optimizing audio format for best transcription quality.'}
              {meeting.status === 'transcribing' && 'AI is analyzing your meeting and creating a transcript.'}
            </p>
            
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 text-xs">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
                meeting.status === 'uploading' ? 'bg-accent-light/20 text-accent-light' : 
                ['converting', 'transcribing', 'queued'].includes(meeting.status) ? 'bg-success/20 text-success' : 
                'bg-surface-light text-text-muted'
              }`}>
                {['converting', 'transcribing', 'queued'].includes(meeting.status) ? (
                  <Check size={12} />
                ) : meeting.status === 'uploading' ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                    <RefreshCw size={12} />
                  </motion.div>
                ) : null}
                <span>Upload</span>
              </div>
              
              <div className="w-4 h-0.5 bg-border" />
              
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
                meeting.status === 'converting' ? 'bg-accent-light/20 text-accent-light' : 
                meeting.status === 'transcribing' ? 'bg-success/20 text-success' : 
                'bg-surface-light text-text-muted'
              }`}>
                {meeting.status === 'transcribing' ? (
                  <Check size={12} />
                ) : meeting.status === 'converting' ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                    <RefreshCw size={12} />
                  </motion.div>
                ) : null}
                <span>Convert</span>
              </div>
              
              <div className="w-4 h-0.5 bg-border" />
              
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
                meeting.status === 'transcribing' ? 'bg-accent-light/20 text-accent-light' : 
                'bg-surface-light text-text-muted'
              }`}>
                {meeting.status === 'transcribing' ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                    <RefreshCw size={12} />
                  </motion.div>
                ) : null}
                <span>Transcribe</span>
              </div>
            </div>
            
            <p className="text-text-muted text-xs mt-4">
              This usually takes 2-5 minutes. You can leave this page.
            </p>
          </div>
        </div>
      )}
      
      {/* Failed State */}
      {meeting.status === 'failed' && (
        <div className="max-w-2xl mx-auto px-4 mt-4 text-center">
          <div className="bg-surface rounded-2xl p-8 border border-error/30">
            <AlertCircle size={48} className="text-error mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text mb-2">Processing Failed</h3>
            <p className="text-text-secondary mb-4">
              {meeting.error_message || 'Something went wrong while processing your recording.'}
            </p>
            <button
              onClick={() => router.push('/home')}
              className="btn-secondary"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
      
      {/* Billable Editor Modal */}
      {meeting && (
        <BillableEditorModal
          visible={showBillableEditor}
          onClose={() => setShowBillableEditor(false)}
          meeting={{
            id: meeting.id,
            duration_seconds: meeting.duration_seconds,
            is_billable: meeting.is_billable,
            billable_hours: meeting.billable_hours,
            billable_amount: meeting.billable_amount,
          }}
          hourlyRate={profile?.hourly_rate ?? null}
          currencySymbol={profile?.currency_symbol || '$'}
          onSave={handleSaveBilling}
          isSaving={isSavingBilling}
          onNavigateToSettings={() => router.push('/settings')}
        />
      )}

      {/* Share Meeting Modal */}
      {meeting && (
        <ShareMeetingModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          meetingId={meetingId}
          meetingTitle={meeting.title}
          shares={shares}
          isLoadingShares={isLoadingShares}
          onCreateShare={handleCreateShare}
          onToggleShare={handleToggleShare}
          onDeleteShare={handleDeleteShare}
          isCreating={isCreatingShare}
          isToggling={isTogglingShare}
        />
      )}

      {/* Meeting Name Modal */}
      {meeting && (
        <MeetingNameModal
          visible={showMeetingNameModal}
          onClose={() => setShowMeetingNameModal(false)}
          currentTitle={meeting.title}
          onSave={handleSaveMeetingName}
          isSaving={isSavingName}
        />
      )}

      {/* Meeting Type Modal */}
      {meeting && (
        <MeetingTypeModal
          visible={showMeetingTypeModal}
          onClose={() => setShowMeetingTypeModal(false)}
          meetingTypes={meetingTypes || []}
          currentTypeId={meeting.meeting_type_id}
          onSelect={handleSaveMeetingType}
          isSaving={isSavingType}
        />
      )}

      {/* Contact Selector Modal */}
      {meeting && (
        <ContactSelectorModal
          visible={showContactModal}
          onClose={() => setShowContactModal(false)}
          contacts={contacts || []}
          currentContactId={meeting.contact_id}
          onSelect={handleSaveContact}
          isSaving={isSavingContact}
        />
      )}
    </div>
  );
}
