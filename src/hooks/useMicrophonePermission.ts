'use client';

import { useState, useEffect, useCallback } from 'react';

export type PermissionStatus = 'unknown' | 'granted' | 'denied' | 'prompt';

export interface MicrophonePermissionState {
  status: PermissionStatus;
  isSupported: boolean;
  browserName: string;
  preferredMimeType: string;
  error: string | null;
  isChecking: boolean;
}

interface BrowserInfo {
  name: string;
  isIOS: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isEdge: boolean;
}

/**
 * Detect browser type and platform
 */
function detectBrowser(): BrowserInfo {
  if (typeof window === 'undefined') {
    return {
      name: 'unknown',
      isIOS: false,
      isSafari: false,
      isChrome: false,
      isFirefox: false,
      isEdge: false,
    };
  }

  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  // Safari detection (including iOS Safari)
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
    (isIOS && /webkit/.test(ua) && !/crios|fxios|opios|edgios/.test(ua));
  
  const isChrome = /chrome/.test(ua) && !/edg/.test(ua) && !/opr/.test(ua);
  const isFirefox = /firefox/.test(ua);
  const isEdge = /edg/.test(ua);

  let name = 'Unknown Browser';
  if (isSafari) name = isIOS ? 'Safari (iOS)' : 'Safari';
  else if (isChrome) name = 'Chrome';
  else if (isFirefox) name = 'Firefox';
  else if (isEdge) name = 'Edge';

  return {
    name,
    isIOS,
    isSafari,
    isChrome,
    isFirefox,
    isEdge,
  };
}

/**
 * Get the best supported MIME type for the current browser
 */
function getPreferredMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return 'audio/webm';
  }

  const browser = detectBrowser();

  // For Safari and iOS, use MP4/AAC
  if (browser.isSafari || browser.isIOS) {
    if (MediaRecorder.isTypeSupported('audio/mp4')) {
      return 'audio/mp4';
    }
    // Fallback for older iOS versions
    if (MediaRecorder.isTypeSupported('audio/aac')) {
      return 'audio/aac';
    }
  }

  // For other browsers, prefer WebM with Opus codec
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

  // Last resort fallback
  return 'audio/webm';
}

/**
 * Get file extension from MIME type
 */
export function getFileExtension(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('aac')) return 'aac';
  return 'webm';
}

/**
 * Get browser-specific instructions for enabling microphone
 */
export function getBrowserPermissionInstructions(browserName: string): {
  title: string;
  steps: string[];
} {
  const browser = browserName.toLowerCase();

  if (browser.includes('safari') && browser.includes('ios')) {
    return {
      title: 'Enable Microphone in Safari (iOS)',
      steps: [
        'Open the Settings app on your iPhone/iPad',
        'Scroll down and tap Safari',
        'Scroll to "Settings for Websites"',
        'Tap Microphone',
        'Select "Ask" or "Allow"',
        'Return to this app and tap "Try Again"',
      ],
    };
  }

  if (browser.includes('safari')) {
    return {
      title: 'Enable Microphone in Safari',
      steps: [
        'Click Safari in the menu bar',
        'Select "Settings for This Website..." or "Preferences"',
        'Find the Microphone option',
        'Change it from "Deny" to "Ask" or "Allow"',
        'Reload this page and try again',
      ],
    };
  }

  if (browser.includes('chrome')) {
    return {
      title: 'Enable Microphone in Chrome',
      steps: [
        'Click the lock/info icon in the address bar',
        'Find "Microphone" in the permissions list',
        'Change it from "Block" to "Allow"',
        'Reload this page and try again',
      ],
    };
  }

  if (browser.includes('firefox')) {
    return {
      title: 'Enable Microphone in Firefox',
      steps: [
        'Click the lock icon in the address bar',
        'Click "Connection secure" or site info',
        'Click "More Information"',
        'Go to the "Permissions" tab',
        'Find "Use the Microphone" and uncheck "Block"',
        'Reload this page and try again',
      ],
    };
  }

  if (browser.includes('edge')) {
    return {
      title: 'Enable Microphone in Edge',
      steps: [
        'Click the lock icon in the address bar',
        'Find "Microphone" in the permissions',
        'Change it from "Block" to "Allow"',
        'Reload this page and try again',
      ],
    };
  }

  // Generic instructions
  return {
    title: 'Enable Microphone Access',
    steps: [
      'Look for a lock or info icon in your browser\'s address bar',
      'Click it to view site permissions',
      'Find the Microphone setting',
      'Change it from "Block" or "Deny" to "Allow"',
      'Reload this page and try again',
    ],
  };
}

/**
 * Hook to manage microphone permissions with cross-browser support
 */
export function useMicrophonePermission() {
  const [state, setState] = useState<MicrophonePermissionState>({
    status: 'unknown',
    isSupported: true,
    browserName: 'Unknown',
    preferredMimeType: 'audio/webm',
    error: null,
    isChecking: true,
  });

  // Initialize browser detection and check support
  useEffect(() => {
    const browser = detectBrowser();
    const preferredMimeType = getPreferredMimeType();
    
    // Check if MediaRecorder is supported
    const isSupported = typeof window !== 'undefined' && 
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices !== 'undefined' &&
      typeof navigator.mediaDevices.getUserMedia !== 'undefined' &&
      typeof MediaRecorder !== 'undefined';

    setState(prev => ({
      ...prev,
      browserName: browser.name,
      preferredMimeType,
      isSupported,
    }));

    // Inline permission check to avoid stale closure issues
    const checkPermission = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          try {
            const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            const status = result.state === 'granted' ? 'granted' 
              : result.state === 'denied' ? 'denied' 
              : 'prompt';
            
            setState(prev => ({ ...prev, status, isChecking: false }));

            // Listen for permission changes
            result.onchange = () => {
              const newStatus = result.state === 'granted' ? 'granted' 
                : result.state === 'denied' ? 'denied' 
                : 'prompt';
              setState(prev => ({ ...prev, status: newStatus }));
            };
            return;
          } catch {
            // Permissions API might not support 'microphone' query (Safari)
          }
        }
        // Fallback - set to unknown, will be determined when requesting
        setState(prev => ({ ...prev, status: 'unknown', isChecking: false }));
      } catch {
        setState(prev => ({ ...prev, status: 'unknown', isChecking: false }));
      }
    };

    checkPermission();
  }, []);

  /**
   * Check current permission status using Permissions API
   */
  const checkPermissionStatus = useCallback(async () => {
    setState(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      // First try using the Permissions API
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          
          const status = result.state === 'granted' ? 'granted' 
            : result.state === 'denied' ? 'denied' 
            : 'prompt';
          
          setState(prev => ({ 
            ...prev, 
            status, 
            isChecking: false 
          }));

          // Listen for permission changes
          result.onchange = () => {
            const newStatus = result.state === 'granted' ? 'granted' 
              : result.state === 'denied' ? 'denied' 
              : 'prompt';
            setState(prev => ({ ...prev, status: newStatus }));
          };

          return status;
        } catch {
          // Permissions API might not support 'microphone' query
          // Fall through to default
        }
      }

      // If Permissions API doesn't work (common on Safari/iOS), 
      // set status as 'unknown' - actual permission will be determined when requesting
      setState(prev => ({ 
        ...prev, 
        status: 'unknown', 
        isChecking: false 
      }));
      return 'unknown';
    } catch (error) {
      console.error('[MicPermission] Error checking permission:', error);
      setState(prev => ({ 
        ...prev, 
        status: 'unknown', 
        isChecking: false 
      }));
      return 'unknown';
    }
  }, []);

  /**
   * Request microphone permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      if (!state.isSupported) {
        throw new Error('Your browser does not support audio recording');
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Stop all tracks immediately - we just needed to request permission
      stream.getTracks().forEach(track => track.stop());

      setState(prev => ({ 
        ...prev, 
        status: 'granted', 
        isChecking: false,
        error: null,
      }));

      return true;
    } catch (error) {
      console.error('[MicPermission] Permission request failed:', error);
      
      let errorMessage = 'Failed to access microphone';
      let status: PermissionStatus = 'denied';

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = 'Microphone access was denied. Please enable it in your browser settings.';
          status = 'denied';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone and try again.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage = 'Your microphone is being used by another application.';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = 'Could not satisfy audio constraints. Please try with different settings.';
        } else if (error.name === 'SecurityError') {
          errorMessage = 'Microphone access is blocked for security reasons. Please use HTTPS.';
        } else {
          errorMessage = error.message;
        }
      }

      setState(prev => ({ 
        ...prev, 
        status,
        isChecking: false,
        error: errorMessage,
      }));

      return false;
    }
  }, [state.isSupported]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Get permission instructions for current browser
   */
  const getInstructions = useCallback(() => {
    return getBrowserPermissionInstructions(state.browserName);
  }, [state.browserName]);

  return {
    ...state,
    requestPermission,
    checkPermissionStatus,
    clearError,
    getInstructions,
    getFileExtension: () => getFileExtension(state.preferredMimeType),
  };
}

