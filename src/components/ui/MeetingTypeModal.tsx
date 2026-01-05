'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag, Check } from 'lucide-react';
import Colors from '@/lib/colors';
import { MeetingType } from '@/types';

interface MeetingTypeModalProps {
  visible: boolean;
  onClose: () => void;
  meetingTypes: MeetingType[];
  currentTypeId: string | null;
  onSelect: (typeId: string | null) => Promise<void>;
  isSaving: boolean;
}

export default function MeetingTypeModal({
  visible,
  onClose,
  meetingTypes,
  currentTypeId,
  onSelect,
  isSaving,
}: MeetingTypeModalProps) {
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);

  // Initialize selection when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedTypeId(currentTypeId);
    }
  }, [visible, currentTypeId]);

  const handleSelect = async (typeId: string | null) => {
    setSelectedTypeId(typeId);
    await onSelect(typeId);
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
                <h2 className="text-lg font-semibold text-text">Select Meeting Type</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center hover:bg-border transition-colors"
                >
                  <X size={18} className="text-text-muted" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-3">
                {/* No Type Option */}
                <button
                  onClick={() => handleSelect(null)}
                  disabled={isSaving}
                  className={`w-full flex items-center justify-between py-4 px-4 rounded-xl mb-2 transition-colors ${
                    selectedTypeId === null
                      ? 'bg-accent-light/10 border-2 border-accent-light'
                      : 'bg-surface-light hover:bg-border border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: Colors.border }}
                    >
                      <Tag size={16} className="text-text-muted" />
                    </div>
                    <span className="text-text font-medium">No type</span>
                  </div>
                  {selectedTypeId === null && (
                    <Check size={20} className="text-accent-light" />
                  )}
                </button>

                {/* Divider */}
                {meetingTypes.length > 0 && (
                  <div className="h-px bg-border my-2" />
                )}

                {/* Meeting Types List */}
                <div className="space-y-2">
                  {meetingTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => handleSelect(type.id)}
                      disabled={isSaving}
                      className={`w-full flex items-center justify-between py-4 px-4 rounded-xl transition-colors ${
                        selectedTypeId === type.id
                          ? 'border-2'
                          : 'bg-surface-light hover:bg-border border-2 border-transparent'
                      }`}
                      style={{
                        backgroundColor: selectedTypeId === type.id ? `${type.color}15` : undefined,
                        borderColor: selectedTypeId === type.id ? type.color : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${type.color}30` }}
                        >
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: type.color }}
                          />
                        </div>
                        <span className="text-text font-medium">{type.name}</span>
                      </div>
                      {selectedTypeId === type.id && (
                        <Check size={20} style={{ color: type.color }} />
                      )}
                    </button>
                  ))}
                </div>

                {meetingTypes.length === 0 && (
                  <div className="text-center py-8">
                    <Tag size={32} className="text-text-muted mx-auto mb-2" />
                    <p className="text-text-secondary">No meeting types created yet</p>
                    <p className="text-text-muted text-sm mt-1">
                      Create types in Settings to organize your meetings
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-border">
                {isSaving ? (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <div className="w-4 h-4 border-2 border-accent-light border-t-transparent rounded-full animate-spin" />
                    <span className="text-text-secondary text-sm">Saving...</span>
                  </div>
                ) : (
                  <p className="text-text-muted text-sm text-center">
                    Tap a type to select it
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

