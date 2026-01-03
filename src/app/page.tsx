'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

/**
 * Root page - handles initial routing based on auth state
 */
export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Don't redirect while loading or if already redirected
    if (isLoading || hasRedirected.current) return;

    console.log('[RootPage] Auth state:', { isAuthenticated, isLoading });

    hasRedirected.current = true;

    if (!isAuthenticated) {
      // Not logged in - go to auth page
      console.log('[RootPage] Redirecting to /auth (not authenticated)');
      router.replace('/auth');
    } else {
      // Logged in - go to main app
      console.log('[RootPage] Redirecting to /home (authenticated)');
      router.replace('/home');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading state while checking auth
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-accent-light border-t-transparent rounded-full animate-spin" />
        <span className="text-text-muted">Loading...</span>
      </div>
    </div>
  );
}
