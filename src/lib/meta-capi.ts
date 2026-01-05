/**
 * Meta Conversions API Client for Web App
 * 
 * Handles:
 * - Bootstrapping fbp/fbc from URL params (from marketing site)
 * - fbp/fbc cookie persistence in localStorage
 * - Generating unique event IDs
 * - Sending events to Supabase edge function
 * - Including user data (email, userId) when authenticated
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const STORAGE_KEY_FBP = 'meta_fbp';
const STORAGE_KEY_FBC = 'meta_fbc';

interface MetaEventPayload {
  eventName: string;
  eventId: string;
  eventTime: number;
  eventSourceUrl: string;
  userData?: {
    email?: string;
    fbp?: string;
    fbc?: string;
    externalId?: string;
  };
  customData?: Record<string, unknown>;
  funnelSessionId?: string;
}

/**
 * Generate a unique event ID for deduplication
 */
function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate fbp (Facebook Browser ID) cookie value
 */
function generateFbp(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1e10);
  return `fb.1.${timestamp}.${random}`;
}

/**
 * Generate fbc (Facebook Click ID) cookie value from fbclid
 */
function generateFbcFromFbclid(fbclid: string): string {
  const timestamp = Date.now();
  return `fb.1.${timestamp}.${fbclid}`;
}

/**
 * Extract fbclid from current URL
 */
function extractFbclid(): string | null {
  if (typeof window === 'undefined') return null;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('fbclid');
}

/**
 * Bootstrap Meta cookies from URL params (from marketing site)
 * and clean up the URL
 */
export function bootstrapMetaCookies(): void {
  if (typeof window === 'undefined') return;
  
  const urlParams = new URLSearchParams(window.location.search);
  const metaFbp = urlParams.get('meta_fbp');
  const metaFbc = urlParams.get('meta_fbc');
  
  // Bootstrap fbp from marketing site
  if (metaFbp) {
    localStorage.setItem(STORAGE_KEY_FBP, metaFbp);
    if (process.env.NODE_ENV === 'development') {
      console.log('[Meta CAPI] Bootstrapped fbp from marketing site:', metaFbp);
    }
  }
  
  // Bootstrap fbc from marketing site
  if (metaFbc) {
    localStorage.setItem(STORAGE_KEY_FBC, metaFbc);
    if (process.env.NODE_ENV === 'development') {
      console.log('[Meta CAPI] Bootstrapped fbc from marketing site:', metaFbc);
    }
  }
  
  // Check for direct fbclid in URL (user came directly from Facebook)
  const fbclid = extractFbclid();
  if (fbclid && !metaFbc) {
    const fbc = generateFbcFromFbclid(fbclid);
    localStorage.setItem(STORAGE_KEY_FBC, fbc);
    if (process.env.NODE_ENV === 'development') {
      console.log('[Meta CAPI] Generated fbc from fbclid:', fbc);
    }
  }
  
  // Ensure fbp exists
  if (!localStorage.getItem(STORAGE_KEY_FBP)) {
    localStorage.setItem(STORAGE_KEY_FBP, generateFbp());
  }
  
  // Clean URL params (remove meta_* params)
  if (metaFbp || metaFbc) {
    const url = new URL(window.location.href);
    url.searchParams.delete('meta_fbp');
    url.searchParams.delete('meta_fbc');
    window.history.replaceState({}, '', url.toString());
  }
}

/**
 * Get stored fbp value or generate a new one
 */
export function getFbp(): string {
  if (typeof window === 'undefined') return generateFbp();
  
  let fbp = localStorage.getItem(STORAGE_KEY_FBP);
  if (!fbp) {
    fbp = generateFbp();
    localStorage.setItem(STORAGE_KEY_FBP, fbp);
  }
  return fbp;
}

/**
 * Get stored fbc value
 */
export function getFbc(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY_FBC);
}

/**
 * Send an event to Meta Conversions API via Supabase edge function
 */
export async function sendMetaEvent(
  eventName: string,
  customData?: Record<string, unknown>,
  userData?: { email?: string; externalId?: string }
): Promise<void> {
  if (typeof window === 'undefined') return;

  const payload: MetaEventPayload = {
    eventName,
    eventId: generateEventId(),
    eventTime: Math.floor(Date.now() / 1000), // UNIX timestamp in seconds
    eventSourceUrl: window.location.href,
    userData: {
      fbp: getFbp(),
      fbc: getFbc() || undefined,
      ...userData,
    },
    customData,
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/meta-capi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (process.env.NODE_ENV === 'development') {
      const result = await response.json();
      console.log(`[Meta CAPI] ${eventName}`, { success: response.ok, result });
    }
  } catch (error) {
    // Silently fail - don't break user experience for analytics
    if (process.env.NODE_ENV === 'development') {
      console.error('[Meta CAPI] Error sending event:', error);
    }
  }
}

/**
 * Send PageView event
 */
export function trackPageView(customData?: Record<string, unknown>): void {
  sendMetaEvent('PageView', customData);
}

/**
 * Send CompleteRegistration event (call after successful signup)
 */
export function trackCompleteRegistration(
  userData?: { email?: string; externalId?: string },
  customData?: Record<string, unknown>
): void {
  sendMetaEvent('CompleteRegistration', customData, userData);
}

