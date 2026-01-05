'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Check, Search } from 'lucide-react';
import Colors from '@/lib/colors';
import { Contact, getContactInitials, formatContactName } from '@/types';

interface ContactSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  contacts: Contact[];
  currentContactId: string | null;
  onSelect: (contactId: string | null) => Promise<void>;
  isSaving: boolean;
}

export default function ContactSelectorModal({
  visible,
  onClose,
  contacts,
  currentContactId,
  onSelect,
  isSaving,
}: ContactSelectorModalProps) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize selection when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedContactId(currentContactId);
      setSearchQuery('');
    }
  }, [visible, currentContactId]);

  // Filter contacts based on search
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    
    const query = searchQuery.toLowerCase();
    return contacts.filter((contact) => {
      const fullName = formatContactName(contact).toLowerCase();
      const company = contact.company?.toLowerCase() || '';
      return fullName.includes(query) || company.includes(query);
    });
  }, [contacts, searchQuery]);

  const handleSelect = async (contactId: string | null) => {
    setSelectedContactId(contactId);
    await onSelect(contactId);
  };

  // Get avatar background color based on contact name
  const getAvatarColor = (contact: Contact): string => {
    const colors = [
      '#3B82F6', // Blue
      '#8B5CF6', // Purple
      '#F59E0B', // Orange
      '#10B981', // Green
      '#EF4444', // Red
      '#EC4899', // Pink
      '#06B6D4', // Cyan
    ];
    const hash = contact.first_name.charCodeAt(0) + (contact.last_name?.charCodeAt(0) || 0);
    return colors[hash % colors.length];
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
                <h2 className="text-lg font-semibold text-text">Select Contact</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center hover:bg-border transition-colors"
                >
                  <X size={18} className="text-text-muted" />
                </button>
              </div>

              {/* Search Bar */}
              {contacts.length > 5 && (
                <div className="px-5 py-3 border-b border-border">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search contacts..."
                      className="w-full h-11 pl-10 pr-4 rounded-xl border bg-surface-light text-text placeholder:text-text-muted focus:outline-none focus:border-accent-light transition-colors"
                      style={{ borderColor: Colors.border }}
                    />
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-3">
                {/* No Contact Option */}
                <button
                  onClick={() => handleSelect(null)}
                  disabled={isSaving}
                  className={`w-full flex items-center justify-between py-4 px-4 rounded-xl mb-2 transition-colors ${
                    selectedContactId === null
                      ? 'bg-accent-light/10 border-2 border-accent-light'
                      : 'bg-surface-light hover:bg-border border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: Colors.border }}
                    >
                      <User size={18} className="text-text-muted" />
                    </div>
                    <span className="text-text font-medium">No contact</span>
                  </div>
                  {selectedContactId === null && (
                    <Check size={20} className="text-accent-light" />
                  )}
                </button>

                {/* Divider */}
                {filteredContacts.length > 0 && (
                  <div className="h-px bg-border my-2" />
                )}

                {/* Contacts List */}
                <div className="space-y-2">
                  {filteredContacts.map((contact) => {
                    const avatarColor = getAvatarColor(contact);
                    const isSelected = selectedContactId === contact.id;
                    
                    return (
                      <button
                        key={contact.id}
                        onClick={() => handleSelect(contact.id)}
                        disabled={isSaving}
                        className={`w-full flex items-center justify-between py-3 px-4 rounded-xl transition-colors ${
                          isSelected
                            ? 'bg-accent-light/10 border-2 border-accent-light'
                            : 'bg-surface-light hover:bg-border border-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: avatarColor }}
                          >
                            {getContactInitials(contact)}
                          </div>
                          {/* Name & Company */}
                          <div className="text-left">
                            <p className="text-text font-medium">
                              {formatContactName(contact)}
                            </p>
                            {contact.company && (
                              <p className="text-text-muted text-sm">
                                {contact.company}
                              </p>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <Check size={20} className="text-accent-light" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Empty States */}
                {contacts.length === 0 && (
                  <div className="text-center py-8">
                    <User size={32} className="text-text-muted mx-auto mb-2" />
                    <p className="text-text-secondary">No contacts created yet</p>
                    <p className="text-text-muted text-sm mt-1">
                      Add contacts to associate with your meetings
                    </p>
                  </div>
                )}

                {contacts.length > 0 && filteredContacts.length === 0 && searchQuery && (
                  <div className="text-center py-8">
                    <Search size={32} className="text-text-muted mx-auto mb-2" />
                    <p className="text-text-secondary">No contacts found</p>
                    <p className="text-text-muted text-sm mt-1">
                      Try a different search term
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
                    Tap a contact to select them
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

