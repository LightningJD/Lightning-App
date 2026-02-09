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
 * This allows the module-level Supabase client to use Clerk's session token
 * for RLS without needing to create the client inside a React component.
 */
let _getClerkToken: (() => Promise<string | null>) | null = null;

export const setClerkTokenGetter = (getter: () => Promise<string | null>) => {
  _getClerkToken = getter;
};

export const supabase: SupabaseClient<Database> | null = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      accessToken: async () => {
        if (_getClerkToken) {
          return await _getClerkToken();
        }
        return null;
      },
    })
  : null;

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  return supabase !== null;
};
