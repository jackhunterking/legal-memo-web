'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

// Maximum recording duration: 2 hours
const MAX_RECORDING_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours in ms
const WARNING_BEFORE_LIMIT_MS = 5 * 60 * 1000; // Show warning 5 minutes before limit

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  durationMs: number;
  error: string | null;
  mimeType: string | null;
  isApproachingLimit: boolean;
  hasReachedLimit: boolean;
}

interface UseRecordingOptions {
  meetingId: string;
  onChunk?: (chunk: Blob) => void;
}

/**
 * Detect the best supported MIME type for the current browser
 * Priority: WebM Opus (Chrome/Firefox/Edge) > WebM > MP4 (Safari) > AAC
 */
function getBestMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return 'audio/webm';
  }

  // Detect Safari/iOS
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
    (isIOS && /webkit/.test(ua) && !/crios|fxios|opios|edgios/.test(ua));

  // Safari and iOS prioritize MP4
  if (isSafari || isIOS) {
    if (MediaRecorder.isTypeSupported('audio/mp4')) {
      return 'audio/mp4';
    }
    if (MediaRecorder.isTypeSupported('audio/aac')) {
      return 'audio/aac';
    }
    // Some versions of Safari might support webm
    if (MediaRecorder.isTypeSupported('audio/webm')) {
      return 'audio/webm';
    }
  }

  // For Chrome, Firefox, Edge - prefer WebM with Opus
  const mimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
  ];

  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  // Last resort - return webm and let browser decide
  return 'audio/webm';
}

/**
 * Get file extension from MIME type
 */
function getFileExtension(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('aac')) return 'aac';
  if (mimeType.includes('webm')) return 'webm';
  return 'webm';
}

/**
 * Get audio constraints optimized for the current browser
 */
function getAudioConstraints(): MediaTrackConstraints {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // iOS has limited audio constraint support
  if (isIOS) {
    return {
      echoCancellation: true,
      noiseSuppression: true,
    };
  }

  // Full constraints for desktop browsers
  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 16000,
  };
}

export function useRecording(options?: UseRecordingOptions) {
  const { user } = useAuth();
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    durationMs: 0,
    error: null,
    mimeType: null,
    isApproachingLimit: false,
    hasReachedLimit: false,
  });

  // Ref to track if we should auto-stop (to avoid stale closures)
  const shouldAutoStopRef = useRef(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Get user-friendly error message from error object
   */
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      // Permission errors
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        return 'Microphone permission denied. Please allow access in your browser settings.';
      }
      // No microphone
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        return 'No microphone found. Please connect a microphone and try again.';
      }
      // Microphone in use
      if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        return 'Your microphone is being used by another application. Please close it and try again.';
      }
      // Constraints error
      if (error.name === 'OverconstrainedError') {
        return 'Could not access microphone with required settings. Please try again.';
      }
      // Security error
      if (error.name === 'SecurityError') {
        return 'Microphone access blocked for security reasons. Please ensure you\'re using HTTPS.';
      }
      // Abort error
      if (error.name === 'AbortError') {
        return 'Recording was interrupted. Please try again.';
      }
      
      return error.message;
    }
    return 'Failed to access microphone';
  };

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));

      // Determine best MIME type before requesting media
      const mimeType = getBestMimeType();
      console.log('[Recording] Selected MIME type:', mimeType);

      // Get optimized audio constraints
      const audioConstraints = getAudioConstraints();
      console.log('[Recording] Audio constraints:', audioConstraints);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: audioConstraints
      });
      streamRef.current = stream;

      // Create MediaRecorder with selected MIME type
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          audioBitsPerSecond: 128000,
        });
      } catch {
        // If specified mimeType fails, try without options
        console.warn('[Recording] Failed with specified mimeType, trying default');
        mediaRecorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      const actualMimeType = mediaRecorder.mimeType || mimeType;
      console.log('[Recording] Actual MIME type:', actualMimeType);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          options?.onChunk?.(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('[Recording] MediaRecorder error:', event);
        setState(prev => ({ 
          ...prev, 
          error: 'Recording error occurred. Please try again.',
          isRecording: false 
        }));
      };

      mediaRecorder.onstart = () => {
        console.log('[Recording] MediaRecorder started');
      };

      // Start recording with timeslice for real-time chunks
      mediaRecorder.start(1000);
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      pausedDurationRef.current = 0;

      // Start duration timer
      timerRef.current = setInterval(() => {
        setState(prev => {
          if (!prev.isPaused) {
            const newDurationMs = Date.now() - startTimeRef.current - pausedDurationRef.current;
            
            // Check if approaching limit (5 minutes before)
            const isApproachingLimit = newDurationMs >= (MAX_RECORDING_DURATION_MS - WARNING_BEFORE_LIMIT_MS);
            
            // Check if reached limit
            const hasReachedLimit = newDurationMs >= MAX_RECORDING_DURATION_MS;
            
            // Flag for auto-stop (will be handled by effect)
            if (hasReachedLimit) {
              shouldAutoStopRef.current = true;
            }
            
            return {
              ...prev,
              durationMs: Math.min(newDurationMs, MAX_RECORDING_DURATION_MS),
              isApproachingLimit,
              hasReachedLimit,
            };
          }
          return prev;
        });
      }, 100);

      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        isPaused: false, 
        error: null,
        durationMs: 0,
        mimeType: actualMimeType,
      }));

      console.log('[Recording] Started successfully with mimeType:', actualMimeType);
    } catch (error) {
      console.error('[Recording] Failed to start:', error);
      const message = getErrorMessage(error);
      
      setState(prev => ({ 
        ...prev, 
        error: message 
      }));
    }
  }, [options]);

  // Stop recording and return audio blob
  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        console.warn('[Recording] No active recording to stop');
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // Stop all tracks
        streamRef.current?.getTracks().forEach(track => track.stop());

        // Create audio blob with the actual mimeType
        const actualMimeType = mediaRecorder.mimeType || state.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: actualMimeType 
        });

        console.log('[Recording] Stopped. Blob size:', audioBlob.size, 'bytes, type:', actualMimeType);

        setState(prev => ({ 
          ...prev, 
          isRecording: false, 
          isPaused: false 
        }));

        resolve(audioBlob);
      };

      mediaRecorder.stop();
    });
  }, [state.mimeType]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      pausedTimeRef.current = Date.now();
      setState(prev => ({ ...prev, isPaused: true }));
      console.log('[Recording] Paused');
    }
  }, []);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      
      // Calculate and add paused duration
      if (pausedTimeRef.current > 0) {
        const pauseDuration = Date.now() - pausedTimeRef.current;
        pausedDurationRef.current += pauseDuration;
        pausedTimeRef.current = 0;
      }
      
      setState(prev => ({ ...prev, isPaused: false }));
      console.log('[Recording] Resumed');
    }
  }, []);

  // Upload audio to Supabase Storage
  const uploadAudio = useCallback(async (
    meetingId: string, 
    audioBlob: Blob
  ): Promise<string | null> => {
    if (!user?.id) {
      console.error('[Recording] No user ID for upload');
      return null;
    }

    try {
      // Determine file extension from blob's mime type
      const ext = getFileExtension(audioBlob.type);
      const fileName = `${user.id}/${meetingId}.${ext}`;

      console.log('[Recording] Uploading to:', fileName, 'type:', audioBlob.type);

      const { data, error } = await supabase.storage
        .from('meeting-audio')
        .upload(fileName, audioBlob, {
          contentType: audioBlob.type,
          upsert: true,
        });

      if (error) {
        console.error('[Recording] Upload error:', error);
        throw error;
      }

      console.log('[Recording] Uploaded successfully:', data.path);
      return data.path;
    } catch (error) {
      console.error('[Recording] Upload failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to upload audio. Please check your internet connection.' 
      }));
      return null;
    }
  }, [user?.id]);

  // Cancel recording without saving
  const cancelRecording = useCallback(async () => {
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop all tracks
    streamRef.current?.getTracks().forEach(track => track.stop());

    // Reset state
    audioChunksRef.current = [];
    shouldAutoStopRef.current = false;
    setState({
      isRecording: false,
      isPaused: false,
      durationMs: 0,
      error: null,
      mimeType: null,
      isApproachingLimit: false,
      hasReachedLimit: false,
    });

    console.log('[Recording] Cancelled');
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    uploadAudio,
    cancelRecording,
    clearError,
    recordedAt: startTimeRef.current > 0 ? new Date(startTimeRef.current).toISOString() : null,
    maxDurationMs: MAX_RECORDING_DURATION_MS,
    shouldAutoStop: shouldAutoStopRef.current,
  };
}
