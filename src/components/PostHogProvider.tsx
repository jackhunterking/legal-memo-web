'use client';

import { useEffect, Suspense, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initPostHog, posthog } from '@/lib/posthog';
import { bootstrapMetaCookies, trackPageView } from '@/lib/meta-capi';

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname;
      const params = searchParams.toString();
      // Exclude PostHog params from tracked URL
      if (params && !params.includes('ph_distinct_id')) {
        url = url + '?' + params;
      }
      posthog.capture('$pageview', { '$current_url': url });
    }
  }, [pathname, searchParams]);

  return null;
}

function MetaCapiPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      // Track PageView in Meta CAPI
      trackPageView({
        page_path: pathname,
        page_search: searchParams.toString(),
      });
    }
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const metaInitialized = useRef(false);

  useEffect(() => {
    initPostHog();
    
    // Bootstrap Meta cookies from URL params (from marketing site)
    // Only run once on initial load
    if (!metaInitialized.current) {
      metaInitialized.current = true;
      bootstrapMetaCookies();
    }
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
        <MetaCapiPageView />
      </Suspense>
      {children}
    </>
  );
}

