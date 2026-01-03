import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// DEBUG: Log environment variable status (remove after debugging)
if (typeof window !== 'undefined') {
  console.log('[Supabase Debug] URL loaded:', supabaseUrl);
  console.log('[Supabase Debug] URL is valid (not placeholder):', supabaseUrl !== 'https://placeholder.supabase.co');
  console.log('[Supabase Debug] Key is valid (not placeholder):', supabaseAnonKey !== 'placeholder-key');
}

// Check if we have valid environment variables
const hasValidConfig = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

// Export a flag to check if Supabase is properly configured
export const isSupabaseConfigured = hasValidConfig;

// Track auth token for Edge Functions
let currentAuthToken: string | null = null;

// Auto-initialize auth listener for Edge Functions on module load
// This avoids redundant getSession calls - we rely on onAuthStateChange instead
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange(async (event, session) => {
    currentAuthToken = session?.access_token ?? null;
    try {
      await supabase.functions.setAuth(currentAuthToken ?? '');
    } catch (err) {
      console.error('[Supabase] setAuth error:', err);
    }
  });
}

// Legacy function - now a no-op since auth is auto-initialized above
// Kept for backwards compatibility if called elsewhere
export async function initSupabaseAuthForFunctions(client: SupabaseClient = supabase): Promise<void> {
  // Auth is now auto-initialized via onAuthStateChange listener
  // This function is a no-op but kept for API compatibility
  return;
}

export function getFunctionsAuthStatus() {
  return {
    initialized: functionsAuthInitialized,
    hasToken: !!currentAuthToken,
    tokenLength: currentAuthToken?.length ?? 0,
  };
}

/**
 * Get AssemblyAI token from Edge Function.
 */
export async function getAssemblyToken(client: SupabaseClient = supabase) {
  const response = await client.functions.invoke('get-assemblyai-token', { 
    method: 'POST',
  });
  
  if (response.error) {
    console.error('[Supabase] getAssemblyToken error:', response.error);
    throw response.error;
  }
  
  return response;
}

