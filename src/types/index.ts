/**
 * Types for Legal Memo Web
 * Adapted from mobile app - uses Web Crypto API instead of expo-crypto
 */

// =============================================================================
// Status Types
// =============================================================================

/** Meeting processing status */
export type MeetingStatus = 'uploading' | 'queued' | 'converting' | 'transcribing' | 'ready' | 'failed';

/** Processing job status */
export type ProcessingJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** Processing step indicator */
export type ProcessingStep = 'converting' | 'transcribing' | null;

/** Streaming session status */
export type StreamingSessionStatus = 'active' | 'completed' | 'failed' | 'expired';

// Profile
export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  onboarding_completed: boolean;
  hourly_rate: number | null;
  currency_symbol: string;
  polar_customer_id: string | null;
  trial_started_at: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Subscription & Usage Types
// =============================================================================

/** Subscription status */
export type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'billing_issue' | 'trialing' | 'past_due' | 'incomplete';

/** Cancellation reason */
export type CancellationReason = 'user_requested' | 'payment_failed' | 'trial_ended' | 'admin_revoked' | null;

// =============================================================================
// Subscription Status Helpers (Single Source of Truth)
// =============================================================================

export const ACTIVE_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  'active',
  'trialing',
] as const;

export function isSubscriptionActive(status: SubscriptionStatus | null | undefined): boolean {
  if (!status) return false;
  return (ACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(status);
}

export const BILLING_ISSUE_STATUSES: readonly SubscriptionStatus[] = [
  'billing_issue',
  'past_due',
  'incomplete',
] as const;

export function hasSubscriptionBillingIssue(status: SubscriptionStatus | null | undefined): boolean {
  if (!status) return false;
  return (BILLING_ISSUE_STATUSES as readonly string[]).includes(status);
}

export const INACTIVE_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  'canceled',
  'expired',
] as const;

// =============================================================================
// Cancellation Status Helpers
// =============================================================================

export function isCanceled(status: SubscriptionStatus | null | undefined): boolean {
  return status === 'canceled';
}

export function isCanceledButStillActive(subscription: Subscription | null | undefined): boolean {
  if (!subscription) return false;
  if (subscription.status !== 'canceled') return false;
  if (!subscription.current_period_end) return false;
  
  const periodEnd = new Date(subscription.current_period_end);
  return periodEnd > new Date();
}

export function getAccessEndDate(subscription: Subscription | null | undefined): Date | null {
  if (!subscription?.current_period_end) return null;
  return new Date(subscription.current_period_end);
}

export function getDaysUntilAccessEnds(subscription: Subscription | null | undefined): number {
  const endDate = getAccessEndDate(subscription);
  if (!endDate) return 0;
  
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/** Payment store type (Polar only) */
export type PaymentStore = 'polar';

/** Subscription record */
export interface Subscription {
  id: string;
  user_id: string;
  polar_subscription_id: string | null;
  polar_customer_id: string | null;
  status: SubscriptionStatus;
  plan_name: string;
  monthly_minutes_included: number;
  overage_rate_cents: number;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  cancellation_reason: CancellationReason;
  store: PaymentStore | null;
  environment: string | null;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Usage credits tracking */
export interface UsageCredits {
  id: string;
  user_id: string;
  minutes_used_this_period: number;
  period_start: string | null;
  period_end: string | null;
  lifetime_minutes_used: number;
  last_usage_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Usage transaction types */
export type UsageTransactionType = 'recording' | 'free_trial' | 'subscription_reset' | 'adjustment';

/** Result from can_user_record database function */
export interface CanRecordResult {
  can_record: boolean;
  has_active_trial: boolean;
  trial_started_at: string | null;
  trial_expires_at: string | null;
  trial_days_remaining: number;
  has_subscription: boolean;
  subscription_status: SubscriptionStatus | null;
  is_canceling: boolean;
  canceled_but_active: boolean;
  canceled_at: string | null;
  cancellation_reason: CancellationReason;
  access_ends_at: string | null;
  days_until_access_ends: number;
  current_period_end: string | null;
  reason: 'active_subscription' | 'canceled_but_active' | 'active_trial' | 'trial_expired';
}

/** Result from can_access_features database function */
export interface CanAccessResult {
  can_access: boolean;
  has_active_trial: boolean;
  trial_started_at: string | null;
  trial_expires_at: string | null;
  trial_days_remaining: number;
  has_subscription: boolean;
  subscription_status: SubscriptionStatus | null;
  is_canceling: boolean;
  canceled_but_active: boolean;
  canceled_at: string | null;
  cancellation_reason: CancellationReason;
  access_ends_at: string | null;
  days_until_access_ends: number;
  current_period_end: string | null;
  reason: 'active_subscription' | 'canceled_but_active' | 'active_trial' | 'trial_expired';
}

/** User's current usage state */
export interface UsageState {
  hasActiveSubscription: boolean;
  subscription: Subscription | null;
  hasActiveTrial: boolean;
  trialStartedAt: Date | null;
  trialExpiresAt: Date | null;
  trialDaysRemaining: number;
  isTrialExpired: boolean;
  isCanceling: boolean;
  canceledButStillActive: boolean;
  canceledAt: Date | null;
  cancellationReason: CancellationReason;
  accessEndsAt: Date | null;
  daysUntilAccessEnds: number;
  lifetimeMinutesUsed: number;
  periodStart: Date | null;
  periodEnd: Date | null;
  daysRemainingInPeriod: number;
  canRecord: boolean;
  canAccessFeatures: boolean;
  accessReason: 'active_subscription' | 'canceled_but_active' | 'active_trial' | 'trial_expired';
}

/** Subscription plan constants */
export const SUBSCRIPTION_PLAN = {
  name: 'Unlimited Access',
  priceMonthly: 97,
  isUnlimited: true,
  freeTrialDays: 7,
  features: [
    'Unlimited AI transcription',
    'Speaker diarization',
    'Automatic meeting summaries',
    'Shareable meeting links',
    'Contact & case management',
    'Secure cloud storage',
  ],
} as const;

// =============================================================================
// Trial Helper Functions
// =============================================================================

export function getTrialExpirationDate(trialStartedAt: string | Date | null): Date | null {
  if (!trialStartedAt) return null;
  const startDate = new Date(trialStartedAt);
  const expirationDate = new Date(startDate);
  expirationDate.setDate(expirationDate.getDate() + SUBSCRIPTION_PLAN.freeTrialDays);
  return expirationDate;
}

export function isTrialActive(trialStartedAt: string | Date | null): boolean {
  const expirationDate = getTrialExpirationDate(trialStartedAt);
  if (!expirationDate) return false;
  return expirationDate > new Date();
}

export function getTrialDaysRemaining(trialStartedAt: string | Date | null): number {
  const expirationDate = getTrialExpirationDate(trialStartedAt);
  if (!expirationDate) return 0;
  
  const now = new Date();
  const diffMs = expirationDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function formatTrialStatusMessage(
  trialStartedAt: string | Date | null,
  hasSubscription: boolean
): string {
  if (hasSubscription) {
    return 'Unlimited Access';
  }
  
  const daysRemaining = getTrialDaysRemaining(trialStartedAt);
  
  if (daysRemaining === 0) {
    return 'Trial expired - Subscribe to continue';
  }
  
  if (daysRemaining === 1) {
    return 'Trial ends tomorrow';
  }
  
  return `${daysRemaining} days left in trial`;
}

export function getDaysRemainingInPeriod(periodEnd: Date | null): number {
  if (!periodEnd) return 0;
  const now = new Date();
  const diffMs = periodEnd.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

// =============================================================================
// Billing Types & Constants
// =============================================================================

export const CURRENCY_SYMBOLS = [
  { symbol: '$', name: 'US Dollar (USD)' },
  { symbol: '€', name: 'Euro (EUR)' },
  { symbol: '£', name: 'British Pound (GBP)' },
  { symbol: '¥', name: 'Japanese Yen (JPY)' },
  { symbol: 'C$', name: 'Canadian Dollar (CAD)' },
  { symbol: 'A$', name: 'Australian Dollar (AUD)' },
  { symbol: '₹', name: 'Indian Rupee (INR)' },
  { symbol: 'CHF', name: 'Swiss Franc (CHF)' },
] as const;

export interface ContactBillingSummary {
  totalHours: number;
  totalAmount: number;
  billableMeetingsCount: number;
}

// Meeting Type
export interface MeetingType {
  id: string;
  user_id: string;
  name: string;
  color: string;
  is_default: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Contact Types
// =============================================================================

export type ExternalContactSource = 'clio' | 'practicepanther' | null;

export interface ContactCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  is_default: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  category_id: string | null;
  first_name: string;
  last_name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  external_id: string | null;
  external_source: ExternalContactSource;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactWithCategory extends Contact {
  category?: ContactCategory;
}

export const DEFAULT_CONTACT_CATEGORY_COLORS = [
  '#3B82F6', // Blue - Client
  '#EF4444', // Red - Opposing Counsel
  '#8B5CF6', // Purple - Witness
  '#F59E0B', // Orange - Expert
  '#10B981', // Green - Co-Counsel
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

// =============================================================================
// Meeting Share Types
// =============================================================================

export interface MeetingShare {
  id: string;
  meeting_id: string;
  share_token: string;
  password_hash: string | null;
  is_active: boolean;
  view_count: number;
  last_viewed_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMeetingShareInput {
  meetingId: string;
  password?: string;
  expiresAt?: string;
}

export interface MeetingShareLink {
  id: string;
  shareUrl: string;
  hasPassword: boolean;
  isActive: boolean;
  viewCount: number;
  lastViewedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

/**
 * Generate a cryptographically secure share token
 * Uses Web Crypto API instead of expo-crypto
 */
export function generateShareToken(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Helper to format contact display name
export function formatContactName(contact: Contact): string {
  if (contact.last_name) {
    return `${contact.first_name} ${contact.last_name}`;
  }
  return contact.first_name;
}

// Helper to get contact initials for avatar
export function getContactInitials(contact: Contact): string {
  const first = contact.first_name?.charAt(0) || '';
  const last = contact.last_name?.charAt(0) || '';
  return (first + last).toUpperCase() || '?';
}

// =============================================================================
// Meeting Types
// =============================================================================

export interface Meeting {
  id: string;
  user_id: string;
  title: string;
  status: MeetingStatus;
  raw_audio_path: string | null;
  mp3_audio_path: string | null;
  raw_audio_format: string | null;
  duration_seconds: number;
  recorded_at: string | null;
  expected_speakers: number;
  detected_speakers: number | null;
  speaker_mismatch: boolean;
  speaker_names: Record<string, string> | null;
  transcription_language: string;
  speech_model_used: string | null;
  meeting_type_id: string | null;
  contact_id: string | null;
  is_billable: boolean;
  billable_hours: number | null;
  billable_amount: number | null;
  billable_amount_manual: boolean;
  error_message: string | null;
  live_transcript_data: Record<string, unknown> | null;
  used_streaming_transcription: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transcript {
  id: string;
  meeting_id: string;
  full_text: string | null;
  summary: string | null;
  assemblyai_transcript_id: string | null;
  created_at: string;
}

export interface TranscriptSegment {
  id: string;
  meeting_id: string;
  speaker: string;
  text: string;
  start_ms: number;
  end_ms: number;
  confidence: number | null;
  is_streaming_result: boolean;
  streaming_session_id: string | null;
  created_at: string;
}

export interface ProcessingJob {
  id: string;
  meeting_id: string;
  status: ProcessingJobStatus;
  step: ProcessingStep;
  attempts: number;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingWithContact extends Meeting {
  contact?: {
    id: string;
    first_name: string;
    last_name: string | null;
    category_id: string | null;
    category?: {
      id: string;
      name: string;
      color: string;
    } | null;
  } | null;
}

export interface MeetingWithDetails extends Meeting {
  transcript?: Transcript;
  segments?: TranscriptSegment[];
  processing_job?: ProcessingJob;
  meeting_type?: MeetingType;
  contact?: ContactWithCategory;
}

// Helper function to get status display info
export function getStatusInfo(status: MeetingStatus): { label: string; color: string } {
  switch (status) {
    case 'uploading':
      return { label: 'Uploading', color: '#F59E0B' };
    case 'queued':
      return { label: 'Queued', color: '#6B7280' };
    case 'converting':
      return { label: 'Converting Audio', color: '#3B82F6' };
    case 'transcribing':
      return { label: 'Transcribing', color: '#8B5CF6' };
    case 'ready':
      return { label: 'Ready', color: '#10B981' };
    case 'failed':
      return { label: 'Failed', color: '#EF4444' };
    default:
      return { label: 'Unknown', color: '#6B7280' };
  }
}

// Helper to format duration
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0s';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs === 0 && mins === 0) {
    return `${secs}s`;
  }
  
  if (hrs === 0) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

// Helper to format timestamp from milliseconds
export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// =============================================================================
// Billing Helper Functions
// =============================================================================

export function secondsToHoursRoundUp(seconds: number): number {
  if (seconds <= 0) return 0;
  const minutes = Math.ceil(seconds / 60);
  return Math.round((minutes / 60) * 100) / 100;
}

export function formatCurrency(amount: number | null, symbol: string = '$'): string {
  if (amount === null || amount === undefined) return `${symbol}0.00`;
  return `${symbol}${amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

export function formatBillableHours(hours: number | null): string {
  if (hours === null || hours === undefined || hours === 0) return '0m';
  
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  
  if (h > 0 && m > 0) {
    return `${h}h ${m}m`;
  } else if (h > 0) {
    return `${h}h`;
  }
  return `${m}m`;
}

export function calculateBillableAmount(hours: number | null, hourlyRate: number | null): number | null {
  if (hours === null || hourlyRate === null || hours <= 0 || hourlyRate <= 0) {
    return null;
  }
  return Math.round(hours * hourlyRate * 100) / 100;
}

export function formatDurationForBilling(seconds: number): string {
  if (seconds <= 0) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.ceil((seconds % 3600) / 60);
  
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
}

export const DEFAULT_TYPE_COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#F59E0B', // Orange
  '#10B981', // Green
  '#EF4444', // Red
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

// =============================================================================
// Date/Time Helper Functions
// =============================================================================

export function getDurationColor(seconds: number): string {
  if (seconds < 1800) return '#10B981';
  if (seconds < 3600) return '#3B82F6';
  return '#F59E0B';
}

export function formatCompactDateTime(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  if (isToday) return `Today • ${time}`;
  if (isYesterday) return `Yesterday • ${time}`;
  
  const month = date.toLocaleDateString([], { month: 'short' });
  const day = date.getDate();
  return `${month} ${day} • ${time}`;
}

export function formatRecordingTimeline(
  startDate: Date, 
  durationSeconds: number
): string {
  const endDate = new Date(startDate.getTime() + durationSeconds * 1000);
  const startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `Started ${startTime} → Ended ${endTime}`;
}

// =============================================================================
// Streaming Transcription Types
// =============================================================================

export interface StreamingSession {
  id: string;
  meeting_id: string;
  assemblyai_session_id: string;
  expires_at: string | null;
  started_at: string;
  ended_at: string | null;
  last_activity_at: string;
  chunks_processed: number;
  status: StreamingSessionStatus;
  error_message: string | null;
  created_at: string;
}

export interface TranscriptTurn {
  id: string;
  speaker: string;
  text: string;
  startMs: number;
  endMs: number;
  confidence: number;
  isFinal: boolean;
}

export interface AudioChunk {
  meetingId: string;
  audioBase64: string;
  chunkIndex: number;
  format: string;
  durationMs: number;
}

export interface ChunkProcessingResult {
  partialText: string;
  finalSegments: Array<{
    text: string;
    speaker: string;
    startMs: number;
    endMs: number;
    confidence: number;
  }>;
  chunkIndex: number;
}

