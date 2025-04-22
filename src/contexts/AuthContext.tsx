
import React, { createContext, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuthInitialization } from '@/hooks/useAuthInitialization';
import { toast } from 'sonner';

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
  const [isTokenRefresh, setIsTokenRefresh] = React.useState(false);
  const { toast: uiToast } = useToast();
  // Track sign-in attempts to prevent duplicates
  const signInAttemptRef = React.useRef(false);

  // Track token refresh events
  React.useEffect(() => {
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

  const signIn = React.useCallback(async (email: string, password: string) => {
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
      console.error("Sign in error:", error);
      toast.error(error.message || "Failed to sign in");
      throw error;
    } finally {
      // Reset after a delay to prevent accidental double-clicks but allow retries
      setTimeout(() => {
        signInAttemptRef.current = false;
      }, 2000);
    }
  }, []);

  const signUp = React.useCallback(async (email: string, password: string, name: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      
      if (error) throw error;
      
      uiToast({
        title: "Sign up successful",
        description: "Please check your email to confirm your account",
      });
    } catch (error: any) {
      uiToast({
        title: "Sign up failed",
        description: error.message || "An error occurred during sign up",
        variant: "destructive",
      });
      throw error;
    }
  }, [uiToast]);

  const signOut = React.useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = '/auth';
    } catch (error: any) {
      uiToast({
        title: "Sign out failed",
        description: error.message || "An error occurred during sign out",
        variant: "destructive",
      });
      throw error;
    }
  }, [uiToast]);

  const signInWithGoogle = React.useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      uiToast({
        title: "Google sign in failed",
        description: error.message || "An error occurred during Google sign in",
        variant: "destructive",
      });
      throw error;
    }
  }, [uiToast]);

  const value = {
    user, 
    session, 
    signIn, 
    signUp, 
    signOut, 
    signInWithGoogle, 
    loading,
    isTokenRefresh
  };

  return (
    <AuthContext.Provider value={value}>
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
