
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { createConversation, loadUserConversations, resetConversations } = useChatStore();
  
  // Use refs to track initialization state
  const isInitialized = useRef(false);
  const authListenerInitialized = useRef(false);
  const conversationsInitialized = useRef(false);

  // Set up auth state change listener
  useEffect(() => {
    console.log("AuthProvider: Setting up auth state listener");
    
    if (authListenerInitialized.current) return;
    authListenerInitialized.current = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log(`AuthProvider: Auth state change [${event}]`, 
          newSession ? "Session present" : "No session");
        
        // Update the session and user state
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (event === 'SIGNED_IN' && newSession) {
          console.log("AuthProvider: User signed in, showing toast");
          toast({
            title: "Signed in successfully",
            description: `Welcome${newSession.user?.user_metadata?.name ? `, ${newSession.user.user_metadata.name}` : ''}!`,
          });
          
          // Defer Supabase calls to avoid auth deadlocks
          setTimeout(async () => {
            try {
              console.log("AuthProvider: Loading conversations after sign in");
              await loadUserConversations();
              conversationsInitialized.current = true;
              
              const { conversations } = useChatStore.getState();
              if (conversations.length === 0) {
                console.log("AuthProvider: No conversations found, creating a new one");
                await createConversation();
              }
            } catch (error) {
              console.error("Error loading conversations after sign in:", error);
            }
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          console.log("AuthProvider: User signed out, showing toast");
          toast({
            title: "Signed out successfully",
            description: "Come back soon!",
          });
          
          // Reset conversations on sign out
          setTimeout(() => {
            console.log("AuthProvider: Resetting conversations after sign out");
            resetConversations();
            createConversation();
            conversationsInitialized.current = false;
          }, 0);
        }
        
        // Mark loading as complete
        if (loading) {
          console.log("AuthProvider: Auth state change complete, setting loading to false");
          setLoading(false);
        }
      }
    );

    // Get initial session
    const checkInitialSession = async () => {
      if (isInitialized.current) return;
      isInitialized.current = true;
      
      try {
        console.log("AuthProvider: Checking for initial session");
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("AuthProvider: Error getting initial session:", error);
          setLoading(false);
          return;
        }
        
        console.log("AuthProvider: Initial session check:", 
          initialSession ? "Session found" : "No session found");
        
        // Set session and user state
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        // Initialize conversations based on session state
        if (initialSession?.user) {
          console.log("AuthProvider: User has session, initializing conversations");
          setTimeout(async () => {
            try {
              await loadUserConversations();
              conversationsInitialized.current = true;
              
              const { conversations } = useChatStore.getState();
              if (conversations.length === 0) {
                console.log("AuthProvider: No conversations found, creating a new one");
                await createConversation();
              }
            } catch (error) {
              console.error("Error initializing conversations:", error);
            }
          }, 0);
        } else {
          console.log("AuthProvider: No session, creating local conversation");
          setTimeout(() => {
            createConversation();
          }, 0);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("AuthProvider: Unexpected error during initial session check:", err);
        setLoading(false);
      }
    };
    
    // Check initial session
    checkInitialSession();

    // Clean up on unmount
    return () => {
      console.log("AuthProvider: Cleaning up auth subscription");
      subscription.unsubscribe();
      authListenerInitialized.current = false;
      isInitialized.current = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log("AuthProvider: Attempting to sign in with email/password");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      console.error("AuthProvider: Sign in failed:", error);
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
      console.log("AuthProvider: Attempting to sign up");
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
      console.error("AuthProvider: Sign up failed:", error);
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
      console.log("AuthProvider: Attempting to sign out");
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      console.error("AuthProvider: Sign out failed:", error);
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
      console.log("AuthProvider: Attempting to sign in with Google");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("AuthProvider: Google sign in failed:", error);
      toast({
        title: "Google sign in failed",
        description: error.message || "An error occurred during Google sign in",
        variant: "destructive",
      });
      throw error;
    }
  };

  // For debugging purposes
  useEffect(() => {
    console.log("AuthProvider: Current auth state:", { user, session, loading });
  }, [user, session, loading]);

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
