import posthog from 'posthog-js';

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY!;
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

export function initPostHog() {
  if (typeof window === 'undefined') return;
  if (posthog.__loaded) return;

  // Check for cross-domain params from marketing site
  const urlParams = new URLSearchParams(window.location.search);
  const bootstrapDistinctId = urlParams.get('ph_distinct_id');
  const bootstrapSessionId = urlParams.get('ph_session_id');

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false, // Manual for App Router
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    cross_subdomain_cookie: true,
    bootstrap: bootstrapDistinctId ? {
      distinctID: bootstrapDistinctId,
      ...(bootstrapSessionId && { sessionID: bootstrapSessionId }),
    } : undefined,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '[data-ph-mask]',
    },
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PostHog] Initialized', posthog.get_distinct_id());
      }
    },
  });

  // Clean URL params after bootstrap
  if (bootstrapDistinctId) {
    const url = new URL(window.location.href);
    url.searchParams.delete('ph_distinct_id');
    url.searchParams.delete('ph_session_id');
    window.history.replaceState({}, '', url.toString());
  }
}

export { posthog };

