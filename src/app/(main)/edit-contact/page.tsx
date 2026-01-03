'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Loader2,
  Mail,
  Phone,
  Building2,
  FileText,
  Tag,
} from 'lucide-react';
import { useContacts } from '@/hooks/useContacts';
import Colors from '@/lib/colors';

function EditContactContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contactId = searchParams.get('id');
  const isNew = !contactId;

  const { contacts, contactCategories: categories, createContact, updateContact, isCreatingContact: isCreating, isUpdatingContact: isUpdating } = useContacts();

  const contact = contactId ? contacts?.find((c) => c.id === contactId) : null;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);

  // Track original values for change detection
  const [originalValues, setOriginalValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
    categoryId: null as string | null,
  });

  // Load contact data for editing
  useEffect(() => {
    if (contact) {
      const values = {
        firstName: contact.first_name,
        lastName: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        company: contact.company || '',
        notes: contact.notes || '',
        categoryId: contact.category_id,
      };
      setFirstName(values.firstName);
      setLastName(values.lastName);
      setEmail(values.email);
      setPhone(values.phone);
      setCompany(values.company);
      setNotes(values.notes);
      setCategoryId(values.categoryId);
      setOriginalValues(values);
    }
  }, [contact]);

  // Check if form has changes
  const hasChanges = isNew
    ? firstName.trim().length > 0 // For new contacts, enable if first name is entered
    : firstName.trim() !== originalValues.firstName ||
      lastName.trim() !== originalValues.lastName ||
      email.trim() !== originalValues.email ||
      phone.trim() !== originalValues.phone ||
      company.trim() !== originalValues.company ||
      notes.trim() !== originalValues.notes ||
      categoryId !== originalValues.categoryId;

  const handleSave = async () => {
    if (!firstName.trim()) {
      alert('Please enter a first name');
      return;
    }

    try {
      const contactData = {
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        company: company.trim() || null,
        notes: notes.trim() || null,
        category_id: categoryId,
      };

      if (isNew) {
        await createContact(contactData);
      } else if (contactId) {
        await updateContact({ id: contactId, updates: contactData });
      }

      router.back();
    } catch (err) {
      console.error('[EditContact] Save error:', err);
      alert(`Failed to ${isNew ? 'create' : 'update'} contact`);
    }
  };

  const isLoading = isCreating || isUpdating;
  const selectedCategory = categoryId
    ? categories?.find((c) => c.id === categoryId)
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

          <h1 className="text-lg font-semibold text-text">
            {isNew ? 'New Contact' : 'Edit Contact'}
          </h1>

          {/* Empty div for spacing */}
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 pt-6 space-y-6">
        {/* Name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-2">
              First Name *
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:border-accent-light"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-secondary mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:border-accent-light"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">
            <Tag size={14} className="inline mr-1" />
            Category
          </label>
          <select
            value={categoryId || ''}
            onChange={(e) => setCategoryId(e.target.value || null)}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-accent-light"
          >
            <option value="">No category</option>
            {categories?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {selectedCategory && (
            <div className="mt-2 flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedCategory.color }}
              />
              <span
                className="text-sm"
                style={{ color: selectedCategory.color }}
              >
                {selectedCategory.name}
              </span>
            </div>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">
            <Mail size={14} className="inline mr-1" />
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:border-accent-light"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">
            <Phone size={14} className="inline mr-1" />
            Phone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 234 567 8900"
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:border-accent-light"
          />
        </div>

        {/* Company */}
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">
            <Building2 size={14} className="inline mr-1" />
            Company
          </label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company name"
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:border-accent-light"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">
            <FileText size={14} className="inline mr-1" />
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes about this contact..."
            rows={4}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-muted focus:outline-none focus:border-accent-light resize-none"
          />
        </div>

        {/* Save Button */}
        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={isLoading || !firstName.trim() || !hasChanges}
            className="w-full bg-accent-light hover:bg-accent-light/90 disabled:bg-surface disabled:text-text-muted text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>{isNew ? 'Creating...' : 'Saving...'}</span>
              </>
            ) : (
              <>
                <Save size={20} />
                <span>{isNew ? 'Create Contact' : 'Save Changes'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EditContactPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-3 border-accent-light border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <EditContactContent />
    </Suspense>
  );
}

