
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useChatStore } from '@/store';
import { useAuthInitialization } from '@/hooks/useAuthInitialization';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  loading: boolean;
  isTokenRefresh: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session, loading } = useAuthInitialization();
  const [isTokenRefresh, setIsTokenRefresh] = useState(false);
  const { toast } = useToast();
  // Track sign-in attempts to prevent duplicates
  const signInAttemptRef = React.useRef(false);

  // Track token refresh events
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Auth token refreshed - not creating a new conversation');
        setIsTokenRefresh(true);
      } else if (event !== 'INITIAL_SESSION') {
        // Reset token refresh flag for other auth events
        setIsTokenRefresh(false);
      }
    });
    
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  // Login function with duplicate prevention
  const signIn = useCallback(async (email: string, password: string) => {
    // Prevent duplicate sign-in attempts
    if (signInAttemptRef.current) {
      console.log("Sign in already in progress, ignoring duplicate request");
      return;
    }

    signInAttemptRef.current = true;

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Success handled by auth state listener
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "An error occurred during sign in",
        variant: "destructive",
      });
      throw error;
    } finally {
      // Reset after 2 seconds to prevent accidental double-clicks but allow retries
      setTimeout(() => {
        signInAttemptRef.current = false;
      }, 2000);
    }
  }, [toast]);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      if (error) throw error;
      toast({
        title: "Sign up successful",
        description: "Please check your email to confirm your account",
      });
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message || "An error occurred during sign up",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message || "An error occurred during sign out",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const signInWithGoogle = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Google sign in failed",
        description: error.message || "An error occurred during Google sign in",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  return (
    <AuthContext.Provider
      value={{ 
        user, 
        session, 
        signIn, 
        signUp, 
        signOut, 
        signInWithGoogle, 
        loading,
        isTokenRefresh 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
