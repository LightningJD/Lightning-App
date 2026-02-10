import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY_NEW || import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Supabase credentials not found in .env.local');
  console.warn('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable database features');
}

/**
 * Token getter — registered by useUserProfile once Clerk session is available.
 * Returns a FRESH Clerk JWT on every call. Clerk caches tokens internally,
 * so this is safe to call frequently.
 *
 * Before registration, returns null → Supabase falls back to anon key.
 */
let _getClerkToken: (() => Promise<string | null>) | null = null;

/**
 * Supabase client — uses the official `accessToken` callback.
 *
 * How it works:
 * - The `accessToken` callback is called on EVERY REST request AND by the
 *   Realtime heartbeat. Supabase internally calls `realtime.setAuth(token)`
 *   when it gets a new token from this callback.
 * - Before Clerk session is ready, it returns null → Supabase uses anon key.
 * - After registration, it returns a fresh Clerk JWT every time.
 *
 * This replaces the previous custom-fetch + setAuth approach which had
 * JWT expiration issues and didn't properly authenticate Realtime.
 */
export const supabase: SupabaseClient<Database> | null = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      accessToken: async () => {
        if (_getClerkToken) {
          try {
            return await _getClerkToken();
          } catch {
            return null;
          }
        }
        return null;
      },
    })
  : null;

/**
 * Register the Clerk token getter.
 * Called once by useUserProfile when the Clerk session becomes available.
 *
 * With the `accessToken` approach, this is all that's needed — Supabase
 * automatically uses the callback for both REST and Realtime auth.
 */
export const setClerkTokenGetter = async (getter: () => Promise<string | null>) => {
  _getClerkToken = getter;

  // Verify the token works
  try {
    const token = await getter();
    if (token) {
      console.log('🔑 Clerk token getter registered — Supabase will use it for REST + Realtime');
    } else {
      console.warn('⚠️ Clerk token getter registered but returned null');
    }
  } catch (err) {
    console.error('❌ Failed to get initial Clerk token:', err);
  }
};

/**
 * Get a fresh Clerk token (for manual use if needed).
 */
export const getClerkToken = async (): Promise<string | null> => {
  if (_getClerkToken) {
    try {
      return await _getClerkToken();
    } catch {
      return null;
    }
  }
  return null;
};

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  return supabase !== null;
};
