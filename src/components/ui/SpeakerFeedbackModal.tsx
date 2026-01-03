'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Flag } from 'lucide-react';
import Colors from '@/lib/colors';

interface SpeakerFeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  meetingId: string;
  expectedSpeakers: number;
  detectedSpeakers: number | null;
  onSubmit: (feedbackType?: string, notes?: string) => Promise<void>;
  isSubmitting: boolean;
}

const feedbackOptions = [
  { id: 'wrong_speaker_count', label: 'Wrong speaker count' },
  { id: 'speakers_merged', label: 'Speakers incorrectly merged' },
  { id: 'speakers_split', label: 'Speaker incorrectly split' },
  { id: 'wrong_attribution', label: 'Wrong speaker attribution' },
  { id: 'other', label: 'Other' },
];

export default function SpeakerFeedbackModal({
  visible,
  onClose,
  meetingId,
  expectedSpeakers,
  detectedSpeakers,
  onSubmit,
  isSubmitting,
}: SpeakerFeedbackModalProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedType(null);
      setNotes('');
      setSubmitted(false);
      setError(null);
    }
  }, [visible]);

  const handleSubmit = async () => {
    // Require at least feedback type OR notes
    const hasNotes = notes.trim().length > 0;
    if (!selectedType && !hasNotes) {
      setError('Please select an issue type or provide notes.');
      return;
    }

    setError(null);

    try {
      await onSubmit(selectedType || undefined, notes || undefined);
      setSubmitted(true);
      // Auto close after success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('[SpeakerFeedback] Error submitting:', err);
      setError('Failed to submit feedback. Please try again.');
    }
  };

  const canSubmit = selectedType || notes.trim().length > 0;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center"
            onClick={onClose}
          >
            {/* Modal */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-full max-w-[540px] flex flex-col max-h-[75vh] pointer-events-auto"
              style={{
                backgroundColor: Colors.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ backgroundColor: Colors.border }}
                />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-4">
                <div className="flex items-center gap-2">
                  <Flag size={20} className="text-accent-light" />
                  <h2 className="text-lg font-semibold text-text">Report Issue</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-surface-light rounded-full transition-colors"
                >
                  <X size={20} className="text-text-muted" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 pb-6">
                {submitted ? (
                  // Success state
                  <div className="flex flex-col items-center justify-center py-12">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                      style={{ backgroundColor: Colors.success + '20' }}
                    >
                      <Check size={32} className="text-success" />
                    </div>
                    <h3 className="text-xl font-semibold text-text mb-2">Thank You!</h3>
                    <p className="text-text-secondary text-center">
                      Your feedback helps us improve speaker detection accuracy.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Speaker info */}
                    {detectedSpeakers !== null && (
                      <div
                        className="rounded-xl p-4 mb-5"
                        style={{ backgroundColor: Colors.surfaceLight }}
                      >
                        <p className="text-text-muted text-sm mb-1">Speaker Detection</p>
                        <p className="text-text font-medium">
                          Expected: {expectedSpeakers} | Detected: {detectedSpeakers}
                        </p>
                      </div>
                    )}

                    {/* Feedback type selection */}
                    <p className="text-text-secondary text-sm font-medium mb-3">
                      What&apos;s the issue? (optional)
                    </p>
                    <div className="space-y-2 mb-5">
                      {feedbackOptions.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setSelectedType(option.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                            selectedType === option.id
                              ? 'border-accent-light bg-accent-light/10'
                              : 'border-border hover:border-border-light'
                          }`}
                        >
                          {/* Radio button */}
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedType === option.id
                                ? 'border-accent-light'
                                : 'border-text-muted'
                            }`}
                          >
                            {selectedType === option.id && (
                              <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: Colors.accentLight }}
                              />
                            )}
                          </div>
                          <span
                            className={`text-sm ${
                              selectedType === option.id
                                ? 'text-text font-medium'
                                : 'text-text-secondary'
                            }`}
                          >
                            {option.label}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Notes input */}
                    <p className="text-text-secondary text-sm font-medium mb-3">
                      Additional notes (optional)
                    </p>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Describe the issue..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-transparent text-text placeholder:text-text-muted resize-none focus:outline-none focus:border-accent-light transition-colors"
                    />

                    {/* Error message */}
                    {error && (
                      <p className="text-error text-sm mt-3">{error}</p>
                    )}

                    {/* Submit button */}
                    <button
                      onClick={handleSubmit}
                      disabled={!canSubmit || isSubmitting}
                      className={`w-full mt-5 py-3.5 rounded-xl font-semibold transition-colors ${
                        canSubmit && !isSubmitting
                          ? 'bg-accent-light text-white hover:bg-accent-light/90'
                          : 'bg-surface-light text-text-muted cursor-not-allowed'
                      }`}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
                          <span>Submitting...</span>
                        </div>
                      ) : (
                        'Submit Feedback'
                      )}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

