'use client';

import React, { useState } from 'react';
import { Flag, Pencil, Search, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { TranscriptSegment } from '@/types';
import { getSpeakerColors, formatSpeakerLabel } from '@/lib/colors';
import Colors from '@/lib/colors';
import TranscriptModal from './TranscriptModal';
import EditSpeakerNamesModal from './EditSpeakerNamesModal';
import SpeakerFeedbackModal from './SpeakerFeedbackModal';

interface TranscriptSectionProps {
  segments: TranscriptSegment[];
  fullText?: string | null;
  speakerNames: Record<string, string> | null;
  onSpeakerNamesChange: (names: Record<string, string>) => Promise<void>;
  onSeekToTimestamp?: (ms: number) => void;
  // Feedback props
  meetingId: string;
  expectedSpeakers: number;
  detectedSpeakers: number | null;
  onSubmitFeedback: (feedbackType?: string, notes?: string) => Promise<void>;
  isSubmittingFeedback: boolean;
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
 * TranscriptSection Component
 * Displays transcript preview with first 2 segments and "View All" button
 * Matches the mobile app's design
 */
export default function TranscriptSection({
  segments,
  fullText,
  speakerNames,
  onSpeakerNamesChange,
  onSeekToTimestamp,
  meetingId,
  expectedSpeakers,
  detectedSpeakers,
  onSubmitFeedback,
  isSubmittingFeedback,
}: TranscriptSectionProps) {
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [showEditNames, setShowEditNames] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSavingNames, setIsSavingNames] = useState(false);

  // Get unique speakers from segments
  const uniqueSpeakers = Array.from(new Set(segments.map(s => s.speaker)));

  // Filter segments based on search
  const filteredSegments = segments.filter((segment) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const speakerLabel = formatSpeakerLabel(segment.speaker, speakerNames).toLowerCase();
    return segment.text.toLowerCase().includes(query) || speakerLabel.includes(query);
  });

  // Handle saving speaker names
  const handleSaveSpeakerNames = async (names: Record<string, string>) => {
    setIsSavingNames(true);
    try {
      await onSpeakerNamesChange(names);
      setShowEditNames(false);
    } finally {
      setIsSavingNames(false);
    }
  };

  // Don't render if no segments and no full text
  if (segments.length === 0 && !fullText) {
    return null;
  }

  return (
    <>
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-text">Transcript</h2>
            {/* Feedback button */}
            {segments.length > 0 && (
              <button
                className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center hover:bg-border transition-colors"
                onClick={() => setShowFeedback(true)}
                title="Report speaker detection issue"
              >
                <Flag size={14} className="text-text-muted" />
              </button>
            )}
          </div>
          
          {/* Edit Names button */}
          {segments.length > 0 && (
            <button
              className="flex items-center gap-1 h-8 px-3 bg-surface-light rounded-2xl border hover:bg-border transition-colors"
              style={{ borderColor: `${Colors.accentLight}40` }}
              onClick={() => setShowEditNames(true)}
            >
              <Pencil size={14} className="text-accent-light" />
              <span className="text-xs font-semibold text-accent-light">Edit Names</span>
            </button>
          )}
        </div>

        {/* Search Bar - below header */}
        {segments.length > 0 && (
          <div className="px-4 pt-3">
            <div className="flex items-center gap-2.5 bg-surface-light rounded-xl px-3.5 h-12 border border-border">
              <Search size={18} className="text-text-muted flex-shrink-0" />
              <input
                type="text"
                placeholder="Search in transcript..."
                className="flex-1 bg-transparent text-text text-sm outline-none placeholder:text-text-muted"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
        <div className="p-4">
          {segments.length > 0 ? (
            <div className="relative">
              {/* Preview segments (first 2 or filtered) */}
              {(searchQuery ? filteredSegments : segments.slice(0, 2)).map((segment) => (
                <SegmentCard
                  key={segment.id}
                  segment={segment}
                  speakerNames={speakerNames}
                  variant="preview"
                  onClick={() => onSeekToTimestamp?.(segment.start_ms)}
                />
              ))}

              {/* No search results */}
              {searchQuery && filteredSegments.length === 0 && (
                <p className="text-text-muted text-sm text-center py-4">
                  No matches found
                </p>
              )}

              {/* View All overlay - always show when not searching and segments exist */}
              {!searchQuery && segments.length > 0 && (
                <div className="relative -mx-4 -mb-4 mt-0">
                  {/* Gradient overlay - more prominent */}
                  <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `linear-gradient(to bottom, transparent 0%, ${Colors.surface}90 40%, ${Colors.surface} 100%)`,
                    }}
                  />
                  {/* View All button */}
                  <button
                    className="relative w-full py-4 text-accent-light font-semibold text-sm hover:text-accent-light/80 transition-colors"
                    onClick={() => setShowFullTranscript(true)}
                  >
                    View All {segments.length > 2 && `(${segments.length})`}
                  </button>
                </div>
              )}
            </div>
          ) : fullText ? (
            <div>
              <p className="text-text-secondary text-sm leading-relaxed line-clamp-4">
                {fullText}
              </p>
              <button
                className="text-accent-light font-medium text-sm mt-2 hover:text-accent-light/80 transition-colors"
                onClick={() => setShowFullTranscript(true)}
              >
                View Full
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Full Transcript Modal */}
      <TranscriptModal
        visible={showFullTranscript}
        onClose={() => setShowFullTranscript(false)}
        segments={segments}
        fullText={fullText}
        speakerNames={speakerNames}
        onSeekToTimestamp={onSeekToTimestamp}
      />

      {/* Edit Speaker Names Modal */}
      <EditSpeakerNamesModal
        visible={showEditNames}
        onClose={() => setShowEditNames(false)}
        speakers={uniqueSpeakers}
        currentNames={speakerNames}
        onSave={handleSaveSpeakerNames}
        isSaving={isSavingNames}
      />

      {/* Speaker Feedback Modal */}
      <SpeakerFeedbackModal
        visible={showFeedback}
        onClose={() => setShowFeedback(false)}
        meetingId={meetingId}
        expectedSpeakers={expectedSpeakers}
        detectedSpeakers={detectedSpeakers}
        onSubmit={onSubmitFeedback}
        isSubmitting={isSubmittingFeedback}
      />
    </>
  );
}

/**
 * Segment Card Component
 * Individual transcript segment with colored accent bar
 */
interface SegmentCardProps {
  segment: TranscriptSegment;
  speakerNames: Record<string, string> | null;
  variant: 'preview' | 'full';
  onClick?: () => void;
}

export function SegmentCard({ segment, speakerNames, variant, onClick }: SegmentCardProps) {
  const colors = getSpeakerColors(segment.speaker);
  const isPreview = variant === 'preview';

  return (
    <motion.button
      className={`flex w-full text-left overflow-hidden mb-3 last:mb-0 ${
        isPreview 
          ? 'bg-surface-light rounded-lg' 
          : 'bg-surface rounded-xl border border-border'
      }`}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
    >
      {/* Accent bar */}
      <div
        className={`${isPreview ? 'w-1' : 'w-1.5'} flex-shrink-0`}
        style={{ backgroundColor: colors.accent }}
      />
      
      {/* Content */}
      <div className={`flex-1 ${isPreview ? 'p-3' : 'p-4 pl-5'}`}>
        {/* Speaker label */}
        <p
          className={`font-bold uppercase tracking-wide ${
            isPreview ? 'text-xs mb-1.5' : 'text-sm mb-2.5'
          }`}
          style={{ color: colors.text }}
        >
          {formatSpeakerLabel(segment.speaker, speakerNames)}
        </p>
        
        {/* Text */}
        <p className={`text-text-secondary leading-relaxed ${
          isPreview ? 'text-sm line-clamp-2' : 'text-base mb-2'
        }`}>
          {segment.text}
        </p>
        
        {/* Timestamp - only show in full view */}
        {!isPreview && segment.start_ms !== undefined && (
          <p className="text-xs text-text-muted mt-1">
            {formatTimestamp(segment.start_ms)}
          </p>
        )}
      </div>
    </motion.button>
  );
}

