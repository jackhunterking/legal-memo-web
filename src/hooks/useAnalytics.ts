import { useCallback } from 'react';
import { posthog } from '@/lib/posthog';

export function useAnalytics() {
  const trackEvent = useCallback((eventName: string, properties?: Record<string, unknown>) => {
    posthog?.capture(eventName, properties);
  }, []);

  const identifyUser = useCallback((
    userId: string,
    traits?: { email?: string; [key: string]: unknown }
  ) => {
    posthog?.identify(userId, traits);
  }, []);

  const setUserProperties = useCallback((properties: Record<string, unknown>) => {
    posthog?.people?.set(properties);
  }, []);

  const resetUser = useCallback(() => {
    posthog?.reset();
  }, []);

  return { trackEvent, identifyUser, setUserProperties, resetUser };
}

