'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Mic, Pause, Square, Play, AlertCircle, Save, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRecording } from '@/hooks/useRecording';
import { useMeetings } from '@/hooks/useMeetings';
import { useMicrophonePermission } from '@/hooks/useMicrophonePermission';
import { MicrophonePermissionGuide } from '@/components/ui/MicrophonePermissionGuide';
import { supabase } from '@/lib/supabase';

export default function RecordingPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;
  
  const { updateMeeting, optimisticallyUpdateMeeting, prefetchMeetingDetails } = useMeetings();
  const {
    isRecording,
    isPaused,
    durationMs,
    error: recordingError,
    mimeType,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    uploadAudio,
    cancelRecording,
    clearError,
    recordedAt,
    isApproachingLimit,
    hasReachedLimit,
    maxDurationMs,
  } = useRecording({ meetingId });

  const {
    status: permissionStatus,
    browserName,
    error: permissionError,
    isSupported,
    requestPermission,
    isChecking: isCheckingPermission,
  } = useMicrophonePermission();
  
  const [isSaving, setIsSaving] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);

  // Determine if we should show permission UI
  const needsPermission = permissionStatus === 'denied' || 
    permissionStatus === 'prompt' || 
    permissionStatus === 'unknown';
  
  const hasPermissionError = recordingError?.toLowerCase().includes('permission') || 
    recordingError?.toLowerCase().includes('denied') ||
    permissionError !== null;

  // Start recording when permission allows (granted, prompt, or unknown)
  // The actual browser permission prompt will appear when getUserMedia is called
  useEffect(() => {
    if (!hasStarted && meetingId && !isCheckingPermission && permissionStatus !== 'denied') {
      handleStart();
    }
  }, [meetingId, permissionStatus, hasStarted, isCheckingPermission]);

  // Show permission guide if recording fails due to permission
  useEffect(() => {
    if (hasPermissionError && !isRecording) {
      setShowPermissionGuide(true);
    }
  }, [hasPermissionError, isRecording]);

  // Auto-stop recording when 2-hour limit is reached
  useEffect(() => {
    if (hasReachedLimit && isRecording && !isSaving) {
      console.log('[Recording] 2-hour limit reached, auto-stopping...');
      handleStop();
    }
  }, [hasReachedLimit, isRecording, isSaving]);

  const handleStart = async () => {
    try {
      clearError();
      setShowPermissionGuide(false);
      await startRecording();
      setHasStarted(true);
    } catch (err) {
      console.error('[Recording] Start error:', err);
      // If permission error, show guide
      if (err instanceof Error && 
          (err.name === 'NotAllowedError' || err.message.toLowerCase().includes('permission'))) {
        setShowPermissionGuide(true);
      }
    }
  };

  const handleRequestPermission = async (): Promise<boolean> => {
    setIsRequestingPermission(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        setShowPermissionGuide(false);
        // Try to start recording after permission granted
        await handleStart();
      }
      return granted;
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handlePauseResume = () => {
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  };

  const handleStop = useCallback(async () => {
    if (!meetingId) return;

    setIsSaving(true);
    setShowStopConfirm(false);

    try {
      // Stop recording and get audio blob
      const audioBlob = await stopRecording();
      
      if (!audioBlob) {
        throw new Error('No audio recorded');
      }

      // Calculate duration
      const durationSeconds = Math.round(durationMs / 1000);
      console.log('[Recording] Duration:', durationSeconds, 'seconds, format:', audioBlob.type);

      // Upload audio to Supabase Storage
      const audioPath = await uploadAudio(meetingId, audioBlob);

      if (!audioPath) {
        throw new Error('Failed to upload audio');
      }

      // Optimistically update the meeting in cache BEFORE the API call
      // This ensures the meeting page shows the correct state immediately
      optimisticallyUpdateMeeting(meetingId, {
        raw_audio_path: audioPath,
        raw_audio_format: audioBlob.type,
        duration_seconds: durationSeconds,
        recorded_at: recordedAt || new Date().toISOString(),
        status: 'queued',
      });

      // Prefetch meeting details for faster navigation
      prefetchMeetingDetails(meetingId);

      // Update meeting with audio path and duration
      await updateMeeting({
        meetingId,
        updates: {
          raw_audio_path: audioPath,
          raw_audio_format: audioBlob.type,
          duration_seconds: durationSeconds,
          recorded_at: recordedAt || new Date().toISOString(),
          status: 'queued', // Ready for backend processing
        },
      });

      // Trigger the process-recording edge function (fire-and-forget - don't wait)
      console.log('[Recording] Triggering process-recording edge function (fire-and-forget)...');
      supabase.functions.invoke('process-recording', {
        body: { meeting_id: meetingId },
      }).then(({ error: processError }) => {
        if (processError) {
          console.error('[Recording] Edge function error:', processError);
        } else {
          console.log('[Recording] Edge function invoked successfully');
        }
      });

      // Navigate immediately to meetings page - meeting will show as "Processing"
      setIsSaving(false);
      router.replace('/meetings');
    } catch (err) {
      console.error('[Recording] Stop/save error:', err);
      setIsSaving(false);
      
      // Update meeting status to failed
      try {
        await updateMeeting({
          meetingId,
          updates: {
            status: 'failed',
            error_message: err instanceof Error ? err.message : 'Save failed',
          },
        });
      } catch (updateErr) {
        console.error('[Recording] Failed to update meeting status:', updateErr);
      }

      alert(err instanceof Error ? err.message : 'Failed to save recording');
    }
  }, [meetingId, durationMs, stopRecording, uploadAudio, updateMeeting, recordedAt, router, optimisticallyUpdateMeeting, prefetchMeetingDetails]);

  const handleCancel = useCallback(async () => {
    if (!confirm('Are you sure you want to cancel this recording? All audio will be lost.')) {
      return;
    }

    try {
      await cancelRecording();
      
      // Update meeting status
      await updateMeeting({
        meetingId,
        updates: {
          status: 'failed',
          error_message: 'Recording canceled by user',
        },
      });

      router.replace('/home');
    } catch (err) {
      console.error('[Recording] Cancel error:', err);
      router.replace('/home');
    }
  }, [meetingId, cancelRecording, updateMeeting, router]);

  // Format duration display
  const formatDisplayDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Browser not supported
  if (!isSupported) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="card max-w-md w-full text-center">
          <AlertCircle size={48} className="text-warning mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text mb-2">Browser Not Supported</h2>
          <p className="text-text-secondary mb-6">
            Your browser doesn&apos;t support audio recording. Please use Chrome, Safari, Firefox, or Edge.
          </p>
          <button
            onClick={() => router.replace('/home')}
            className="btn-secondary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Permission guide modal
  if (showPermissionGuide && !isRecording) {
    return (
      <div className="min-h-screen flex flex-col p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.replace('/home')}
            className="text-text-muted hover:text-text transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <MicOff size={16} className="text-warning" />
            <span className="text-sm font-medium text-warning">
              Permission Required
            </span>
          </div>
          <div className="w-16" />
        </div>

        {/* Permission Guide */}
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md w-full">
            <MicrophonePermissionGuide
              browserName={browserName}
              error={recordingError || permissionError}
              onRequestPermission={handleRequestPermission}
              onDismiss={() => router.replace('/home')}
              isRequesting={isRequestingPermission}
              variant="inline"
            />
          </div>
        </div>
      </div>
    );
  }

  // Error state (non-permission errors)
  if (recordingError && !hasPermissionError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="card max-w-md w-full text-center">
          <AlertCircle size={48} className="text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text mb-2">Recording Error</h2>
          <p className="text-text-secondary mb-6">{recordingError}</p>
          <div className="flex gap-3">
            <button
              onClick={() => router.replace('/home')}
              className="flex-1 btn-secondary"
            >
              Go Back
            </button>
            <button
              onClick={() => {
                clearError();
                handleStart();
              }}
              className="flex-1 btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Saving state
  if (isSaving) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-accent-light border-t-transparent rounded-full animate-spin" />
          <p className="text-text font-semibold">Saving recording...</p>
          <p className="text-text-secondary text-sm">Please wait, this may take a moment</p>
        </div>
      </div>
    );
  }

  // Checking permission state
  if (isCheckingPermission || (!hasStarted && permissionStatus === 'unknown')) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-accent-light border-t-transparent rounded-full animate-spin" />
          <p className="text-text font-semibold">Preparing microphone...</p>
          <p className="text-text-secondary text-sm">{browserName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="pt-6 px-6 flex justify-between items-center">
        <button
          onClick={handleCancel}
          className="text-text-muted hover:text-text transition-colors"
        >
          Cancel
        </button>
        <div className="flex items-center gap-2">
          {isRecording && !isPaused && (
            <motion.div
              className="w-3 h-3 rounded-full bg-recording"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
          <span className="text-sm font-medium text-text-secondary">
            {isPaused ? 'Paused' : isRecording ? 'Recording' : 'Starting...'}
          </span>
        </div>
        <div className="w-16" /> {/* Spacer for alignment */}
      </div>

      {/* Audio format indicator (dev mode) */}
      {mimeType && process.env.NODE_ENV === 'development' && (
        <div className="px-6 pt-2">
          <p className="text-xs text-text-muted text-center">
            Format: {mimeType}
          </p>
        </div>
      )}

      {/* Approaching time limit warning */}
      {isApproachingLimit && !hasReachedLimit && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-6 mt-4 p-3 bg-warning/20 border border-warning/40 rounded-xl flex items-center gap-3"
        >
          <AlertCircle size={20} className="text-warning flex-shrink-0" />
          <div className="flex-1">
            <p className="text-warning font-semibold text-sm">Approaching 2-hour limit</p>
            <p className="text-text-secondary text-xs">Recording will auto-save when limit is reached</p>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Duration Display */}
        <div className="mb-8">
          <motion.p 
            className="text-6xl font-bold text-text font-mono tracking-wide"
            animate={isPaused ? { opacity: [1, 0.5, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {formatDisplayDuration(durationMs)}
          </motion.p>
        </div>

        {/* Live Waveform Indicator */}
        {isRecording && !isPaused && (
          <div className="flex items-center justify-center gap-1 mb-8 h-12">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-accent-light rounded-full"
                animate={{
                  height: [6, 32, 6],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        )}

        {/* Paused Indicator */}
        {isPaused && (
          <div className="mb-8 h-12 flex items-center">
            <p className="text-text-secondary">Recording paused</p>
          </div>
        )}

        {/* Starting Indicator - show when not yet recording */}
        {!isRecording && !isPaused && hasStarted && (
          <div className="mb-8 h-12 flex items-center">
            <p className="text-text-secondary">Starting...</p>
          </div>
        )}

        {/* Control Buttons Row - All three buttons centered together */}
        <div className="flex items-center justify-center gap-6 mb-8">
          {/* Pause/Resume Button - only visible when recording */}
          <AnimatePresence>
            {(isRecording || isPaused) && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                onClick={handlePauseResume}
                className="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center hover:bg-surface-light transition-colors"
              >
                {isPaused ? (
                  <Play size={28} className="text-text ml-1" fill="currentColor" />
                ) : (
                  <Pause size={28} className="text-text" />
                )}
              </motion.button>
            )}
          </AnimatePresence>

          {/* Microphone Indicator - Center element */}
          <div className="relative">
            {/* Pulse rings - only when actively recording */}
            {isRecording && !isPaused && (
              <>
                <motion.div
                  className="absolute rounded-full bg-recording"
                  style={{ 
                    width: 100, 
                    height: 100, 
                    left: '50%',
                    top: '50%',
                    marginLeft: -50, 
                    marginTop: -50 
                  }}
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.3, 0, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                <motion.div
                  className="absolute rounded-full bg-recording"
                  style={{ 
                    width: 100, 
                    height: 100, 
                    left: '50%',
                    top: '50%',
                    marginLeft: -50, 
                    marginTop: -50 
                  }}
                  animate={{
                    scale: [1, 1.25, 1],
                    opacity: [0.2, 0, 0.2],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.5,
                  }}
                />
              </>
            )}

            {/* Recording indicator circle */}
            <div className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center ${
              isPaused ? 'bg-surface-light border-2 border-border' : 'bg-recording'
            }`}
            style={!isPaused && isRecording ? {
              boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
            } : undefined}
            >
              <Mic size={36} className={isPaused ? 'text-text-secondary' : 'text-white'} strokeWidth={2} />
            </div>
          </div>

          {/* Stop Button - only visible when recording */}
          <AnimatePresence>
            {(isRecording || isPaused) && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, x: -20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: -20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                onClick={() => setShowStopConfirm(true)}
                className="w-16 h-16 rounded-full bg-surface border-2 border-recording flex items-center justify-center hover:bg-recording/10 transition-colors"
              >
                <Square size={24} className="text-recording" fill="currentColor" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Hint text */}
        <p className="text-text-muted text-sm text-center">
          {!isRecording && !isPaused
            ? 'Preparing to record...'
            : isPaused 
              ? 'Tap play to resume or stop to finish'
              : 'Tap pause to take a break, or stop when done'
          }
        </p>
      </div>

      {/* Stop Confirmation Modal */}
      <AnimatePresence>
        {showStopConfirm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card max-w-sm w-full"
            >
              <h3 className="text-xl font-bold text-text mb-2">Stop Recording?</h3>
              <p className="text-text-secondary mb-6">
                Your recording will be saved and processed. You&apos;ll see the transcript once it&apos;s ready.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowStopConfirm(false)}
                  className="flex-1 btn-secondary"
                >
                  Continue
                </button>
                <button
                  onClick={handleStop}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
