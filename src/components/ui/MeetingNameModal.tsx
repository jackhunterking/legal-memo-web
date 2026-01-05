'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil } from 'lucide-react';
import Colors from '@/lib/colors';

interface MeetingNameModalProps {
  visible: boolean;
  onClose: () => void;
  currentTitle: string;
  onSave: (title: string) => Promise<void>;
  isSaving: boolean;
}

export default function MeetingNameModal({
  visible,
  onClose,
  currentTitle,
  onSave,
  isSaving,
}: MeetingNameModalProps) {
  const [title, setTitle] = useState('');

  // Initialize title when modal opens
  useEffect(() => {
    if (visible) {
      setTitle(currentTitle);
    }
  }, [visible, currentTitle]);

  const handleSave = async () => {
    if (!title.trim()) {
      return;
    }
    await onSave(title.trim());
  };

  const hasChanges = title.trim() !== currentTitle;

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
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Modal */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-[440px] flex flex-col max-h-[90vh] pointer-events-auto overflow-hidden"
              style={{
                backgroundColor: Colors.surface,
                borderRadius: 20,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-text">Edit Meeting Name</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center hover:bg-border transition-colors"
                >
                  <X size={18} className="text-text-muted" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                {/* Title Input */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Pencil size={16} className="text-text-muted" />
                    <p className="text-sm font-semibold text-text">Meeting Name</p>
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter meeting name"
                    className="w-full h-14 px-4 text-lg font-medium rounded-xl border bg-surface-light text-text placeholder:text-text-muted focus:outline-none focus:border-accent-light transition-colors"
                    style={{ borderColor: Colors.border }}
                    autoFocus
                  />
                </div>
              </div>

              {/* Footer - Save Button */}
              <div className="px-5 py-4 border-t border-border">
                <button
                  onClick={handleSave}
                  disabled={isSaving || !title.trim() || !hasChanges}
                  className={`w-full py-3.5 rounded-xl font-semibold transition-colors ${
                    isSaving || !title.trim() || !hasChanges
                      ? 'bg-surface-light text-text-muted cursor-not-allowed'
                      : 'bg-accent-light text-white hover:bg-accent-light/90'
                  }`}
                >
                  {isSaving ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </div>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

