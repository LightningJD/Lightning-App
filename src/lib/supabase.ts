import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY_NEW || import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Supabase credentials not found in .env.local');
  console.warn('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable database features');
}

/**
 * Mutable Clerk JWT token — updated when Clerk session loads and refreshed periodically.
 * Used by the custom fetch wrapper to set the Authorization header on each request.
 */
let _currentToken: string | null = null;
let _getClerkToken: (() => Promise<string | null>) | null = null;

/**
 * Custom fetch that injects the Clerk JWT as the Authorization header.
 * This replaces the `accessToken` callback approach which broke Realtime.
 *
 * How it works: wraps the native fetch to override the Authorization header
 * with the Clerk JWT (when available). This way, every Supabase REST request
 * (queries, inserts, updates) uses the JWT for RLS, while Realtime stays
 * connected via the anon key and gets its auth via setAuth() separately.
 */
const customFetch: typeof fetch = (input, init) => {
  if (_currentToken && init?.headers) {
    // Clone headers and override Authorization with Clerk JWT
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${_currentToken}`);
    return fetch(input, { ...init, headers });
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
 */
export const setClerkTokenGetter = async (getter: () => Promise<string | null>) => {
  _getClerkToken = getter;

  if (supabase) {
    try {
      const token = await getter();
      if (token) {
        // Store token for the custom fetch wrapper (REST calls)
        _currentToken = token;

        // Set auth for Realtime WebSocket connection
        supabase.realtime.setAuth(token);

        console.log('🔑 Supabase auth configured (REST + Realtime)');

        // Refresh token periodically (Clerk tokens expire ~60s)
        setInterval(async () => {
          try {
            const freshToken = await getter();
            if (freshToken && supabase) {
              _currentToken = freshToken;
              supabase.realtime.setAuth(freshToken);
            }
          } catch {
            // Silently ignore refresh errors — next interval will retry
          }
        }, 50_000); // Refresh every 50 seconds
      }
    } catch (err) {
      console.error('❌ Failed to set Supabase auth:', err);
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
