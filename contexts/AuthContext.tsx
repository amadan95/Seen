import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient'; // Adjust path if your supabaseClient is elsewhere

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithPassword: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, additionalData?: Record<string, any>) => Promise<any>;
  signOut: () => Promise<any>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInAnonymously: (captchaToken?: string) => Promise<{ user: User | null; session: Session | null; error: Error | null; }>;
  updateAnonymousUserToEmailPassword: (email: string, password: string) => Promise<{ user: User | null; error: Error | null; }>;
  linkOAuthToAnonymousUser: (provider: 'google' | 'apple' /* add other providers as needed */) => Promise<{ error: Error | null; }>;
  resetPasswordForEmail: (email: string, options?: { redirectTo?: string }) => Promise<{ error: Error | null }>;
  // Add other auth-related states or functions if needed, e.g., userProfile
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Could also set loading to false here if initial load is also handled by this
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) throw error;
    return data;
  };

  const signUp = async (email: string, password: string, additionalData: Record<string, any> = {}) => {
    setLoading(true);
    // Note: Supabase signUp might have options for metadata directly,
    // or you might need a separate step to create a user profile row after signup.
    // For now, keeping it simple.
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: additionalData // This is where you can pass metadata like username
      }
    });
    setLoading(false);
    if (error) throw error;
    // You might want to automatically sign in the user here or handle email confirmation
    return data;
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (signInError) throw signInError;
      // The user will be redirected, and onAuthStateChange will handle the session.
    } catch (err: any) {
      console.error("Error signing in with Google:", err);
      setError(err.message || 'Failed to sign in with Google.');
      setLoading(false); // Only set loading false on error, as redirect handles success
    }
  };

  const signInWithApple = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
    });
    setLoading(false); // Page will redirect
    if (error) {
      console.error('Error signing in with Apple:', error.message);
      throw error;
    }
  };

  const signInAnonymously = async (captchaToken?: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInAnonymously(
        captchaToken ? { options: { captchaToken } } : undefined
      );
      if (signInError) throw signInError;
      if (data.user) {
        setUser(data.user);
        // Potentially navigate or update UI state
      } else if (data.session) {
        // Fallback if user is null but session exists (should contain user)
        setUser(data.session.user);
      } else {
        throw new Error("Anonymous sign-in did not return user or session.");
      }
      setLoading(false);
      return { user: data.user, session: data.session, error: null };
    } catch (err: any) {
      console.error("Error signing in anonymously:", err);
      const errorMessage = err.message || 'Failed to sign in anonymously.';
      setError(errorMessage);
      setLoading(false);
      return { user: null, session: null, error: new Error(errorMessage) };
    }
  };

  const updateAnonymousUserToEmailPassword = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      // First, update the email. Supabase might require email verification before a password can be set if not already verified.
      // However, for converting anonymous, often setting both might work or Supabase handles the flow.
      const { data: updatedUserData, error: updateError } = await supabase.auth.updateUser({ email, password });
      if (updateError) throw updateError;
      
      // The onAuthStateChange listener should pick up the user change if successful.
      // If direct update, setUser might be needed, but updateUser usually triggers onAuthStateChange.
      setUser(updatedUserData.user);
      setLoading(false);
      return { user: updatedUserData.user, error: null };
    } catch (err: any) {
      console.error("Error updating anonymous user to email/password:", err);
      const errorMessage = err.message || 'Failed to update account.';
      setError(errorMessage);
      setLoading(false);
      return { user: null, error: new Error(errorMessage) };
    }
  };

  const linkOAuthToAnonymousUser = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setError(null);
    try {
      const { error: linkError } = await supabase.auth.linkIdentity({ provider });
      if (linkError) throw linkError;
      // On successful linking, Supabase usually handles the redirect and session update via onAuthStateChange.
      // No explicit user setting here, rely on onAuthStateChange.
      // setLoading(false) might not be reached if redirect occurs immediately.
      return { error: null };
    } catch (err: any) {
      console.error(`Error linking ${provider} to anonymous user:`, err);
      const errorMessage = err.message || `Failed to link ${provider} account.`;
      setError(errorMessage);
      setLoading(false); // Set loading false on error
      return { error: new Error(errorMessage) };
    }
  };

  const resetPasswordForEmail = async (email: string, options?: { redirectTo?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, options);
      setLoading(false);
      if (resetError) throw resetError;
      return { error: null };
    } catch (err: any) {
      console.error("Error sending password reset email:", err);
      const errorMessage = err.message || 'Failed to send password reset email.';
      setError(errorMessage);
      setLoading(false);
      return { error: new Error(errorMessage) };
    }
  };

  const value = {
    session,
    user,
    loading,
    error,
    signInWithPassword,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithApple,
    signInAnonymously,
    updateAnonymousUserToEmailPassword,
    linkOAuthToAnonymousUser,
    resetPasswordForEmail,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 