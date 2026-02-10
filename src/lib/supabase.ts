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
      // Fall through to anon-key request
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
 * Register the Clerk token getter for REST requests.
 * Called once by useUserProfile when the Clerk session becomes available.
 *
 * NOTE: We intentionally do NOT call supabase.realtime.setAuth() here.
 * The Clerk JWT causes CHANNEL_ERROR on the Realtime WebSocket because
 * the Supabase Realtime server can't validate it (missing `role` claim
 * or JWKS mismatch). Instead, Realtime uses the anon key, which works
 * fine because our RLS policies (temp_permissive_all) allow all roles.
 */
export const setClerkTokenGetter = async (getter: () => Promise<string | null>) => {
  if (_tokenGetterRegistered) return;
  _tokenGetterRegistered = true;
  _getClerkToken = getter;

  // Verify the token works for REST
  try {
    const token = await getter();
    if (token) {
      console.log('🔑 Clerk token registered for REST requests (Realtime uses anon key)');
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
