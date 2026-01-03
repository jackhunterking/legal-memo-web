'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  Phone,
  Building2,
  FileText,
  Clock,
  DollarSign,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useContacts } from '@/hooks/useContacts';
import { useMeetings } from '@/hooks/useMeetings';
import { useUsage } from '@/hooks/useUsage';
import Colors from '@/lib/colors';
import {
  formatDuration,
  formatCurrency,
  getContactInitials,
  formatContactName,
  MeetingWithContact,
} from '@/types';

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id as string;

  const { contacts, contactCategories: categories, deleteContact } = useContacts();
  const { meetings, meetingTypes } = useMeetings();
  const { usageState } = useUsage();

  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState<'email' | 'phone' | null>(null);

  const contact = contacts?.find((c) => c.id === contactId);
  const category = contact?.category_id
    ? categories?.find((cat) => cat.id === contact.category_id)
    : contact?.category;

  // Get meetings for this contact
  const contactMeetings =
    meetings?.filter((m) => m.contact_id === contactId) || [];

  // Calculate stats
  const totalMeetings = contactMeetings.length;
  const totalDuration = contactMeetings.reduce(
    (sum, m) => sum + (m.duration_seconds || 0),
    0
  );
  const totalBillable = contactMeetings.reduce((sum, m) => {
    if (m.is_billable && m.billable_amount) {
      return sum + m.billable_amount;
    }
    return sum;
  }, 0);

  const handleDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this contact? Their meetings will remain but will no longer be linked.'
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteContact(contactId);
      router.replace('/contacts');
    } catch (err) {
      console.error('[ContactDetail] Delete error:', err);
      alert('Failed to delete contact');
      setIsDeleting(false);
    }
  };

  const handleCopy = async (type: 'email' | 'phone', value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!contact) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-accent-light border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials = getContactInitials(contact);
  const displayName = formatContactName(contact);
  const currencySymbol = '$'; // Default currency symbol

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

          <h1 className="text-lg font-semibold text-text flex-1 text-center truncate px-4">
            Contact
          </h1>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-surface rounded-lg transition-colors"
            >
              <MoreVertical size={24} className="text-text" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-12 w-48 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-20"
                >
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      router.push(`/edit-contact?id=${contactId}`);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-light transition-colors"
                  >
                    <Edit size={18} className="text-text-secondary" />
                    <span className="text-text">Edit</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleDelete();
                    }}
                    disabled={isDeleting}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-light transition-colors"
                  >
                    <Trash2 size={18} className="text-error" />
                    <span className="text-error">Delete</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="px-4 pt-6">
        {/* Avatar & Name */}
        <div className="text-center mb-6">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: category?.color || Colors.accentLight }}
          >
            <span className="text-3xl font-bold text-white">{initials}</span>
          </div>

          <h2 className="text-2xl font-bold text-text mb-1">{displayName}</h2>

          {category && (
            <span
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-md"
              style={{
                backgroundColor: category.color + '20',
                color: category.color,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {category.name}
            </span>
          )}
        </div>

        {/* Contact Info */}
        <div className="bg-surface rounded-2xl border border-border mb-6 divide-y divide-border">
          {contact.email && (
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-text-muted" />
                <span className="text-text">{contact.email}</span>
              </div>
              <button
                onClick={() => handleCopy('email', contact.email!)}
                className="p-2 hover:bg-surface-light rounded-lg transition-colors"
              >
                {copied === 'email' ? (
                  <Check size={18} className="text-success" />
                ) : (
                  <Copy size={18} className="text-text-muted" />
                )}
              </button>
            </div>
          )}

          {contact.phone && (
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-text-muted" />
                <span className="text-text">{contact.phone}</span>
              </div>
              <button
                onClick={() => handleCopy('phone', contact.phone!)}
                className="p-2 hover:bg-surface-light rounded-lg transition-colors"
              >
                {copied === 'phone' ? (
                  <Check size={18} className="text-success" />
                ) : (
                  <Copy size={18} className="text-text-muted" />
                )}
              </button>
            </div>
          )}

          {contact.company && (
            <div className="flex items-center gap-3 p-4">
              <Building2 size={18} className="text-text-muted" />
              <span className="text-text">{contact.company}</span>
            </div>
          )}

          {!contact.email &&
            !contact.phone &&
            !contact.company && (
              <div className="p-4 text-center text-text-muted">
                No contact details added
              </div>
            )}
        </div>

        {/* Notes */}
        {contact.notes && (
          <div className="bg-surface rounded-2xl border border-border p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={18} className="text-text-muted" />
              <span className="text-sm font-semibold text-text">Notes</span>
            </div>
            <p className="text-text-secondary whitespace-pre-wrap">
              {contact.notes}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-surface rounded-xl p-4 border border-border text-center">
            <div className="w-8 h-8 rounded-lg bg-accent-light/20 flex items-center justify-center mx-auto mb-2">
              <FileText size={16} className="text-accent-light" />
            </div>
            <p className="text-xl font-bold text-text">{totalMeetings}</p>
            <p className="text-xs text-text-muted">Meetings</p>
          </div>

          <div className="bg-surface rounded-xl p-4 border border-border text-center">
            <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center mx-auto mb-2">
              <Clock size={16} className="text-success" />
            </div>
            <p className="text-xl font-bold text-text">
              {formatDuration(totalDuration)}
            </p>
            <p className="text-xs text-text-muted">Total Time</p>
          </div>

          <div className="bg-surface rounded-xl p-4 border border-border text-center">
            <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center mx-auto mb-2">
              <DollarSign size={16} className="text-warning" />
            </div>
            <p className="text-xl font-bold text-text">
              {formatCurrency(totalBillable, currencySymbol)}
            </p>
            <p className="text-xs text-text-muted">Billable</p>
          </div>
        </div>

        {/* Recent Meetings */}
        {contactMeetings.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-text mb-3">
              Recent Meetings
            </h3>
            <div className="space-y-3">
              {contactMeetings.slice(0, 5).map((meeting) => {
                const meetingType = meeting.meeting_type_id
                  ? meetingTypes?.find((t) => t.id === meeting.meeting_type_id)
                  : null;

                return (
                  <button
                    key={meeting.id}
                    onClick={() => router.push(`/meeting/${meeting.id}`)}
                    className="w-full bg-surface rounded-xl p-4 border border-border flex items-center justify-between hover:bg-surface-light transition-colors"
                  >
                    <div className="flex-1 text-left">
                      <h4 className="text-text font-semibold truncate">
                        {meeting.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-text-muted">
                          {new Date(meeting.created_at).toLocaleDateString()}
                        </span>
                        {meeting.duration_seconds > 0 && (
                          <span className="text-xs text-text-muted">
                            • {formatDuration(meeting.duration_seconds)}
                          </span>
                        )}
                        {meetingType && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: meetingType.color + '20',
                              color: meetingType.color,
                            }}
                          >
                            {meetingType.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <ExternalLink size={16} className="text-text-muted" />
                  </button>
                );
              })}
            </div>

            {contactMeetings.length > 5 && (
              <button
                onClick={() =>
                  router.push(`/meetings?contact=${contactId}`)
                }
                className="w-full mt-3 text-accent-light text-sm font-semibold hover:underline"
              >
                View all {contactMeetings.length} meetings
              </button>
            )}
          </div>
        )}

        {contactMeetings.length === 0 && (
          <div className="bg-surface rounded-xl p-8 border border-border text-center">
            <FileText size={32} className="text-text-muted mx-auto mb-2" />
            <p className="text-text-secondary">No meetings with this contact yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
