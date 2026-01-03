import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '@/types';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      profile: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setSession: (session) => set({ session }),
      setProfile: (profile) => set({ profile }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      signIn: async (email, password) => {
        set({ error: null, isLoading: true });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          set({ user: data.user, session: data.session, isAuthenticated: true });
          
          // Fetch profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          
          if (profile) {
            set({ profile });
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Sign in failed';
          set({ error: message });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      signUp: async (email, password) => {
        set({ error: null, isLoading: true });
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });
          if (error) throw error;
          set({ user: data.user, session: data.session });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Sign up failed';
          set({ error: message });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      signOut: async () => {
        // Clear local state IMMEDIATELY for instant UI response
        // Don't wait for network - user should see immediate feedback
        set({ 
          user: null, 
          session: null, 
          profile: null, 
          isAuthenticated: false,
          isLoading: false,
        });
        
        // Sign out from Supabase in background with timeout
        // This clears server-side session but UI is already updated
        try {
          const signOutPromise = supabase.auth.signOut();
          const timeoutPromise = new Promise<void>((_, reject) => 
            setTimeout(() => reject(new Error('Sign out timeout')), 3000)
          );
          await Promise.race([signOutPromise, timeoutPromise]);
        } catch (err) {
          // Even if network fails/times out, local state is already cleared
          console.error('[Auth] Sign out error (state already cleared):', err);
        }
      },

      resetPassword: async (email) => {
        set({ error: null });
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          });
          if (error) throw error;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Password reset failed';
          set({ error: message });
          throw err;
        }
      },

      updateProfile: async (updates) => {
        const { user } = get();
        if (!user) throw new Error('Not authenticated');

        try {
          const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();

          if (error) throw error;
          set({ profile: data });
        } catch (err) {
          console.error('[Auth] Update profile error:', err);
          throw err;
        }
      },
    }),
    {
      name: 'legal-memo-auth',
      partialize: (state) => ({ 
        // Only persist these fields
        // Session is managed by Supabase
      }),
    }
  )
);

