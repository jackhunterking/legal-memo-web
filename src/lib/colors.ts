const Colors = {
  primary: '#1A1A2E',
  primaryLight: '#16213E',
  accent: '#0F3460',
  accentLight: '#E94560',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  
  background: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceLight: '#252542',
  
  text: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  
  border: '#2D2D4A',
  borderLight: '#3D3D5C',
  
  recording: '#EF4444',
  recordingPulse: 'rgba(239, 68, 68, 0.3)',
  
  statusProcessing: '#F59E0B',
  statusReady: '#10B981',
  statusFailed: '#EF4444',
  
  certaintyExplicit: '#10B981',
  certaintyUnclear: '#F59E0B',
};

export default Colors;

/**
 * Get color scheme for each speaker based on their label
 * Matches the mobile app's speaker color system
 */
export const getSpeakerColors = (speaker: string): { accent: string; text: string } => {
  const formattedSpeaker = formatSpeakerLabel(speaker).toUpperCase();
  
  // Check the last character to determine which speaker (A, B, C, etc.)
  if (formattedSpeaker.endsWith('A')) {
    return { accent: '#3b82f6', text: '#60a5fa' }; // Blue
  }
  if (formattedSpeaker.endsWith('B')) {
    return { accent: '#ef4444', text: '#f87171' }; // Red
  }
  if (formattedSpeaker.endsWith('C')) {
    return { accent: '#8b5cf6', text: '#a78bfa' }; // Purple
  }
  if (formattedSpeaker.endsWith('D')) {
    return { accent: '#10b981', text: '#34d399' }; // Green
  }
  return { accent: '#f59e0b', text: '#fbbf24' }; // Orange (for others)
};

/**
 * Format speaker label from "A", "B", "C" to "Speaker A", "Speaker B", "Speaker C"
 * If speakerNames mapping is provided, use the custom name if available
 */
export const formatSpeakerLabel = (
  speaker: string, 
  speakerNames?: Record<string, string> | null
): string => {
  // Check if there's a custom name mapping
  if (speakerNames && speakerNames[speaker]) {
    return speakerNames[speaker];
  }
  
  // If the speaker is already formatted (e.g., "Speaker A"), return as-is
  if (speaker.toLowerCase().startsWith('speaker')) {
    return speaker;
  }
  
  // Format single letter to "Speaker X"
  if (speaker.length === 1) {
    return `Speaker ${speaker.toUpperCase()}`;
  }
  
  // Return as-is if it's some other format
  return speaker;
};

