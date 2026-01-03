'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Check, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Colors from '@/lib/colors';

interface SpeakerInfo {
  label: string;           // Original label (e.g., "Speaker A" or "A")
  customName: string;      // User-entered custom name
  color: string;           // Accent color for the speaker
}

interface EditSpeakerNamesModalProps {
  visible: boolean;
  onClose: () => void;
  speakers: string[];                              // Unique speaker labels from transcript
  currentNames: Record<string, string> | null;    // Current speaker_names mapping
  onSave: (speakerNames: Record<string, string>) => Promise<void>;
  isSaving: boolean;
}

/**
 * Get color for each speaker based on their label
 * Matches the mobile app's speaker color system
 */
const getSpeakerColor = (speaker: string): string => {
  const label = speaker.toUpperCase();
  if (label.endsWith('A') || label.includes('SPEAKER A')) return '#3b82f6'; // Blue
  if (label.endsWith('B') || label.includes('SPEAKER B')) return '#ef4444'; // Red
  if (label.endsWith('C') || label.includes('SPEAKER C')) return '#8b5cf6'; // Purple
  if (label.endsWith('D') || label.includes('SPEAKER D')) return '#10b981'; // Green
  return '#f59e0b'; // Orange for others
};

/**
 * Format speaker label for display
 */
const formatSpeakerDisplay = (speaker: string): string => {
  if (speaker.toLowerCase().startsWith('speaker')) {
    return speaker.toUpperCase();
  }
  if (speaker.length === 1) {
    return `SPEAKER ${speaker.toUpperCase()}`;
  }
  return speaker.toUpperCase();
};

/**
 * EditSpeakerNamesModal Component
 * Allows users to assign custom names to speakers in the transcript
 * Matches the mobile app's SpeakerNamesModal design
 */
export default function EditSpeakerNamesModal({
  visible,
  onClose,
  speakers,
  currentNames,
  onSave,
  isSaving,
}: EditSpeakerNamesModalProps) {
  const [speakerInfos, setSpeakerInfos] = useState<SpeakerInfo[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize speaker infos when modal opens
  useEffect(() => {
    if (visible && speakers.length > 0) {
      const infos: SpeakerInfo[] = speakers.map((speaker) => ({
        label: speaker,
        customName: currentNames?.[speaker] || '',
        color: getSpeakerColor(speaker),
      }));
      setSpeakerInfos(infos);
      setHasChanges(false);
    }
  }, [visible, speakers, currentNames]);

  // Update a speaker's custom name
  const updateSpeakerName = (index: number, name: string) => {
    const updated = [...speakerInfos];
    updated[index].customName = name;
    setSpeakerInfos(updated);
    setHasChanges(true);
  };

  // Set a speaker as "Me"
  const setAsMe = (index: number) => {
    const updated = [...speakerInfos];
    updated[index].customName = 'Me';
    setSpeakerInfos(updated);
    setHasChanges(true);
  };

  // Handle save
  const handleSave = async () => {
    // Build the speaker names mapping
    const speakerNames: Record<string, string> = {};
    for (const info of speakerInfos) {
      if (info.customName.trim()) {
        speakerNames[info.label] = info.customName.trim();
      }
    }
    
    await onSave(speakerNames);
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />

          {/* Modal Wrapper - centers the modal */}
          <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
            {/* Modal Container - bottom sheet style */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-full max-w-[540px] flex flex-col max-h-[80vh] pointer-events-auto"
              style={{ 
                backgroundColor: Colors.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
              }}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <UserCircle size={24} className="text-accent-light" />
                    <h2 className="text-xl font-bold text-text">Edit Speaker Names</h2>
                  </div>
                  <button
                    className="p-1 hover:bg-surface-light rounded-full transition-colors"
                    onClick={onClose}
                  >
                    <X size={24} className="text-text-muted" />
                  </button>
                </div>

                {/* Description */}
                <p className="text-sm text-text-secondary mb-5 leading-relaxed">
                  Assign names to speakers in your transcript. Use &quot;Me&quot; to identify yourself.
                </p>

                {/* Speaker List */}
                <div className="space-y-4 max-h-[40vh] overflow-y-auto mb-5">
                  {speakerInfos.map((speaker, index) => (
                    <div key={speaker.label}>
                      {/* Speaker Label with Color */}
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: speaker.color }}
                        />
                        <span className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
                          {formatSpeakerDisplay(speaker.label)}
                        </span>
                      </div>

                      {/* Input Row */}
                      <div className="flex items-center gap-2.5">
                        <input
                          type="text"
                          placeholder="Enter name..."
                          className="flex-1 h-12 bg-surface-light rounded-xl px-4 text-base text-text border border-border outline-none focus:border-accent-light transition-colors placeholder:text-text-muted"
                          value={speaker.customName}
                          onChange={(e) => updateSpeakerName(index, e.target.value)}
                          autoCapitalize="words"
                          autoCorrect="off"
                        />
                        
                        {/* "Me" Button */}
                        <button
                          className={`flex items-center gap-1.5 py-3 px-4 rounded-xl border transition-colors ${
                            speaker.customName === 'Me'
                              ? 'bg-accent-light border-accent-light'
                              : 'bg-surface-light border-border hover:bg-border'
                          }`}
                          onClick={() => setAsMe(index)}
                        >
                          <User 
                            size={16} 
                            className={speaker.customName === 'Me' ? 'text-background' : 'text-text-secondary'}
                          />
                          <span className={`text-sm font-semibold ${
                            speaker.customName === 'Me' ? 'text-text' : 'text-text-secondary'
                          }`}>
                            Me
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    className="flex-1 py-3.5 bg-surface-light rounded-xl border border-border font-semibold text-text-secondary hover:bg-border transition-colors disabled:opacity-50"
                    onClick={onClose}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  
                  <button
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 bg-accent-light rounded-xl font-semibold text-text transition-opacity ${
                      (!hasChanges || isSaving) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                    }`}
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving}
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-text border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check size={18} className="text-text" />
                        <span>Save Names</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

