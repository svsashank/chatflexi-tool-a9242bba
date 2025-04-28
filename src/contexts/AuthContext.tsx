import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextProps {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitializing: boolean;
  isTokenRefresh: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any, data: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  signInWithGoogle?: () => void;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  session: null,
  isLoading: true,
  isInitializing: true,
  isTokenRefresh: false,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null, data: null }),
  signOut: async () => {},
  resetPassword: async () => ({ error: null }),
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isTokenRefresh, setIsTokenRefresh] = useState(false);
  const navigate = useNavigate();

  const handleAuthChange = useCallback((event: AuthChangeEvent, newSession: Session | null) => {
    if (event === 'TOKEN_REFRESHED') {
      console.log('Auth token refreshed - not creating a new conversation');
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsTokenRefresh(true);
      
      setTimeout(() => {
        setIsTokenRefresh(false);
      }, 1000);
    } else if (event === 'SIGNED_IN') {
      console.log('Auth state changed: SIGNED_IN');
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsTokenRefresh(false);
    } else if (event === 'SIGNED_OUT') {
      console.log('Auth state changed: SIGNED_OUT');
      setSession(null);
      setUser(null);
      setIsTokenRefresh(false);
      navigate('/auth');
    } else {
      console.log(`Auth state changed: ${event}`);
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsTokenRefresh(false);
    }
    
    setIsLoading(false);
  }, [navigate]);

  useEffect(() => {
    console.log('Setting up auth state listener');
    
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth state');
        setIsLoading(true);
        
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error.message);
        } else {
          setSession(data.session);
          setUser(data.session?.user ?? null);
        }
        
        setIsInitializing(false);
        setIsLoading(false);
      } catch (err) {
        console.error('Unexpected error during auth initialization:', err);
        setIsInitializing(false);
        setIsLoading(false);
      }
    };
    
    initializeAuth();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthChange);
    
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [handleAuthChange]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    const result = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    return { error: result.error };
  };

  const signUp = async (email: string, password: string) => {
    setIsLoading(true);
    const result = await supabase.auth.signUp({ email, password });
    setIsLoading(false);
    return { error: result.error, data: result.data };
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error signing out. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setIsLoading(true);
    const result = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setIsLoading(false);
    return { error: result.error };
  };

  const signInWithGoogle = () => {
    console.log("Google sign-in not implemented");
    toast.error("Google sign-in is not yet implemented");
  };

  const value = {
    user,
    session,
    isLoading,
    isInitializing,
    isTokenRefresh,
    loading: isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    signInWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
