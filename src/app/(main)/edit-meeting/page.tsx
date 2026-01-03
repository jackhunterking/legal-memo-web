'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Loader2,
  User,
  Tag,
  DollarSign,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useMeetings } from '@/hooks/useMeetings';
import { useContacts } from '@/hooks/useContacts';

function EditMeetingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const meetingId = searchParams.get('id');

  const { meetings, meetingTypes, updateMeeting, isUpdating } = useMeetings();
  const { contacts } = useContacts();

  const meeting = meetings?.find((m) => m.id === meetingId);

  const [title, setTitle] = useState('');
  const [contactId, setContactId] = useState<string | null>(null);
  const [meetingTypeId, setMeetingTypeId] = useState<string | null>(null);
  const [isBillable, setIsBillable] = useState(false);

  // Load meeting data
  useEffect(() => {
    if (meeting) {
      setTitle(meeting.title);
      setContactId(meeting.contact_id);
      setMeetingTypeId(meeting.meeting_type_id);
      setIsBillable(meeting.is_billable);
    }
  }, [meeting]);

  const handleSave = async () => {
    if (!meetingId || !title.trim()) {
      alert('Please enter a title');
      return;
    }

    try {
      await updateMeeting({
        meetingId,
        updates: {
          title: title.trim(),
          contact_id: contactId,
          meeting_type_id: meetingTypeId,
          is_billable: isBillable,
        },
      });
      router.back();
    } catch (err) {
      console.error('[EditMeeting] Save error:', err);
      alert('Failed to save meeting');
    }
  };

  if (!meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-accent-light border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedType = meetingTypeId
    ? meetingTypes?.find((t) => t.id === meetingTypeId)
    : null;

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-surface rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-text" />
          </button>

          <h1 className="text-lg font-semibold text-text">Edit Meeting</h1>

          <button
            onClick={handleSave}
            disabled={isUpdating || !title.trim()}
            className="p-2 hover:bg-surface rounded-lg transition-colors disabled:opacity-50"
          >
            {isUpdating ? (
              <Loader2 size={24} className="text-accent-light animate-spin" />
            ) : (
              <Save size={24} className="text-accent-light" />
            )}
          </button>
        </div>
      </div>

      <div className="px-4 pt-6 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Meeting title"
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:border-accent-light"
          />
        </div>

        {/* Contact */}
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">
            <User size={14} className="inline mr-1" />
            Contact
          </label>
          <select
            value={contactId || ''}
            onChange={(e) => setContactId(e.target.value || null)}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-accent-light"
          >
            <option value="">No contact</option>
            {contacts?.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.first_name}
                {contact.last_name && ` ${contact.last_name}`}
                {contact.company && ` (${contact.company})`}
              </option>
            ))}
          </select>
        </div>

        {/* Meeting Type */}
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">
            <Tag size={14} className="inline mr-1" />
            Meeting Type
          </label>
          <select
            value={meetingTypeId || ''}
            onChange={(e) => setMeetingTypeId(e.target.value || null)}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-accent-light"
          >
            <option value="">No type</option>
            {meetingTypes?.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          {selectedType && (
            <div className="mt-2 flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedType.color }}
              />
              <span
                className="text-sm"
                style={{ color: selectedType.color }}
              >
                {selectedType.name}
              </span>
            </div>
          )}
        </div>

        {/* Billable Toggle */}
        <div className="bg-surface rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign size={18} className="text-text-muted" />
              <div>
                <p className="text-text font-semibold">Billable</p>
                <p className="text-xs text-text-muted">
                  Track time for billing
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsBillable(!isBillable)}
              className="p-1"
            >
              {isBillable ? (
                <ToggleRight size={32} className="text-success" />
              ) : (
                <ToggleLeft size={32} className="text-text-muted" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditMeetingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-3 border-accent-light border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <EditMeetingContent />
    </Suspense>
  );
}
