'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { Contact, ContactWithCategory, ContactCategory } from '@/types';

export function useContacts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all contacts
  const { 
    data: contacts = [], 
    isLoading: isContactsLoading, 
    isRefetching: isContactsRefreshing,
    refetch: refetchContacts 
  } = useQuery({
    queryKey: ['contacts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          category:contact_categories(*)
        `)
        .eq('user_id', user.id)
        .order('first_name', { ascending: true });
      
      if (error) throw error;
      return data as ContactWithCategory[];
    },
    enabled: !!user?.id,
  });

  // Fetch contact categories
  const { 
    data: contactCategories = [],
    isLoading: isContactCategoriesLoading,
    refetch: refetchContactCategories,
  } = useQuery({
    queryKey: ['contactCategories', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('contact_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as ContactCategory[];
    },
    enabled: !!user?.id,
  });

  // Create contact
  const { mutateAsync: createContact, isPending: isCreatingContact } = useMutation({
    mutationFn: async (contact: Partial<Omit<Contact, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & { first_name: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          ...contact,
          user_id: user.id,
        })
        .select(`
          *,
          category:contact_categories(*)
        `)
        .single();
      
      if (error) throw error;
      return data as ContactWithCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  // Update contact
  const { mutateAsync: updateContact, isPending: isUpdatingContact } = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Contact> }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          category:contact_categories(*)
        `)
        .single();
      
      if (error) throw error;
      return data as ContactWithCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  // Delete contact
  const { mutateAsync: deleteContact, isPending: isDeletingContact } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  // Create contact category
  const { mutateAsync: createContactCategory, isPending: isCreatingCategory } = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('contact_categories')
        .insert({
          user_id: user.id,
          name,
          color,
          display_order: contactCategories.length,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as ContactCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactCategories'] });
    },
  });

  // Update contact category
  const { mutateAsync: updateContactCategory, isPending: isUpdatingCategory } = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ContactCategory> }) => {
      const { data, error } = await supabase
        .from('contact_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as ContactCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactCategories'] });
    },
  });

  // Delete contact category
  const { mutateAsync: deleteContactCategory, isPending: isDeletingCategory } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contact_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactCategories'] });
    },
  });

  return {
    contacts,
    contactCategories,
    isContactsLoading,
    isContactsRefreshing,
    isContactCategoriesLoading,
    isCreatingContact,
    isUpdatingContact,
    isDeletingContact,
    isCreatingCategory,
    isUpdatingCategory,
    isDeletingCategory,
    createContact,
    updateContact,
    deleteContact,
    createContactCategory,
    updateContactCategory,
    deleteContactCategory,
    refetchContacts,
    refetchContactCategories,
  };
}

// Hook for fetching a single contact with details
export function useContactDetails(contactId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['contact', contactId],
    queryFn: async () => {
      if (!contactId || !user?.id) return null;
      
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          category:contact_categories(*)
        `)
        .eq('id', contactId)
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data as ContactWithCategory;
    },
    enabled: !!contactId && !!user?.id,
  });
}

