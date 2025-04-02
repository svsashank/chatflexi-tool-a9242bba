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
  
  const conversationsInitialized = useRef(false);

  useEffect(() => {
    console.log("Auth provider initializing");
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("Auth state change event:", event);
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (event === 'SIGNED_IN' && newSession) {
          toast({
            title: "Signed in successfully",
            description: `Welcome${newSession.user?.user_metadata?.name ? `, ${newSession.user.user_metadata.name}` : ''}!`,
          });
          
          if (!conversationsInitialized.current) {
            console.log("Setting timeout to initialize conversations after sign in");
            setTimeout(async () => {
              try {
                console.log("Auth context: Loading conversations after sign in");
                await loadUserConversations();
                
                const { conversations } = useChatStore.getState();
                if (conversations.length === 0) {
                  console.log("No conversations found after login, creating a new one");
                  await createConversation();
                }
                conversationsInitialized.current = true;
              } catch (error) {
                console.error("Error loading conversations after sign in:", error);
              }
            }, 0);
          }
        }
        
        if (event === 'SIGNED_OUT') {
          toast({
            title: "Signed out successfully",
            description: "Come back soon!",
          });
          
          setTimeout(() => {
            console.log("Resetting conversations after sign out");
            resetConversations();
            createConversation();
            conversationsInitialized.current = false;
          }, 0);
        }
      }
    );

    const checkExistingSession = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        console.log("Existing session check:", existingSession ? "Found session" : "No session");
        
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        
        if (existingSession?.user && !conversationsInitialized.current) {
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
        } else if (!existingSession && !conversationsInitialized.current) {
          console.log("No session, creating local conversation");
          createConversation();
          conversationsInitialized.current = true;
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error checking existing session:", error);
        setLoading(false);
      }
    };
    
    checkExistingSession();

    return () => {
      console.log("Cleaning up auth subscription");
      subscription.unsubscribe();
    };
  }, [toast, loadUserConversations, createConversation, resetConversations]);

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
