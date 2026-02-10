import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY_NEW || import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Supabase credentials not found in .env.local');
  console.warn('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable database features');
}

/**
 * Token getter function — calls Clerk's session.getToken() to get a FRESH
 * JWT on every call. Clerk caches tokens internally and only hits the
 * network when the token is about to expire, so this is safe to call often.
 */
let _getClerkToken: (() => Promise<string | null>) | null = null;
let _tokenGetterRegistered = false;
let _realtimeRefreshInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Custom fetch that gets a FRESH Clerk JWT on every request.
 *
 * Why async per-request instead of caching?
 * - Clerk tokens expire in ~60s
 * - Caching + setInterval caused "JWT expired" errors between refreshes
 * - Clerk's getToken() is cheap (returns cached token if still valid)
 *
 * This only affects REST/PostgREST calls. Realtime WebSocket auth is
 * handled separately via supabase.realtime.setAuth().
 */
const customFetch: typeof fetch = async (input, init) => {
  if (_getClerkToken && init?.headers) {
    try {
      const token = await _getClerkToken();
      if (token) {
        const headers = new Headers(init.headers);
        headers.set('Authorization', `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      }
    } catch {
      // Fall through to anon-key request if token fetch fails
    }
  }
  return fetch(input, init);
};

/**
 * Supabase client — uses custom fetch to inject Clerk JWT on REST calls.
 * NO accessToken callback (that breaks Realtime).
 */
export const supabase: SupabaseClient<Database> | null = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: customFetch,
      },
    })
  : null;

/**
 * Register the Clerk token getter and set up auth for both REST and Realtime.
 * Called once by useUserProfile when the Clerk session becomes available.
 *
 * Guarded to only run once — React StrictMode and multiple renders can
 * cause this to be called multiple times.
 */
export const setClerkTokenGetter = async (getter: () => Promise<string | null>) => {
  // Guard: only register once
  if (_tokenGetterRegistered) return;
  _tokenGetterRegistered = true;

  _getClerkToken = getter;

  if (supabase) {
    try {
      const token = await getter();
      if (token) {
        // Set auth for Realtime WebSocket connection
        supabase.realtime.setAuth(token);
        console.log('🔑 Supabase auth configured (REST via per-request token, Realtime via setAuth)');

        // Refresh Realtime auth periodically (Clerk tokens expire ~60s)
        // REST calls get fresh tokens automatically via customFetch
        _realtimeRefreshInterval = setInterval(async () => {
          try {
            const freshToken = await getter();
            if (freshToken && supabase) {
              supabase.realtime.setAuth(freshToken);
            }
          } catch {
            // Silently ignore — next interval will retry
          }
        }, 45_000); // Refresh every 45 seconds (well within 60s expiry)
      }
    } catch (err) {
      console.error('❌ Failed to set Supabase auth:', err);
      // Reset guard so it can be retried
      _tokenGetterRegistered = false;
    }
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
