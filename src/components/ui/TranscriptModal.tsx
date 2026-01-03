'use client';

import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TranscriptSegment } from '@/types';
import { getSpeakerColors, formatSpeakerLabel } from '@/lib/colors';
import Colors from '@/lib/colors';

interface TranscriptModalProps {
  visible: boolean;
  onClose: () => void;
  segments: TranscriptSegment[];
  fullText?: string | null;
  speakerNames: Record<string, string> | null;
  onSeekToTimestamp?: (ms: number) => void;
}

/**
 * Format timestamp from milliseconds to MM:SS
 */
const formatTimestamp = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * TranscriptModal Component
 * Full-screen modal showing all transcript segments with search
 * Matches the mobile app's DraggableBottomSheet design
 */
export default function TranscriptModal({
  visible,
  onClose,
  segments,
  fullText,
  speakerNames,
  onSeekToTimestamp,
}: TranscriptModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Reset search when modal opens
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
    }
  }, [visible]);

  // Filter segments based on search query
  const filteredSegments = segments.filter((segment) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const speakerLabel = formatSpeakerLabel(segment.speaker, speakerNames).toLowerCase();
    return segment.text.toLowerCase().includes(query) || speakerLabel.includes(query);
  });

  // Handle segment click
  const handleSegmentClick = (segment: TranscriptSegment) => {
    if (onSeekToTimestamp) {
      onSeekToTimestamp(segment.start_ms);
    }
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
            {/* Modal Container */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-full max-w-[540px] flex flex-col pointer-events-auto"
              style={{ 
                height: '92vh',
                backgroundColor: Colors.background,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
              }}
            >
              {/* Handle indicator */}
              <div className="flex justify-center pt-3 pb-0">
                <div 
                  className="w-9 h-1.5 rounded-full"
                  style={{ backgroundColor: Colors.border }}
                />
              </div>

              {/* Header */}
              <div 
                className="flex items-center justify-between px-5 pt-2 pb-4 border-b"
                style={{ borderColor: Colors.border }}
              >
                <h2 className="text-lg font-bold text-text">Transcript</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  style={{ backgroundColor: Colors.surfaceLight }}
                >
                  <X size={22} className="text-text-muted" />
                </button>
              </div>

              {/* Search Bar */}
              {segments.length > 0 && (
                <div className="px-5 pt-4">
                  <div 
                    className="flex items-center gap-2.5 rounded-xl px-3.5 h-12 border"
                    style={{ 
                      backgroundColor: Colors.surfaceLight,
                      borderColor: Colors.border,
                    }}
                  >
                    <Search size={18} className="text-text-muted flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Search in transcript..."
                      className="flex-1 bg-transparent text-text text-sm outline-none placeholder:text-text-muted"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus={false}
                    />
                    {searchQuery.length > 0 && (
                      <button onClick={() => setSearchQuery('')}>
                        <X size={18} className="text-text-muted hover:text-text transition-colors" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 pt-4 pb-10">
                {segments.length > 0 ? (
                  filteredSegments.length > 0 ? (
                    filteredSegments.map((segment) => (
                      <TranscriptSegmentCard
                        key={segment.id}
                        segment={segment}
                        speakerNames={speakerNames}
                        onClick={() => handleSegmentClick(segment)}
                      />
                    ))
                  ) : (
                    <p className="text-text-muted text-sm text-center py-4">
                      No matches found
                    </p>
                  )
                ) : fullText ? (
                  <p className="text-text-secondary text-base leading-relaxed whitespace-pre-wrap">
                    {fullText}
                  </p>
                ) : (
                  <p className="text-text-muted text-sm text-center py-4">
                    No transcript available
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Transcript Segment Card for full modal view
 */
interface TranscriptSegmentCardProps {
  segment: TranscriptSegment;
  speakerNames: Record<string, string> | null;
  onClick?: () => void;
}

function TranscriptSegmentCard({ segment, speakerNames, onClick }: TranscriptSegmentCardProps) {
  const colors = getSpeakerColors(segment.speaker);

  return (
    <button
      className="flex w-full text-left overflow-hidden mb-3 rounded-xl border transition-colors hover:bg-surface-light"
      style={{ 
        backgroundColor: Colors.surface,
        borderColor: Colors.border,
      }}
      onClick={onClick}
    >
      {/* Accent bar */}
      <div
        className="w-1.5 flex-shrink-0"
        style={{ backgroundColor: colors.accent }}
      />
      
      {/* Content */}
      <div className="flex-1 p-4 pl-5">
        {/* Speaker label */}
        <p
          className="text-sm font-bold uppercase tracking-wide mb-2.5"
          style={{ color: colors.text }}
        >
          {formatSpeakerLabel(segment.speaker, speakerNames)}
        </p>
        
        {/* Text */}
        <p className="text-text text-base leading-relaxed mb-2">
          {segment.text}
        </p>
        
        {/* Timestamp */}
        {segment.start_ms !== undefined && (
          <p className="text-xs text-text-muted mt-1">
            {formatTimestamp(segment.start_ms)}
          </p>
        )}
      </div>
    </button>
  );
}

