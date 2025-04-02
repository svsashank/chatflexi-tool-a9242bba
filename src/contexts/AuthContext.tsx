
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
  
  // Use refs to track initialization and prevent duplicate operations
  const conversationsInitialized = useRef(false);
  const authListenerInitialized = useRef(false);

  useEffect(() => {
    // Only set up auth state listener once
    if (authListenerInitialized.current) return;
    
    console.log("Auth provider initializing auth listener");
    authListenerInitialized.current = true;
    
    // Set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log("Auth state change event:", event, "Session:", newSession ? "present" : "null");
        
        // Synchronously update the session and user state
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (event === 'SIGNED_IN' && newSession) {
          toast({
            title: "Signed in successfully",
            description: `Welcome${newSession.user?.user_metadata?.name ? `, ${newSession.user.user_metadata.name}` : ''}!`,
          });
          
          // Defer any Supabase calls to avoid auth deadlocks
          setTimeout(async () => {
            try {
              if (!conversationsInitialized.current) {
                console.log("Auth context: Loading conversations after sign in");
                await loadUserConversations();
                
                const { conversations } = useChatStore.getState();
                if (conversations.length === 0) {
                  console.log("No conversations found after login, creating a new one");
                  await createConversation();
                }
                conversationsInitialized.current = true;
              }
            } catch (error) {
              console.error("Error loading conversations after sign in:", error);
            }
          }, 0);
        }
        
        if (event === 'SIGNED_OUT') {
          toast({
            title: "Signed out successfully",
            description: "Come back soon!",
          });
          
          // Reset conversations on sign out
          setTimeout(() => {
            console.log("Resetting conversations after sign out");
            resetConversations();
            createConversation();
            conversationsInitialized.current = false;
          }, 0);
        }
        
        // Set loading to false regardless of the event type
        setLoading(false);
      }
    );

    // Get initial session
    const checkInitialSession = async () => {
      try {
        console.log("Checking for initial session");
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting initial session:", error);
          setLoading(false);
          return;
        }
        
        console.log("Initial session check:", initialSession ? "Found session" : "No session");
        
        // Only update states if needed (avoid unnecessary re-renders)
        if (initialSession !== session) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
        }
        
        // If we have a session, initialize conversations
        if (initialSession?.user && !conversationsInitialized.current) {
          console.log("Initializing conversations from existing session");
          try {
            await loadUserConversations();
            
            const { conversations } = useChatStore.getState();
            if (conversations.length === 0) {
              console.log("No conversations found for existing session, creating a new one");
              await createConversation();
            }
            conversationsInitialized.current = true;
          } catch (error) {
            console.error("Error initializing conversations from existing session:", error);
          }
        } else if (!initialSession && !conversationsInitialized.current) {
          console.log("No session, creating local conversation");
          createConversation();
          conversationsInitialized.current = true;
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Unexpected error during initial session check:", err);
        setLoading(false);
      }
    };
    
    checkInitialSession();

    return () => {
      console.log("Cleaning up auth subscription");
      subscription.unsubscribe();
      authListenerInitialized.current = false;
    };
  }, []);

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
