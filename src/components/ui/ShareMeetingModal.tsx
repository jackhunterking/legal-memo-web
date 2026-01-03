'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Link,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader,
} from 'lucide-react';
import { MeetingShareLink } from '@/types';
import Colors from '@/lib/colors';

interface ShareMeetingModalProps {
  visible: boolean;
  onClose: () => void;
  meetingId: string;
  meetingTitle: string;
  shares: MeetingShareLink[];
  isLoadingShares: boolean;
  onCreateShare: (password?: string) => Promise<MeetingShareLink>;
  onToggleShare: (shareId: string, isActive: boolean) => Promise<void>;
  onDeleteShare: (shareId: string) => Promise<void>;
  isCreating: boolean;
  isToggling: boolean;
}

export default function ShareMeetingModal({
  visible,
  onClose,
  meetingId,
  meetingTitle,
  shares,
  isLoadingShares,
  onCreateShare,
  onToggleShare,
  onDeleteShare,
  isCreating,
  isToggling,
}: ShareMeetingModalProps) {
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newShareUrl, setNewShareUrl] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setUsePassword(false);
      setPassword('');
      setShowPassword(false);
      setNewShareUrl(null);
    }
  }, [visible]);

  const handleCreateShare = async () => {
    try {
      const shareLink = await onCreateShare(usePassword ? password : undefined);
      setNewShareUrl(shareLink.shareUrl);
      // Auto-copy to clipboard
      await handleCopy(shareLink.shareUrl, shareLink.id);
      // Reset form
      setPassword('');
      setUsePassword(false);
    } catch (error) {
      console.error('[ShareModal] Error creating share:', error);
      alert('Failed to create share link. Please try again.');
    }
  };

  const handleCopy = async (url: string, shareId: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(shareId);
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('[ShareModal] Error copying to clipboard:', error);
    }
  };

  const handleOpenLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formatShareDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDeleteShare = (shareId: string) => {
    if (confirm('Delete this share link? Anyone with this link will no longer be able to access the meeting.')) {
      onDeleteShare(shareId);
    }
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto bg-surface rounded-2xl border border-border z-50 overflow-hidden max-h-[85vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-text">Share Meeting</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-surface-light rounded-lg transition-colors"
              >
                <X size={20} className="text-text-muted" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* New Share Link Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-text mb-1">Create New Link</h3>
                  <p className="text-text-secondary text-sm">
                    Anyone with the link can view &quot;{meetingTitle}&quot;
                  </p>
                </div>

                {/* Password Toggle */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Lock size={18} className="text-text-muted" />
                    <span className="text-text-secondary">Password Protection</span>
                  </div>
                  <button
                    onClick={() => setUsePassword(!usePassword)}
                    className={`w-12 h-7 rounded-full transition-colors relative ${
                      usePassword ? 'bg-accent-light' : 'bg-border'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        usePassword ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Password Input */}
                {usePassword && (
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full bg-surface-light border border-border rounded-xl px-4 py-3 pr-12 text-text placeholder-text-muted focus:outline-none focus:border-accent-light transition-colors"
                      autoCapitalize="none"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                )}

                {/* Create Button */}
                <button
                  onClick={handleCreateShare}
                  disabled={isCreating || (usePassword && !password.trim())}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all ${
                    isCreating || (usePassword && !password.trim())
                      ? 'bg-accent-light/50 cursor-not-allowed'
                      : 'bg-accent-light hover:bg-accent-light/90'
                  }`}
                >
                  {isCreating ? (
                    <Loader size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Link size={18} />
                      <span>Create Share Link</span>
                    </>
                  )}
                </button>

                {/* Success Message */}
                {newShareUrl && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-success/15 rounded-xl">
                    <Check size={18} className="text-success" />
                    <span className="text-success text-sm font-medium">
                      Link created and copied to clipboard!
                    </span>
                  </div>
                )}
              </div>

              {/* Existing Links Section */}
              {shares.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-text">
                    Active Links ({shares.length})
                  </h3>

                  {shares.map((share) => (
                    <div
                      key={share.id}
                      className={`p-4 bg-surface-light rounded-xl border transition-opacity ${
                        share.isActive ? 'border-border' : 'border-border opacity-60'
                      }`}
                    >
                      {/* Share Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {share.hasPassword ? (
                            <Lock size={14} className="text-warning" />
                          ) : (
                            <Unlock size={14} className="text-success" />
                          )}
                          <span className="text-text-secondary text-sm">
                            Created {formatShareDate(share.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-text-muted">
                          <Eye size={12} />
                          <span className="text-xs">{share.viewCount}</span>
                        </div>
                      </div>

                      {/* Share Actions */}
                      <div className="flex items-center gap-2">
                        {/* Copy Button */}
                        <button
                          onClick={() => handleCopy(share.shareUrl, share.id)}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                            copiedId === share.id
                              ? 'bg-success/15 text-success'
                              : 'bg-surface text-text hover:bg-border'
                          }`}
                        >
                          {copiedId === share.id ? (
                            <Check size={16} />
                          ) : (
                            <Copy size={16} />
                          )}
                          <span>{copiedId === share.id ? 'Copied!' : 'Copy'}</span>
                        </button>

                        {/* Open Link Button */}
                        <button
                          onClick={() => handleOpenLink(share.shareUrl)}
                          className="p-2.5 bg-surface rounded-lg hover:bg-border transition-colors"
                          title="Open link"
                        >
                          <Link size={16} className="text-text" />
                        </button>

                        {/* Toggle Active Button */}
                        <button
                          onClick={() => onToggleShare(share.id, !share.isActive)}
                          disabled={isToggling}
                          className="p-2.5 bg-surface rounded-lg hover:bg-border transition-colors disabled:opacity-50"
                          title={share.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {share.isActive ? (
                            <ToggleRight size={16} className="text-success" />
                          ) : (
                            <ToggleLeft size={16} className="text-text-muted" />
                          )}
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteShare(share.id)}
                          className="p-2.5 bg-surface rounded-lg hover:bg-error/20 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} className="text-error" />
                        </button>
                      </div>

                      {/* Inactive Badge */}
                      {!share.isActive && (
                        <div className="mt-3 px-3 py-1.5 bg-warning/15 rounded-lg">
                          <span className="text-warning text-xs font-medium">
                            This link is deactivated
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Loading State */}
              {isLoadingShares && shares.length === 0 && (
                <div className="flex items-center justify-center py-8">
                  <Loader size={24} className="animate-spin text-text-muted" />
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

