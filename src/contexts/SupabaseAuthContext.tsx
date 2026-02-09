import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

// ── Types ──────────────────────────────────────────────────────

interface AuthResponse {
  user: User | null;
  error: AuthError | null;
}

interface SupabaseAuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signUp: (email: string, password: string, metadata?: { username?: string; display_name?: string }) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | null>(null);

// ── Provider ───────────────────────────────────────────────────

export const SupabaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen for auth state changes (login, logout, token refresh)
  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setIsLoading(false);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ── Auth methods ──────────────────────────────────────────────

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    if (!supabase) return { user: null, error: { message: 'Supabase not configured', name: 'ConfigError', status: 500 } as AuthError };

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { user: data?.user ?? null, error };
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    metadata?: { username?: string; display_name?: string }
  ): Promise<AuthResponse> => {
    if (!supabase) return { user: null, error: { message: 'Supabase not configured', name: 'ConfigError', status: 500 } as AuthError };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata, // stored in user.user_metadata
      },
    });
    return { user: data?.user ?? null, error };
  }, []);

  const signOutUser = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) return { error: { message: 'Supabase not configured', name: 'ConfigError', status: 500 } as AuthError };

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/sign-in`,
    });
    return { error };
  }, []);

  // ── Context value ─────────────────────────────────────────────

  const value: SupabaseAuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut: signOutUser,
    resetPassword,
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
};

// ── Hook ────────────────────────────────────────────────────────

export const useSupabaseAuth = (): SupabaseAuthContextType => {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};
