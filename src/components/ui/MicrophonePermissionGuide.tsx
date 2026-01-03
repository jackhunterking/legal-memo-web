'use client';

import { Mic, MicOff, AlertTriangle, Settings, RefreshCw, CheckCircle, X, Smartphone, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBrowserPermissionInstructions } from '@/hooks/useMicrophonePermission';

interface MicrophonePermissionGuideProps {
  browserName: string;
  error?: string | null;
  onRequestPermission: () => Promise<boolean>;
  onDismiss?: () => void;
  isRequesting?: boolean;
  variant?: 'modal' | 'inline' | 'banner';
}

export function MicrophonePermissionGuide({
  browserName,
  error,
  onRequestPermission,
  onDismiss,
  isRequesting = false,
  variant = 'inline',
}: MicrophonePermissionGuideProps) {
  const instructions = getBrowserPermissionInstructions(browserName);
  const isIOS = browserName.toLowerCase().includes('ios');
  const isSafari = browserName.toLowerCase().includes('safari');

  const handleRetry = async () => {
    await onRequestPermission();
  };

  // Banner variant - compact warning strip
  if (variant === 'banner') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-warning/10 border border-warning/30 rounded-xl p-4"
      >
        <div className="flex items-start gap-3">
          <MicOff size={20} className="text-warning flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-warning font-semibold text-sm">Microphone Access Required</p>
            <p className="text-text-secondary text-xs mt-1">
              Enable microphone access to record meetings.
            </p>
          </div>
          <button
            onClick={handleRetry}
            disabled={isRequesting}
            className="px-3 py-1.5 bg-warning text-black font-semibold text-sm rounded-lg hover:bg-warning/90 transition-colors disabled:opacity-50 flex-shrink-0"
          >
            {isRequesting ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              'Enable'
            )}
          </button>
        </div>
      </motion.div>
    );
  }

  // Modal variant - full-screen overlay
  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-surface border border-border rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
                  <MicOff size={24} className="text-warning" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text">Microphone Access</h2>
                  <p className="text-text-secondary text-sm">{browserName}</p>
                </div>
              </div>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="p-2 hover:bg-surface-light rounded-lg transition-colors"
                >
                  <X size={20} className="text-text-muted" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-error flex-shrink-0 mt-0.5" />
                  <p className="text-error text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
                {instructions.title}
              </h3>
              <ol className="space-y-3">
                {instructions.steps.map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-accent-light/20 text-accent-light text-sm font-semibold flex items-center justify-center flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-text-secondary text-sm pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Device Icon */}
            <div className="flex justify-center mb-6">
              {isIOS ? (
                <Smartphone size={64} className="text-text-muted" strokeWidth={1} />
              ) : (
                <Monitor size={64} className="text-text-muted" strokeWidth={1} />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-border flex gap-3">
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="flex-1 btn-secondary"
              >
                Skip for Now
              </button>
            )}
            <button
              onClick={handleRetry}
              disabled={isRequesting}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              {isRequesting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <Mic size={18} />
                  Try Again
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Inline variant - embedded card
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-border rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 bg-gradient-to-br from-warning/10 to-transparent">
        <div className="flex items-center gap-4">
          <motion.div 
            className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <MicOff size={32} className="text-warning" />
          </motion.div>
          <div>
            <h2 className="text-xl font-bold text-text">Microphone Permission</h2>
            <p className="text-text-secondary text-sm mt-1">
              Required to record meetings
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-error/10 border border-error/30 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-error flex-shrink-0 mt-0.5" />
            <p className="text-error text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="p-6">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
          <Settings size={14} />
          {instructions.title}
        </h3>
        <ol className="space-y-3 mb-6">
          {instructions.steps.map((step, index) => (
            <motion.li 
              key={index} 
              className="flex gap-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <span className="w-6 h-6 rounded-full bg-accent-light/20 text-accent-light text-sm font-semibold flex items-center justify-center flex-shrink-0">
                {index + 1}
              </span>
              <span className="text-text-secondary text-sm pt-0.5">{step}</span>
            </motion.li>
          ))}
        </ol>

        {/* Action Button */}
        <button
          onClick={handleRetry}
          disabled={isRequesting}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {isRequesting ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              Requesting Permission...
            </>
          ) : (
            <>
              <Mic size={18} />
              Enable Microphone
            </>
          )}
        </button>

        {/* Browser Info */}
        <p className="text-text-muted text-xs text-center mt-4">
          Detected browser: {browserName}
        </p>
      </div>
    </motion.div>
  );
}

/**
 * Success state component shown after permission is granted
 */
export function MicrophonePermissionSuccess({ onContinue }: { onContinue?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
        className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6"
      >
        <CheckCircle size={40} className="text-success" />
      </motion.div>
      
      <h2 className="text-2xl font-bold text-text mb-2">Microphone Enabled!</h2>
      <p className="text-text-secondary mb-6">
        You&apos;re all set to record your meetings.
      </p>

      {onContinue && (
        <button onClick={onContinue} className="btn-primary">
          Continue
        </button>
      )}
    </motion.div>
  );
}

/**
 * Compact permission request button with status indicator
 */
export function MicrophonePermissionButton({
  status,
  onRequest,
  isRequesting = false,
}: {
  status: 'unknown' | 'granted' | 'denied' | 'prompt';
  onRequest: () => Promise<boolean>;
  isRequesting?: boolean;
}) {
  if (status === 'granted') {
    return (
      <div className="flex items-center gap-2 text-success">
        <CheckCircle size={16} />
        <span className="text-sm font-medium">Microphone enabled</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => onRequest()}
      disabled={isRequesting}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        status === 'denied'
          ? 'bg-warning/20 text-warning hover:bg-warning/30'
          : 'bg-accent-light/20 text-accent-light hover:bg-accent-light/30'
      }`}
    >
      {isRequesting ? (
        <RefreshCw size={16} className="animate-spin" />
      ) : status === 'denied' ? (
        <MicOff size={16} />
      ) : (
        <Mic size={16} />
      )}
      <span className="text-sm font-medium">
        {isRequesting 
          ? 'Requesting...' 
          : status === 'denied' 
            ? 'Microphone Blocked' 
            : 'Enable Microphone'}
      </span>
    </button>
  );
}

