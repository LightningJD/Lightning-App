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
 */
let _getClerkToken: (() => Promise<string | null>) | null = null;
let _tokenGetterRegistered = false;
let _realtimeRefreshInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Custom fetch that gets a FRESH Clerk JWT on every REST request.
 * Clerk's getToken() is cheap (returns cached token if still valid).
 */
const customFetch: typeof fetch = async (input, init) => {
  if (_getClerkToken) {
    try {
      const token = await _getClerkToken();
      if (token && init?.headers) {
        const headers = new Headers(init.headers);
        headers.set('Authorization', `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      }
    } catch {
      // Fall through to anon-key request — RLS write operations will fail
    }
  }
  return fetch(input, init);
};

/**
 * Supabase client — custom fetch for REST auth, setAuth() for Realtime.
 */
export const supabase: SupabaseClient<Database> | null = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: { fetch: customFetch },
    })
  : null;

/**
 * Register the Clerk token getter for REST and Realtime requests.
 * Called once by useUserProfile when the Clerk session becomes available.
 *
 * REST: customFetch injects the Clerk JWT on every request.
 * Realtime: setAuth() passes the Clerk JWT to the WebSocket connection
 * so that RLS policies (which use get_user_id() → auth.jwt()->>'sub')
 * work for real-time subscriptions too.
 *
 * This works because Supabase is configured with Clerk's third-party auth
 * integration (JWKS endpoint), so both PostgREST and Realtime can validate
 * the Clerk JWT.
 */
export const setClerkTokenGetter = async (getter: () => Promise<string | null>) => {
  if (_tokenGetterRegistered) return;
  _tokenGetterRegistered = true;
  _getClerkToken = getter;

  // Verify the token works and set it on both REST and Realtime
  try {
    const token = await getter();
    if (token && supabase) {
      supabase.realtime.setAuth(token);
      console.log('🔑 Clerk token registered for REST + Realtime');

      // Refresh the Realtime token every 50s (Clerk tokens expire at ~60s).
      // REST doesn't need this because customFetch gets a fresh token per request.
      _realtimeRefreshInterval = setInterval(async () => {
        try {
          const freshToken = await getter();
          if (freshToken && supabase) {
            supabase.realtime.setAuth(freshToken);
          }
        } catch {
          // Non-critical — next interval will retry
        }
      }, 50_000);
    }
  } catch (err) {
    console.error('❌ Failed to get initial Clerk token:', err);
    _tokenGetterRegistered = false;
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
