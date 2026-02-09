import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY_NEW || import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Supabase credentials not found in .env.local');
  console.warn('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable database features');
}

/**
 * Mutable token getter — set by useUserProfile when Clerk session loads.
 * Before the Clerk session is available, accessToken returns null which
 * makes fetchWithAuth fall back to the anon key (unauthenticated).
 * Once Clerk loads, it returns the Clerk JWT so auth.uid() works for RLS.
 */
let _getClerkToken: (() => Promise<string | null>) | null = null;
let _lastRealtimeAuthTime = 0;

export const setClerkTokenGetter = async (getter: () => Promise<string | null>) => {
  _getClerkToken = getter;

  // Also set the token for Realtime WebSocket connection
  // The accessToken callback only handles REST — Realtime needs setAuth() separately
  if (supabase) {
    try {
      const token = await getter();
      if (token) {
        supabase.realtime.setAuth(token);
        console.log('🔑 Realtime auth set with Clerk JWT');
      }
    } catch (err) {
      console.error('❌ Failed to set Realtime auth:', err);
    }
  }
};

export const supabase: SupabaseClient<Database> | null = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      accessToken: async () => {
        if (_getClerkToken) {
          try {
            const token = await _getClerkToken();
            if (token) {
              // Refresh Realtime auth every 30 seconds to keep WebSocket authenticated
              const now = Date.now();
              if (supabase && now - _lastRealtimeAuthTime > 30_000) {
                supabase.realtime.setAuth(token);
                _lastRealtimeAuthTime = now;
              }
            } else {
              console.warn('⚠️ Clerk token getter returned null');
            }
            return token;
          } catch (err) {
            console.error('❌ Clerk token getter error:', err);
            return null;
          }
        }
        console.warn('⚠️ No Clerk token getter registered yet');
        return null;
      },
    })
  : null;

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  return supabase !== null;
};
