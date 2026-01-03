'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, User, Building2, ChevronRight, RefreshCw } from 'lucide-react';
import { useContacts } from '@/hooks/useContacts';
import type { ContactWithCategory } from '@/types';
import { formatContactName, getContactInitials } from '@/types';

function ContactCard({ contact, onClick }: { contact: ContactWithCategory; onClick: () => void }) {
  const initials = getContactInitials(contact);
  const displayName = formatContactName(contact);
  const category = contact.category;

  return (
    <button
      onClick={onClick}
      className="card w-full text-left transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center gap-4"
    >
      {/* Avatar */}
      <div 
        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: category?.color || '#E94560' }}
      >
        <span className="text-white font-bold text-base">{initials}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-text truncate">{displayName}</span>
          {category && (
            <span 
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold"
              style={{ 
                backgroundColor: `${category.color}20`,
                color: category.color 
              }}
            >
              <span 
                className="w-1.5 h-1.5 rounded-full" 
                style={{ backgroundColor: category.color }}
              />
              {category.name}
            </span>
          )}
        </div>
        
        {contact.company && (
          <div className="flex items-center gap-1 mt-1">
            <Building2 size={12} className="text-text-muted" />
            <span className="text-sm text-text-muted truncate">{contact.company}</span>
          </div>
        )}
        
        {(contact.email || contact.phone) && (
          <p className="text-sm text-text-muted truncate mt-0.5">
            {contact.email || contact.phone}
          </p>
        )}
      </div>

      <ChevronRight size={18} className="text-text-muted flex-shrink-0" />
    </button>
  );
}

export default function ContactsPage() {
  const router = useRouter();
  const { contacts, contactCategories: categories, isContactsLoading, isContactsRefreshing, refetchContacts } = useContacts();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (!searchQuery.trim()) return true;
      
      const query = searchQuery.toLowerCase();
      const fullName = formatContactName(c).toLowerCase();
      const company = c.company?.toLowerCase() || '';
      const email = c.email?.toLowerCase() || '';
      const phone = c.phone || '';
      
      return fullName.includes(query) || 
             company.includes(query) || 
             email.includes(query) ||
             phone.includes(query);
    });
  }, [contacts, searchQuery]);

  // Sort contacts alphabetically
  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((a, b) => 
      formatContactName(a).localeCompare(formatContactName(b))
    );
  }, [filteredContacts]);

  const handleContactClick = (contact: ContactWithCategory) => {
    router.push(`/contact/${contact.id}`);
  };

  const handleAddContact = () => {
    router.push('/edit-contact');
  };

  return (
    <div className="pt-4 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text">Contacts</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetchContacts()}
            disabled={isContactsRefreshing}
            className="p-2 rounded-full bg-surface border border-border hover:bg-surface-light transition-colors disabled:opacity-50"
          >
            <RefreshCw size={20} className={`text-text-muted ${isContactsRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleAddContact}
            className="w-11 h-11 rounded-full bg-accent-light flex items-center justify-center hover:bg-accent-light/90 transition-colors"
          >
            <Plus size={20} className="text-white" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
        <input
          type="text"
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input pl-14"
        />
      </div>

      {/* Sync Indicator */}
      {isContactsRefreshing && (
        <div className="flex items-center justify-center gap-3 py-3 mb-4">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-text-secondary text-sm">Syncing your contacts...</span>
        </div>
      )}

      {/* Contact List */}
      <div className="space-y-3">
        {isContactsLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-accent-light border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sortedContacts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
              <User size={40} className="text-text-muted" />
            </div>
            <p className="text-text-secondary text-lg font-semibold mb-2">
              {searchQuery ? 'No contacts found' : 'No contacts yet'}
            </p>
            <p className="text-text-muted text-sm">
              {searchQuery 
                ? 'Try a different search term'
                : 'Add your first contact to link meetings and keep track of client interactions'
              }
            </p>
          </div>
        ) : (
          sortedContacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onClick={() => handleContactClick(contact)}
            />
          ))
        )}
      </div>
    </div>
  );
}

