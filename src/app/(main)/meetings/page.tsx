'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock, CheckCircle, AlertCircle, Loader, Lock, DollarSign, RefreshCw } from 'lucide-react';
import { useMeetings } from '@/hooks/useMeetings';
import { useUsage } from '@/hooks/useUsage';
import { useAuth } from '@/hooks/useAuth';
import type { MeetingWithContact } from '@/types';
import { formatDuration, getStatusInfo, formatCurrency } from '@/types';

function StatusIndicator({ status, isLocked }: { status: string; isLocked?: boolean }) {
  if (isLocked) return <Lock size={16} className="text-warning" />;
  if (status === 'ready') return <CheckCircle size={16} className="text-success" />;
  if (status === 'failed') return <AlertCircle size={16} className="text-error" />;
  return <Loader size={16} className="text-accent-light animate-spin" />;
}

function MeetingCard({ 
  meeting, 
  onClick, 
  currencySymbol = '$', 
  isLocked = false 
}: { 
  meeting: MeetingWithContact; 
  onClick: () => void;
  currencySymbol?: string;
  isLocked?: boolean;
}) {
  const date = new Date(meeting.created_at);
  const statusInfo = getStatusInfo(meeting.status);
  const contactName = meeting.contact
    ? `${meeting.contact.first_name}${meeting.contact.last_name ? ' ' + meeting.contact.last_name : ''}`
    : null;

  // Check if meeting is still processing
  const isProcessing = meeting.status === 'queued' || 
    meeting.status === 'converting' || 
    meeting.status === 'transcribing' || 
    meeting.status === 'uploading';

  return (
    <div className="relative">
      <button
        onClick={isProcessing ? undefined : onClick}
        disabled={isProcessing}
        className={`card w-full text-left transition-all ${
          isProcessing 
            ? 'cursor-not-allowed' 
            : 'hover:scale-[1.01] active:scale-[0.99]'
        } ${isLocked ? 'opacity-85 border-warning/40' : ''}`}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <h3 className={`font-semibold truncate flex-1 pr-2 ${isLocked ? 'text-text-secondary' : 'text-text'}`}>
            {meeting.title}
          </h3>
          <StatusIndicator status={meeting.status} isLocked={isLocked} />
        </div>

        {/* Meta */}
        <div className="flex justify-between items-center text-sm text-text-muted mb-3">
          <span>
            {date.toLocaleDateString()} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {meeting.duration_seconds > 0 && (
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{formatDuration(meeting.duration_seconds)}</span>
            </div>
          )}
        </div>

        {/* Footer Badges */}
        <div className="flex flex-wrap gap-2">
          {isLocked && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-warning/20 text-warning rounded text-xs font-semibold">
              <Lock size={10} />
              Locked
            </span>
          )}
          
          {!isLocked && meeting.is_billable && meeting.billable_amount && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/20 text-success rounded text-xs font-semibold">
              <DollarSign size={10} />
              {formatCurrency(meeting.billable_amount, currencySymbol)}
            </span>
          )}

          {contactName && (
            <span className="px-2 py-1 bg-border text-text rounded text-xs font-semibold">
              {contactName}
            </span>
          )}

          {meeting.status !== 'ready' && !isLocked && (
            <span 
              className="px-2 py-1 rounded text-xs font-semibold"
              style={{ 
                backgroundColor: `${statusInfo.color}20`,
                color: statusInfo.color 
              }}
            >
              {statusInfo.label}
            </span>
          )}
        </div>
      </button>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-background/70 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
          <div className="flex items-center gap-3 px-4 py-2 bg-surface/90 rounded-full border border-border">
            <Loader size={16} className="text-accent-light animate-spin" />
            <span className="text-sm font-medium text-text-secondary">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MeetingsPage() {
  const router = useRouter();
  const { meetings, isLoading, isRefetching, refetchMeetings } = useMeetings();
  const { profile } = useAuth();
  const { isTrialExpired, hasActiveSubscription, hasActiveTrial } = useUsage();
  const [searchQuery, setSearchQuery] = useState('');

  const shouldLockMeetings = isTrialExpired && !hasActiveSubscription && !hasActiveTrial;
  const currencySymbol = profile?.currency_symbol || '$';

  // Check if any meetings are processing
  const hasProcessingMeetings = useMemo(() => {
    return meetings.some(m => 
      m.status === 'queued' || 
      m.status === 'converting' || 
      m.status === 'transcribing' || 
      m.status === 'uploading'
    );
  }, [meetings]);

  // Auto-refresh when there are processing meetings
  useEffect(() => {
    if (!hasProcessingMeetings) return;

    const pollInterval = setInterval(() => {
      refetchMeetings();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [hasProcessingMeetings, refetchMeetings]);

  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      // Don't show meetings that are still uploading
      if (m.status === 'uploading') return false;
      
      if (searchQuery.trim()) {
        return m.title.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [meetings, searchQuery]);

  const handleMeetingClick = (meeting: MeetingWithContact) => {
    if (shouldLockMeetings) {
      router.push('/subscription');
      return;
    }
    router.push(`/meeting/${meeting.id}`);
  };

  const handleRefresh = () => {
    refetchMeetings();
  };

  return (
    <div className="pt-4 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text">Meetings</h1>
        <button
          onClick={handleRefresh}
          disabled={isRefetching}
          className="p-2 rounded-full bg-surface border border-border hover:bg-surface-light transition-colors disabled:opacity-50"
        >
          <RefreshCw size={20} className={`text-text-muted ${isRefetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
        <input
          type="text"
          placeholder="Search meetings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input pl-14"
        />
      </div>

      {/* Sync Indicator */}
      {isRefetching && (
        <div className="flex items-center justify-center gap-3 py-3 mb-4">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-text-secondary text-sm">Syncing your meetings...</span>
        </div>
      )}

      {/* Meeting List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-accent-light border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary mb-2">
              {searchQuery ? 'No meetings found' : 'No meetings yet'}
            </p>
            {!searchQuery && (
              <p className="text-text-muted text-sm">
                Start a new recording from the Home tab
              </p>
            )}
          </div>
        ) : (
          filteredMeetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              onClick={() => handleMeetingClick(meeting)}
              currencySymbol={currencySymbol}
              isLocked={shouldLockMeetings}
            />
          ))
        )}
      </div>
    </div>
  );
}

