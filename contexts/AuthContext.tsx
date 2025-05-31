import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient'; // Adjust path if your supabaseClient is elsewhere

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, additionalData?: Record<string, any>) => Promise<any>;
  signOut: () => Promise<any>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  // Add other auth-related states or functions if needed, e.g., userProfile
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    setLoading(false); // Typically, the page will redirect, so this might not always be hit before redirect
    if (error) {
      console.error('Error signing in with Google:', error.message);
      throw error;
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

  const value = {
    session,
    user,
    loading,
    signInWithPassword,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithApple,
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