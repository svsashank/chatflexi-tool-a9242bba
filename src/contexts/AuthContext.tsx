
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useChatStore } from '@/store';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Global flag to track auth initialization across the app
const AUTH_INITIALIZED_KEY = 'auth_listener_initialized';
// Global flag to track when toast was last shown
const LAST_SIGNIN_TOAST_KEY = 'last_signin_toast';
// Time window in milliseconds to prevent duplicate toasts (5 minutes)
const TOAST_THROTTLE_MS = 5 * 60 * 1000;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { createConversation, loadConversationsFromDB, clearConversations } = useChatStore();

  // Use a ref to track if conversations have been loaded for this session
  const conversationsLoadedRef = React.useRef(false);

  // Load conversations safely without causing additional auth calls
  const safeLoadConversations = React.useCallback(async () => {
    if (conversationsLoadedRef.current) {
      console.log("Conversations already loaded for this session, skipping");
      return;
    }

    try {
      console.log("Auth context: Loading conversations");
      await loadConversationsFromDB();
      
      // Get current state after loading
      const { conversations } = useChatStore.getState();
      if (conversations.length === 0) {
        console.log("No conversations found, creating a new one");
        await createConversation();
      }
      
      conversationsLoadedRef.current = true;
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  }, [loadConversationsFromDB, createConversation]);

  // Function to check if we should show signin toast
  const shouldShowSignInToast = () => {
    const lastToastTime = localStorage.getItem(LAST_SIGNIN_TOAST_KEY);
    
    if (!lastToastTime) return true;
    
    const now = Date.now();
    const timeSinceLastToast = now - parseInt(lastToastTime);
    return timeSinceLastToast > TOAST_THROTTLE_MS;
  };

  useEffect(() => {
    // Fix: Store the proper subscription object
    let authSubscription: { subscription: any } | null = null;
    let isInitializing = !sessionStorage.getItem(AUTH_INITIALIZED_KEY);

    const initializeAuth = async () => {
      try {
        console.log("Initializing auth context");

        // Set up auth state listener FIRST
        const { data } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log("Auth state change event:", event, !!newSession);
            
            // Update internal state
            setSession(newSession);
            setUser(newSession?.user ?? null);
            
            if (event === 'SIGNED_IN' && newSession) {
              // Only show sign-in toast if this isn't the initial session retrieval
              // AND if we haven't shown a toast recently
              if (!isInitializing && shouldShowSignInToast()) {
                toast({
                  title: "Signed in successfully",
                  description: `Welcome${newSession.user?.user_metadata?.name ? `, ${newSession.user.user_metadata.name}` : ''}!`,
                });
                
                // Update last toast time
                localStorage.setItem(LAST_SIGNIN_TOAST_KEY, Date.now().toString());
              }
              
              // Safely load conversations using setTimeout to avoid Supabase deadlocks
              setTimeout(() => safeLoadConversations(), 0);
            }
            
            if (event === 'SIGNED_OUT') {
              toast({
                title: "Signed out successfully",
                description: "Come back soon!",
              });
              
              // Reset the conversations state and create a new local conversation when signing out
              conversationsLoadedRef.current = false;
              setTimeout(() => {
                clearConversations();
                createConversation();
              }, 0);
            }

            isInitializing = false;
          }
        );
        
        // Store the subscription correctly
        authSubscription = { subscription: data.subscription };

        // THEN check for existing session, but only once
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        if (initialSession?.user) {
          // Safely load conversations using setTimeout to avoid Supabase deadlocks
          setTimeout(() => safeLoadConversations(), 0);
        }

        setLoading(false);
        
        // Mark as initialized to avoid duplicate listeners on refresh
        sessionStorage.setItem(AUTH_INITIALIZED_KEY, 'true');
        
      } catch (error) {
        console.error("Error initializing auth:", error);
        setLoading(false);
      }
    };

    // Only initialize auth if it hasn't been initialized yet
    if (!sessionStorage.getItem(AUTH_INITIALIZED_KEY)) {
      initializeAuth();
    } else {
      // Just get the current session without setting up a new listener
      supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        setLoading(false);
        
        if (existingSession?.user && !conversationsLoadedRef.current) {
          setTimeout(() => safeLoadConversations(), 0);
        }
      });
    }

    // Cleanup function
    return () => {
      // Only unsubscribe if we created a subscription in this instance
      if (authSubscription?.subscription) {
        authSubscription.subscription.unsubscribe();
      }
    };
  }, [toast, safeLoadConversations, clearConversations, createConversation]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "An error occurred during sign in",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
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
  };

  const signOut = async () => {
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
  };

  const signInWithGoogle = async () => {
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
  };

  return (
    <AuthContext.Provider
      value={{ user, session, signIn, signUp, signOut, signInWithGoogle, loading }}
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
