'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, User, Users, MicOff, AlertTriangle, CheckCircle, Sparkles, X, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMeetings } from '@/hooks/useMeetings';
import { useUsage } from '@/hooks/useUsage';
import { useMicrophonePermission } from '@/hooks/useMicrophonePermission';
import { MicrophonePermissionGuide } from '@/components/ui/MicrophonePermissionGuide';
import { useAnalytics } from '@/hooks/useAnalytics';

type ExpectedSpeakers = 1 | 2 | 3;

export default function HomePage() {
  const router = useRouter();
  const { createMeeting, isCreating } = useMeetings();
  const { canRecord, subscription } = useUsage();
  const { trackEvent } = useAnalytics();
  const [expectedSpeakers, setExpectedSpeakers] = useState<ExpectedSpeakers>(2);
  const [showTrialModal, setShowTrialModal] = useState(false);
  
  // Check if user has never had a trial/subscription
  // Once they go through Polar checkout, a subscription record is created (even for trials)
  // This prevents trial abuse - users who've been through Polar before won't see the trial modal
  const hasNeverHadTrial = subscription === null;

  const {
    status: micStatus,
    browserName,
    error: micError,
    isSupported,
    requestPermission,
    isChecking: isCheckingPermission,
  } = useMicrophonePermission();

  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionJustGranted, setPermissionJustGranted] = useState(false);

  // Show success toast briefly when permission is granted
  useEffect(() => {
    if (micStatus === 'granted' && permissionJustGranted) {
      const timer = setTimeout(() => {
        setPermissionJustGranted(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [micStatus, permissionJustGranted]);

  const handleRequestPermission = async (): Promise<boolean> => {
    setIsRequestingPermission(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        setPermissionJustGranted(true);
        setShowPermissionModal(false);
      }
      return granted;
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleStartRecording = async () => {
    // Check microphone permission status first (fast check)
    if (micStatus === 'denied') {
      setShowPermissionModal(true);
      return;
    }

    // IMPORTANT: Trust local database state first!
    // If canRecord is true from the database, proceed immediately.
    // The database function (can_user_record) is the source of truth.
    // Only block if local state says user cannot record.
    if (canRecord) {
      // User is authorized - proceed to recording immediately
      try {
        const meeting = await createMeeting(expectedSpeakers);
        trackEvent('recording_started', { expected_speakers: expectedSpeakers });
        router.push(`/recording/${meeting.id}`);
      } catch (error) {
        console.error('[Home] Failed to create meeting:', error);
        alert('Failed to start recording. Please try again.');
      }
      return;
    }

    // User cannot record according to local state
    // Show appropriate UI without blocking verification
    if (hasNeverHadTrial) {
      // User has never started a trial - show opt-in modal
      trackEvent('trial_modal_shown');
      setShowTrialModal(true);
    } else {
      // User's subscription/trial has expired - redirect to subscription
      router.push('/subscription');
    }
  };

  // Determine if microphone banner should be shown
  const showMicBanner = micStatus === 'denied';
  const showMicWarning = micStatus === 'denied' || !isSupported;

  return (
    <div className="pt-8 pb-24 flex flex-col items-center min-h-screen">
      {/* Header */}
      <div className="w-full mb-6">
        <h1 className="text-3xl font-bold text-text text-center">Record</h1>
      </div>

      {/* Microphone Permission Banner */}
      {showMicBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mb-6 bg-warning/10 border border-warning/30 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <MicOff size={20} className="text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-warning font-semibold text-sm">Microphone Access Blocked</p>
              <p className="text-text-secondary text-xs mt-1">
                Enable microphone to start recording meetings.
              </p>
            </div>
            <button
              onClick={() => setShowPermissionModal(true)}
              className="px-3 py-1.5 bg-warning text-black font-semibold text-sm rounded-lg hover:bg-warning/90 transition-colors flex-shrink-0"
            >
              Fix
            </button>
          </div>
        </motion.div>
      )}

      {/* Browser Not Supported Warning */}
      {!isSupported && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mb-6 bg-error/10 border border-error/30 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-error flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-error font-semibold text-sm">Browser Not Supported</p>
              <p className="text-text-secondary text-xs mt-1">
                Please use Chrome, Safari, Firefox, or Edge for recording.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Speaker Selector */}
      <div className="w-full mb-8">
        <p className="text-xs font-semibold text-text-muted text-center mb-3 uppercase tracking-wider">
          Number of Speakers
        </p>
        <div className="flex bg-surface rounded-xl p-1 border border-border">
          {[
            { value: 1, label: 'Solo', icon: User },
            { value: 2, label: '2 People', icon: Users },
            { value: 3, label: '3+', icon: Users },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setExpectedSpeakers(option.value as ExpectedSpeakers)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all duration-200 ${
                expectedSpeakers === option.value
                  ? 'bg-accent-light text-white shadow-lg'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <option.icon size={18} />
              <span className="text-sm font-semibold">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Record Button Container */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative">
          {/* Outer Pulse Ring */}
          {!showMicWarning && (
            <motion.div
              className="absolute inset-0 rounded-full bg-accent-light"
              style={{ width: 220, height: 220, marginLeft: -20, marginTop: -20 }}
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.4, 0, 0.4],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}

          {/* Main Record Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleStartRecording}
            disabled={isCreating || !isSupported}
            className={`relative w-[180px] h-[180px] rounded-full flex items-center justify-center transition-all duration-300 ${
              !isSupported
                ? 'bg-surface-light cursor-not-allowed'
                : micStatus === 'denied'
                  ? 'bg-warning hover:bg-warning/90'
                  : 'bg-accent-light hover:bg-accent-light/90'
            }`}
            style={{
              boxShadow: !isSupported
                ? 'none'
                : micStatus === 'denied'
                  ? '0 12px 40px rgba(245, 158, 11, 0.4)'
                  : '0 12px 40px rgba(233, 69, 96, 0.4)',
            }}
          >
            {isCreating ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={48} className="text-white animate-spin" />
              </div>
            ) : micStatus === 'denied' ? (
              <MicOff 
                size={56} 
                className="text-white" 
                strokeWidth={2.5} 
              />
            ) : (
              <Mic 
                size={56} 
                className="text-white" 
                strokeWidth={2.5} 
              />
            )}
          </motion.button>
        </div>

        {/* Instruction Text */}
        <p className="mt-8 text-text-muted text-center">
          {!isSupported
            ? 'Browser not supported'
            : isCreating
              ? 'Creating meeting...'
              : micStatus === 'denied'
                ? 'Tap to fix microphone access'
                : 'Tap to begin recording'}
        </p>

        {/* Microphone Status Indicator */}
        {micStatus === 'granted' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2 text-success"
          >
            <CheckCircle size={16} />
            <span className="text-sm font-medium">Microphone ready</span>
          </motion.div>
        )}

        {/* Browser Name */}
        {!isCheckingPermission && (
          <p className="mt-2 text-text-muted text-xs">
            {browserName}
          </p>
        )}
      </div>

      {/* Permission Success Toast */}
      <AnimatePresence>
        {permissionJustGranted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-success text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg"
          >
            <CheckCircle size={16} />
            Microphone enabled!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permission Guide Modal */}
      <AnimatePresence>
        {showPermissionModal && (
          <MicrophonePermissionGuide
            browserName={browserName}
            error={micError}
            onRequestPermission={handleRequestPermission}
            onDismiss={() => setShowPermissionModal(false)}
            isRequesting={isRequestingPermission}
            variant="modal"
          />
        )}
      </AnimatePresence>

      {/* Trial Opt-in Modal */}
      <AnimatePresence>
        {showTrialModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowTrialModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface rounded-2xl p-6 max-w-sm w-full border border-border shadow-xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowTrialModal(false)}
                className="absolute top-4 right-4 p-1 text-text-muted hover:text-text transition-colors"
              >
                <X size={20} />
              </button>

              {/* Icon */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-light to-accent flex items-center justify-center mx-auto mb-4">
                <Sparkles size={32} className="text-white" />
              </div>

              {/* Title & Description */}
              <h2 className="text-xl font-bold text-text text-center mb-2">
                Start Your Free Trial
              </h2>
              <p className="text-text-secondary text-center text-sm mb-6">
                Try Legal Memo free for 7 days. Record meetings, get AI transcriptions, and smart summaries.
              </p>

              {/* Feature List */}
              <div className="space-y-3 mb-6">
                {['Unlimited recordings', 'AI transcription', 'Smart summaries'].map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-accent-light/20 flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-accent-light" />
                    </div>
                    <span className="text-text text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Button */}
              <button
                onClick={() => {
                  setShowTrialModal(false);
                  router.push('/subscription');
                }}
                className="w-full py-3.5 bg-accent-light text-white font-bold rounded-xl hover:bg-accent-light/90 transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles size={18} />
                Start Free Trial
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
