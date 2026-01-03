'use client';

import { useAuthStore } from '@/stores/auth-store';

export function useAuth() {
  const store = useAuthStore();

  return {
    user: store.user,
    profile: store.profile,
    session: store.session,
    isLoading: store.isLoading,
    isAuthenticated: store.isAuthenticated,
    error: store.error,
    signIn: store.signIn,
    signUp: store.signUp,
    signOut: store.signOut,
    resetPassword: store.resetPassword,
    updateProfile: store.updateProfile,
  };
}

